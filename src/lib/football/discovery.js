import { getFixtures, getMatches } from "./service.js";
import { normalizeFixture } from "./normalise.js";

const FIXTURE_CACHE_TTL = 10 * 60 * 1000;
const HISTORY_CACHE_TTL = 6 * 60 * 60 * 1000;
const EMPTY_CACHE_TTL = 60 * 1000;
const MAX_HISTORY_CHUNK_DAYS = 10;

const COMPETITIONS = [
  "PL",
  "PD",
  "BL1",
  "SA",
  "FL1",
  "ELC",
  "DED",
  "PPL",
  "BSA",
];

const fixtureCache = new Map();
const fixtureRequests = new Map();

const historyCache = new Map();
const historyRequests = new Map();

// Each history window is cached independently.
const historyChunkCache = new Map();
const historyChunkRequests = new Map();

// Prevent additional provider calls while a 429 cooldown is active.
let providerRateLimitedUntil = 0;

/* =========================================
   GENERAL HELPERS
========================================= */

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeCompetitionCodes(competitions = []) {
  return [
    ...new Set(
      competitions
        .filter(Boolean)
        .map((code) => String(code).trim().toUpperCase())
    ),
  ].sort();
}

function extractMatches(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.matches)) return data.matches;
  return [];
}

function deduplicateMatches(matches) {
  return [
    ...new Map(
      matches
        .filter((match) => match?.id != null)
        .map((match) => [String(match.id), match])
    ).values(),
  ];
}

function sortByDate(matches) {
  return [...matches].sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
}

function getStatus(error) {
  return error?.response?.status || error?.status || null;
}

function isRateLimited(error) {
  return getStatus(error) === 429;
}

function getRetryDelayMs(error) {
  const retryAfter =
    error?.response?.headers?.["retry-after"] ??
    error?.response?.headers?.["Retry-After"];

  if (retryAfter != null) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const retryDate = new Date(retryAfter).getTime();

    if (Number.isFinite(retryDate)) {
      return Math.max(0, retryDate - Date.now());
    }
  }

  const message = error?.response?.data?.message || error?.message || "";

  const secondsMatch = message.match(/wait\s+(\d+)\s+seconds?/i);

  if (secondsMatch) {
    return Number(secondsMatch[1]) * 1000;
  }

  const minutesMatch = message.match(/wait\s+(\d+)\s+minutes?/i);

  if (minutesMatch) {
    return Number(minutesMatch[1]) * 60 * 1000;
  }

  // Conservative fallback if the provider does not supply a delay.
  return 30 * 1000;
}

function recordRateLimit(error) {
  const delay = getRetryDelayMs(error);

  providerRateLimitedUntil = Math.max(
    providerRateLimitedUntil,
    Date.now() + delay
  );

  console.warn("FOOTBALL API RATE LIMIT:", {
    retryInSeconds: Math.ceil((providerRateLimitedUntil - Date.now()) / 1000),
    message: error?.response?.data?.message || error?.message,
  });
}

function throwIfRateLimited() {
  const remaining = providerRateLimitedUntil - Date.now();

  if (remaining <= 0) return;

  const error = new Error(
    `Football data API is rate-limited. Retry in ${Math.ceil(
      remaining / 1000
    )} seconds.`
  );

  error.status = 429;
  error.retryAfterMs = remaining;
  throw error;
}

function logApiError(label, error, key) {
  console.error(`${label} FAILED:`, {
    key,
    status: getStatus(error),
    response: error?.response?.data || null,
    retryAfter: error?.response?.headers?.["retry-after"] || null,
    message: error?.message || "Unknown error",
  });
}

function getCache(cache, key) {
  const entry = cache.get(key);

  if (!entry) return null;

  return {
    ...entry,
    stale: entry.expiresAt <= Date.now(),
  };
}

function saveCache(cache, key, value, ttl) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

function getFinishedMatches(matches) {
  return sortByDate(
    deduplicateMatches(matches).filter(
      (match) =>
        match.status === "FINISHED" &&
        Number.isFinite(match.score?.fullTime?.home) &&
        Number.isFinite(match.score?.fullTime?.away)
    )
  );
}

/* =========================================
   FIXTURE DISCOVERY
========================================= */

export async function discoverFixtures({ dateFrom, dateTo } = {}) {
  const from = dateFrom || formatDate(new Date());
  const to = dateTo || from;
  const key = `${from}:${to}`;

  const cached = getCache(fixtureCache, key);

  if (cached && !cached.stale) {
    console.log("FIXTURE CACHE HIT:", {
      key,
      count: cached.value.length,
    });
    return cached.value;
  }

  if (fixtureRequests.has(key)) {
    return fixtureRequests.get(key);
  }

  const request = (async () => {
    try {
      const targetDate = new Date(`${from}T00:00:00.000Z`);

      if (Number.isNaN(targetDate.getTime())) {
        throw new Error(`Invalid fixture date: ${from}`);
      }

      // Football-Data.org uses the starting year of the football season.
      const year = targetDate.getUTCFullYear();
      const season = targetDate.getUTCMonth() >= 6 ? year : year - 1;

      const rawMatches = [];
      let failedCompetitions = 0;
      let rateLimitError = null;
      let lastError = null;

      console.log("DISCOVER FIXTURES (PER COMPETITION):", {
        dateFrom: from,
        dateTo: to,
        season,
        competitions: COMPETITIONS,
      });

      for (const league of COMPETITIONS) {
        try {
          throwIfRateLimited();

          const data = await getFixtures({
            league,
            season,
            dateFrom: from,
            dateTo: to,
          });

          const leagueMatches = extractMatches(data);
          rawMatches.push(...leagueMatches);

          console.log("FIXTURE COMPETITION RESULT:", {
            league,
            count: leagueMatches.length,
          });
        } catch (error) {
          failedCompetitions++;
          lastError = error;

          console.warn("FIXTURE COMPETITION FAILED:", {
            league,
            status: getStatus(error),
            message: error?.message,
          });

          if (isRateLimited(error)) {
            recordRateLimit(error);
            rateLimitError = error;
            break;
          }
        }
      }

      const matches = sortByDate(
        deduplicateMatches(rawMatches.map(normalizeFixture).filter(Boolean))
      );

      console.log("FIXTURE DISCOVERY SUMMARY:", {
        dateFrom: from,
        dateTo: to,
        rawMatches: rawMatches.length,
        normalizedMatches: matches.length,
        failedCompetitions,
        rateLimited: Boolean(rateLimitError),
      });

      if (matches.length > 0) {
        // Cache partial results briefly; complete results for longer.
        const ttl =
          failedCompetitions === 0 ? FIXTURE_CACHE_TTL : EMPTY_CACHE_TTL;

        saveCache(fixtureCache, key, matches, ttl);
        return matches;
      }

      // Never replace a useful stale result with an empty result.
      if (cached?.value?.length) {
        console.warn("USING STALE FIXTURE CACHE:", key);
        return cached.value;
      }

      if (rateLimitError) {
        throw rateLimitError;
      }

      if (lastError) {
        throw lastError;
      }

      // A successful response with no matches is a genuine empty result.
      saveCache(fixtureCache, key, [], EMPTY_CACHE_TTL);
      return [];
    } catch (error) {
      if (isRateLimited(error) && !providerRateLimitedUntil) {
        recordRateLimit(error);
      }

      logApiError("FIXTURE DISCOVERY", error, key);

      if (cached?.value?.length) {
        console.warn("USING STALE FIXTURE CACHE:", key);
        return cached.value;
      }

      throw error;
    } finally {
      fixtureRequests.delete(key);
    }
  })();

  fixtureRequests.set(key, request);
  return request;
}

/* =========================================
   HISTORICAL CHUNK CACHE
========================================= */

async function getHistoricalChunk({ dateFrom, dateTo, competitions }) {
  const competitionKey = competitions.join(",");
  const key = `${dateFrom}:${dateTo}:${competitionKey}`;

  const cached = getCache(historyChunkCache, key);

  if (cached && !cached.stale) {
    console.log("HISTORY CHUNK CACHE HIT:", {
      key,
      count: cached.value.length,
    });

    return cached.value;
  }

  if (historyChunkRequests.has(key)) {
    return historyChunkRequests.get(key);
  }

  const request = (async () => {
    try {
      throwIfRateLimited();

      console.log("HISTORY CHUNK REQUEST:", {
        dateFrom,
        dateTo,
        competitions,
      });

      const data = await getMatches({
        dateFrom,
        dateTo,
        status: "FINISHED",
        competitions: competitions.length ? competitions : undefined,
      });

      const matches = getFinishedMatches(extractMatches(data));

      // Cache each successful chunk immediately, even if a later
      // chunk fails during the same overall history request.
      saveCache(
        historyChunkCache,
        key,
        matches,
        matches.length ? HISTORY_CACHE_TTL : EMPTY_CACHE_TTL
      );

      console.log("HISTORY CHUNK RESULT:", {
        dateFrom,
        dateTo,
        count: matches.length,
        cached: true,
      });

      return matches;
    } catch (error) {
      if (isRateLimited(error)) {
        recordRateLimit(error);
      }

      logApiError("HISTORY CHUNK", error, key);

      // Finished historical scores rarely change. Reuse stale chunk
      // data if the provider is temporarily unavailable.
      if (cached?.value) {
        console.warn("USING STALE HISTORY CHUNK CACHE:", key);
        return cached.value;
      }

      throw error;
    } finally {
      historyChunkRequests.delete(key);
    }
  })();

  historyChunkRequests.set(key, request);
  return request;
}

/* =========================================
   HISTORICAL MATCH DISCOVERY
========================================= */

async function fetchHistoricalMatchesInChunks({
  dateFrom,
  dateTo,
  competitions,
}) {
  const allMatches = [];
  const seenIds = new Set();

  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    throw new Error(`Invalid historical date range: ${dateFrom} to ${dateTo}`);
  }

  let cursor = new Date(start);

  while (cursor <= end) {
    const chunkStart = new Date(cursor);
    const chunkEnd = new Date(cursor);

    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + MAX_HISTORY_CHUNK_DAYS - 1);

    if (chunkEnd > end) {
      chunkEnd.setTime(end.getTime());
    }

    const from = formatDate(chunkStart);
    const to = formatDate(chunkEnd);

    let chunkMatches;

    try {
      chunkMatches = await getHistoricalChunk({
        dateFrom: from,
        dateTo: to,
        competitions,
      });
    } catch (error) {
      if (isRateLimited(error) && allMatches.length > 0) {
        console.warn("USING PARTIAL HISTORICAL DATA:", {
          requestedFrom: dateFrom,
          requestedTo: dateTo,
          stoppedAt: from,
          collectedMatches: allMatches.length,
        });

        return {
          matches: allMatches,
          complete: false,
        };
      }

      throw error;
    }

    for (const match of chunkMatches) {
      if (match?.id == null) continue;

      const id = String(match.id);

      if (seenIds.has(id)) continue;

      seenIds.add(id);
      allMatches.push(match);
    }

    cursor = new Date(chunkEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    matches: allMatches,
    complete: true,
  };
}

export async function discoverHistoricalMatches({
  dateTo,
  historyDays = 90,
  competitions = [],
} = {}) {
  if (!Number.isFinite(historyDays) || historyDays < 1) {
    throw new Error(`Invalid historyDays: ${historyDays}`);
  }

  const end = dateTo ? new Date(`${dateTo}T00:00:00.000Z`) : new Date();

  if (Number.isNaN(end.getTime())) {
    throw new Error(`Invalid historical dateTo: ${dateTo}`);
  }

  end.setUTCHours(0, 0, 0, 0);

  const until = formatDate(end);
  const start = new Date(end);

  start.setUTCDate(start.getUTCDate() - Math.floor(historyDays));

  const from = formatDate(start);
  const codes = normalizeCompetitionCodes(competitions);
  const competitionKey = codes.join(",");
  const key = `${from}:${until}:${competitionKey}`;

  const cached = getCache(historyCache, key);

  if (cached && !cached.stale) {
    console.log("HISTORY CACHE HIT:", {
      key,
      matches: cached.value.length,
    });

    return cached.value;
  }

  if (historyRequests.has(key)) {
    return historyRequests.get(key);
  }

  const request = (async () => {
    try {
      console.log("HISTORY REQUEST:", {
        dateFrom: from,
        dateTo: until,
        historyDays,
        competitions: codes,
        strategy: "individually cached chunks of at most 10 days",
      });

      const historyResult = await fetchHistoricalMatchesInChunks({
        dateFrom: from,
        dateTo: until,
        competitions: codes,
      });

      const matches = getFinishedMatches(historyResult.matches);

      console.log("HISTORICAL MATCH DISCOVERY SUMMARY:", {
        dateFrom: from,
        dateTo: until,
        competitions: codes,
        finishedMatches: matches.length,
        complete: historyResult.complete,
      });

      console.log("HISTORICAL MATCH DISCOVERY SUMMARY:", {
        dateFrom: from,
        dateTo: until,
        competitions: codes,
        rawMatches: historyResult.matches.length,
        finishedMatches: matches.length,
        complete: historyResult.complete,
      });

      saveCache(
        historyCache,
        key,
        matches,
        historyResult.complete && matches.length
          ? HISTORY_CACHE_TTL
          : EMPTY_CACHE_TTL
      );

      return matches;
    } catch (error) {
      logApiError("HISTORICAL MATCH DISCOVERY", error, key);

      if (cached?.value?.length) {
        console.warn("USING STALE HISTORICAL CACHE:", key);
        return cached.value;
      }

      // Do not return [] here: that would hide the provider failure.
      // Successful chunks remain cached for the next attempt.
      throw error;
    } finally {
      historyRequests.delete(key);
    }
  })();

  historyRequests.set(key, request);
  return request;
}
