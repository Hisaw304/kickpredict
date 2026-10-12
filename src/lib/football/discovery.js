import { getMatches } from "./service.js";
import { normalizeFixture } from "./normalise.js";
import { supabaseServer } from "../supabaseServer.js";

// Historical results are stable enough to cache temporarily.
// This cache is per running serverless instance, not permanent storage.
const HISTORY_CACHE_TTL = 12 * 60 * 60 * 1000;
const HISTORY_CACHE_MAX_ENTRIES = 100;

const historyCache = new Map();
const historyRequestsInFlight = new Map();

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateInput(date) {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }

  return formatDate(date);
}

function startOfDay(date) {
  return new Date(`${formatDateInput(date)}T00:00:00.000Z`);
}

function endOfDay(date) {
  return new Date(`${formatDateInput(date)}T23:59:59.999Z`);
}

function isValidDateInput(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return Number.isFinite(parsed.getTime()) && formatDate(parsed) === date;
}

function isUpcomingFixture(fixture) {
  const timestamp = new Date(fixture.utcDate).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp > Date.now() &&
    ["SCHEDULED", "TIMED"].includes(fixture.status)
  );
}

function isWithinRequestedDates(fixture, dateFrom, dateTo) {
  const timestamp = new Date(fixture.utcDate).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return (
    timestamp >= startOfDay(dateFrom).getTime() &&
    timestamp <= endOfDay(dateTo).getTime()
  );
}

function uniqueById(items) {
  return Array.from(
    new Map(items.map((item) => [String(item.id), item])).values()
  );
}

async function fetchMatchRange(dateFrom, dateTo, status) {
  const data = await getMatches({
    dateFrom,
    dateTo,
    ...(status ? { status } : {}),
    limit: 500,
  });

  return Array.isArray(data?.matches) ? data.matches : [];
}

function getWidenedRange(dateFrom, dateTo) {
  const start = startOfDay(dateFrom);
  const end = startOfDay(dateTo);

  start.setUTCDate(start.getUTCDate() - 1);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    dateFrom: formatDate(start),
    dateTo: formatDate(end),
  };
}

export async function discoverFixtures({ dateFrom, dateTo } = {}) {
  const requestedFrom = formatDateInput(dateFrom ?? formatDate(new Date()));

  const requestedTo = formatDateInput(dateTo ?? requestedFrom);

  if (
    !isValidDateInput(requestedFrom) ||
    !isValidDateInput(requestedTo) ||
    requestedFrom > requestedTo
  ) {
    throw new Error("Invalid fixture date range.");
  }

  console.log("DISCOVER FIXTURES:", {
    requestedFrom,
    requestedTo,
  });

  let rawMatches = [];

  try {
    rawMatches = await fetchMatchRange(requestedFrom, requestedTo);
  } catch (error) {
    // Do not immediately retry a rate-limit response.
    if (error.response?.status === 429) {
      console.error("FIXTURE API RATE LIMITED:", {
        requestedFrom,
        requestedTo,
      });

      throw error;
    }

    console.error("EXACT-DATE FIXTURE REQUEST FAILED:", {
      requestedFrom,
      requestedTo,
      message: error.message,
      code: error.code,
      status: error.response?.status,
    });

    const widened = getWidenedRange(requestedFrom, requestedTo);

    console.log("RETRYING WIDER FIXTURE RANGE:", widened);

    rawMatches = await fetchMatchRange(widened.dateFrom, widened.dateTo);
  }

  if (rawMatches.length === 0) {
    const widened = getWidenedRange(requestedFrom, requestedTo);

    console.log("EMPTY RESPONSE; RETRYING WIDER RANGE:", widened);

    rawMatches = await fetchMatchRange(widened.dateFrom, widened.dateTo);
  }

  const normalized = uniqueById(
    rawMatches.map(normalizeFixture).filter(Boolean)
  );

  // Wider API queries never widen the actual candidate list.
  const requestedDateFixtures = normalized
    .filter((fixture) =>
      isWithinRequestedDates(fixture, requestedFrom, requestedTo)
    )
    .filter(isUpcomingFixture)
    .sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );

  console.log("FIXTURES BY UTC DATE:", {
    requestedFrom,
    requestedTo,
    providerMatches: normalized.length,
    eligibleRequestedDateFixtures: requestedDateFixtures.length,
  });

  return requestedDateFixtures;
}

/**
 * Cache successful historical chunks.
 * Chunk boundaries are anchored to a fixed UTC calendar epoch so
 * overlapping 90-day requests can reuse most previously fetched chunks.
 */
function getHistoricalChunkRanges(start, end) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const CHUNK_DAYS = 10;

  const epoch = Date.UTC(1970, 0, 1);
  const firstBlock = Math.floor(
    (Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) -
      epoch) /
      (CHUNK_DAYS * DAY_MS)
  );

  const lastBlock = Math.floor(
    (Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
      epoch) /
      (CHUNK_DAYS * DAY_MS)
  );

  const ranges = [];

  for (let block = firstBlock; block <= lastBlock; block += 1) {
    const blockStart = new Date(epoch + block * CHUNK_DAYS * DAY_MS);

    const blockEnd = new Date(blockStart.getTime() + (CHUNK_DAYS - 1) * DAY_MS);

    ranges.push({
      dateFrom: formatDate(blockStart),
      dateTo: formatDate(blockEnd),
    });
  }

  return ranges;
}

function readHistoryCache(key) {
  const entry = historyCache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    historyCache.delete(key);
    return null;
  }

  // Refresh insertion order for simple least-recently-used eviction.
  historyCache.delete(key);
  historyCache.set(key, entry);

  return entry.matches;
}

function writeHistoryCache(key, matches) {
  historyCache.delete(key);

  historyCache.set(key, {
    matches,
    expiresAt: Date.now() + HISTORY_CACHE_TTL,
  });

  while (historyCache.size > HISTORY_CACHE_MAX_ENTRIES) {
    const oldestKey = historyCache.keys().next().value;
    historyCache.delete(oldestKey);
  }
}

async function fetchHistoricalChunk(dateFrom, dateTo) {
  const key = `${dateFrom}:${dateTo}:FINISHED`;

  // 1. Check the existing in-memory cache first.
  const memoryCached = readHistoryCache(key);

  if (memoryCached !== null) {
    console.log("HISTORY MEMORY CACHE HIT:", {
      dateFrom,
      dateTo,
      count: memoryCached.length,
    });

    return memoryCached;
  }

  // 2. Deduplicate concurrent requests in this serverless instance.
  if (historyRequestsInFlight.has(key)) {
    return historyRequestsInFlight.get(key);
  }

  const request = (async () => {
    console.log("HISTORY CACHE LOOKUP:", {
      dateFrom,
      dateTo,
      key,
    });

    // 3. Check persistent Supabase cache.
    const cacheCutoff = new Date(Date.now() - HISTORY_CACHE_TTL).toISOString();

    const { data: cachedRow, error: cacheReadError } = await supabaseServer
      .from("football_history_cache")
      .select("matches, cached_at")
      .eq("cache_key", key)
      .gte("cached_at", cacheCutoff)
      .maybeSingle();

    if (cacheReadError) {
      // Do not confuse a cache read failure with an empty history result.
      // Continue to the provider, but make the problem visible in logs.
      console.error("SUPABASE HISTORY CACHE READ FAILED:", {
        dateFrom,
        dateTo,
        message: cacheReadError.message,
      });
    } else if (cachedRow) {
      const cachedMatches = Array.isArray(cachedRow.matches)
        ? uniqueById(
            cachedRow.matches.filter((match) => match?.status === "FINISHED")
          )
        : [];

      writeHistoryCache(key, cachedMatches);

      console.log("HISTORY SUPABASE CACHE HIT:", {
        dateFrom,
        dateTo,
        count: cachedMatches.length,
        cachedAt: cachedRow.cached_at,
      });

      return cachedMatches;
    }

    // 4. Cache miss: fetch from Football-Data.org.
    console.log("HISTORY PROVIDER REQUEST:", {
      dateFrom,
      dateTo,
    });

    let completed;

    try {
      const matches = await fetchMatchRange(dateFrom, dateTo, "FINISHED");

      completed = uniqueById(
        matches.filter((match) => match.status === "FINISHED")
      );
    } catch (error) {
      console.error("HISTORY CHUNK FAILED:", {
        dateFrom,
        dateTo,
        message: error.message,
        status: error.response?.status,
      });

      if (error.response?.status === 429) {
        console.error(
          "Football-Data.org rate limit reached. " +
            "The failed chunk will not be cached."
        );
      }

      throw error;
    }

    // 5. Cache successful provider responses in memory immediately.
    writeHistoryCache(key, completed);

    console.log("HISTORY CHUNK RESPONSE:", {
      dateFrom,
      dateTo,
      count: completed.length,
    });

    // 6. Persist the successful result for future serverless requests.
    const { error: cacheWriteError } = await supabaseServer
      .from("football_history_cache")
      .upsert(
        {
          cache_key: key,
          date_from: dateFrom,
          date_to: dateTo,
          match_status: "FINISHED",
          matches: completed,
          cached_at: new Date().toISOString(),
        },
        {
          onConflict: "cache_key",
        }
      );

    if (cacheWriteError) {
      // The successful API result remains available in memory.
      // Report the write error so it can be fixed instead of
      // silently assuming persistent caching is working.
      console.error("SUPABASE HISTORY CACHE WRITE FAILED:", {
        dateFrom,
        dateTo,
        message: cacheWriteError.message,
      });
    } else {
      console.log("HISTORY SUPABASE CACHE SAVED:", {
        dateFrom,
        dateTo,
        count: completed.length,
      });
    }

    return completed;
  })();

  historyRequestsInFlight.set(key, request);

  try {
    return await request;
  } finally {
    historyRequestsInFlight.delete(key);
  }
}

export async function discoverHistoricalMatches({
  dateTo,
  historyDays = 90,
} = {}) {
  if (!Number.isInteger(historyDays) || historyDays < 1 || historyDays > 365) {
    throw new Error("historyDays must be an integer between 1 and 365.");
  }

  const end = endOfDay(dateTo ?? formatDate(new Date()));

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - historyDays);

  const ranges = getHistoricalChunkRanges(start, end);
  const allMatches = [];

  console.log("DISCOVER HISTORICAL MATCHES:", {
    dateFrom: formatDate(start),
    dateTo: formatDate(end),
    historyDays,
    chunks: ranges.length,
    mode: "sequential",
  });

  // Process one chunk at a time. If a request is rate-limited,
  // stop rather than flooding the API with more requests.
  for (const range of ranges) {
    const matches = await fetchHistoricalChunk(range.dateFrom, range.dateTo);

    allMatches.push(...matches);
  }

  const startTime = start.getTime();
  const endTime = end.getTime();

  const relevantMatches = uniqueById(allMatches)
    .filter((match) => {
      const timestamp = new Date(match.utcDate).getTime();

      return (
        Number.isFinite(timestamp) &&
        timestamp >= startTime &&
        timestamp <= endTime &&
        match.status === "FINISHED"
      );
    })
    .sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );

  console.log("HISTORY COMPLETE:", {
    requestedDays: historyDays,
    chunksRequested: ranges.length,
    uniqueMatches: relevantMatches.length,
    cacheEntries: historyCache.size,
  });

  return relevantMatches;
}
