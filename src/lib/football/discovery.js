import { getFixtures, getMatches } from "./service.js";
import { normalizeFixture } from "./normalise.js";

const FIXTURE_CACHE_TTL = 10 * 60 * 1000;
const HISTORY_CACHE_TTL = 6 * 60 * 60 * 1000;
const EMPTY_CACHE_TTL = 60 * 1000;

// Keep this list explicit to avoid a /competitions request on every search.
// These are the competitions previously used by your discovery pipeline.
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

function isRateLimited(error) {
  return error?.response?.status === 429;
}

function logApiError(label, error, key) {
  console.error(`${label} FAILED:`, {
    key,
    status: error?.response?.status || null,
    response: error?.response?.data || null,
    retryAfter: error?.response?.headers?.["retry-after"] || null,
    message: error?.message || "Unknown error",
  });
}

function getCache(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt > Date.now()) {
    return { ...entry, stale: false };
  }

  // Retain expired values for use if the provider is unavailable.
  return { ...entry, stale: true };
}

function saveCache(cache, key, value, ttl) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
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
  return matches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
}

/*
 * ------------------------------------------------
 * FIXTURE DISCOVERY
 * ------------------------------------------------
 */

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
    console.log("FIXTURE REQUEST ALREADY IN PROGRESS:", key);
    return fixtureRequests.get(key);
  }

  const request = (async () => {
    const discovered = [];
    const errors = [];
    let rateLimited = false;

    try {
      // European domestic seasons normally start in the calendar year
      // of the season's first match. Pass the season explicitly to avoid
      // an additional competition lookup for each league.
      const season = Number(from.slice(0, 4));

      console.log("DISCOVER FIXTURES:", {
        dateFrom: from,
        dateTo: to,
        season,
        competitions: COMPETITIONS,
        strategy: "sequential competition-specific requests",
      });

      // Sequential requests reduce bursts against the provider's rate limit.
      for (const league of COMPETITIONS) {
        try {
          const data = await getFixtures({
            league,
            season,
            dateFrom: from,
            dateTo: to,
          });

          const matches = Array.isArray(data?.matches) ? data.matches : [];

          discovered.push(...matches);

          console.log("FIXTURE COMPETITION RESULT:", {
            league,
            count: matches.length,
          });
        } catch (error) {
          logApiError("FIXTURE COMPETITION", error, `${key}:${league}`);

          errors.push({
            league,
            status: error?.response?.status || null,
            message: error?.message || "Unknown error",
          });

          if (isRateLimited(error)) {
            rateLimited = true;
            console.warn(
              "FIXTURE DISCOVERY STOPPED: provider rate limit reached."
            );
            break;
          }
        }
      }

      const matches = sortByDate(
        deduplicateMatches(discovered)
          .map((match) => normalizeFixture(match))
          .filter(Boolean)
      );

      console.log("FIXTURE DISCOVERY SUMMARY:", {
        dateFrom: from,
        dateTo: to,
        rawMatches: discovered.length,
        normalizedMatches: matches.length,
        failedCompetitions: errors.length,
        rateLimited,
      });

      // Do not overwrite useful cached data with an empty result when
      // every request failed or the provider throttled the requests.
      if (matches.length > 0) {
        saveCache(fixtureCache, key, matches, FIXTURE_CACHE_TTL);
        return matches;
      }

      if (cached?.value?.length) {
        console.warn("USING STALE FIXTURE CACHE:", key);
        return cached.value;
      }

      if (rateLimited || errors.length === COMPETITIONS.length) {
        const error = new Error(
          "Fixture discovery failed because the football data provider is unavailable or rate-limited."
        );
        error.status = rateLimited ? 429 : 502;
        error.discoveryErrors = errors;
        throw error;
      }

      // An empty response from every successful endpoint is cached only
      // briefly because fixture data can change.
      saveCache(fixtureCache, key, [], EMPTY_CACHE_TTL);
      return [];
    } finally {
      fixtureRequests.delete(key);
    }
  })();

  fixtureRequests.set(key, request);
  return request;
}

/*
 * ------------------------------------------------
 * HISTORICAL MATCH DISCOVERY
 * ------------------------------------------------
 */

export async function discoverHistoricalMatches({
  dateTo,
  historyDays = 90,
  competitions = [],
} = {}) {
  const end = dateTo ? new Date(`${dateTo}T00:00:00.000Z`) : new Date();

  if (Number.isNaN(end.getTime())) {
    throw new Error(`Invalid historical dateTo: ${dateTo}`);
  }

  end.setUTCHours(0, 0, 0, 0);

  const until = formatDate(end);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - historyDays);

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
    console.log("HISTORY REQUEST ALREADY IN PROGRESS:", key);
    return historyRequests.get(key);
  }

  const request = (async () => {
    try {
      console.log("HISTORY REQUEST:", {
        dateFrom: from,
        dateTo: until,
        historyDays,
        competitions: codes,
      });

      const data = await getMatches({
        dateFrom: from,
        dateTo: until,
        status: "FINISHED",
        competitions: codes.length ? codes : undefined,
        limit: 500,
      });

      const rawMatches = Array.isArray(data?.matches) ? data.matches : [];

      const matches = sortByDate(
        deduplicateMatches(rawMatches).filter(
          (match) =>
            match.status === "FINISHED" &&
            Number.isFinite(match.score?.fullTime?.home) &&
            Number.isFinite(match.score?.fullTime?.away)
        )
      );

      console.log("HISTORICAL MATCH DISCOVERY SUMMARY:", {
        dateFrom: from,
        dateTo: until,
        competitions: codes,
        rawMatches: rawMatches.length,
        finishedMatches: matches.length,
      });

      saveCache(
        historyCache,
        key,
        matches,
        matches.length ? HISTORY_CACHE_TTL : EMPTY_CACHE_TTL
      );

      return matches;
    } catch (error) {
      logApiError("HISTORICAL MATCH DISCOVERY", error, key);

      if (cached?.value?.length) {
        console.warn("USING STALE HISTORICAL CACHE:", key);
        return cached.value;
      }

      throw error;
    } finally {
      historyRequests.delete(key);
    }
  })();

  historyRequests.set(key, request);
  return request;
}
