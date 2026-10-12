import footballClient from "./client.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map();
const pendingRequests = new Map();

function buildCacheKey(params) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
    )
  );
}
export async function getCompetition(league) {
  if (!league) {
    throw new Error("League is required");
  }

  const response = await footballClient.get(`/competitions/${league}`);

  return response.data;
}

/**
 * Get matches across all competitions available
 * to the current Football-Data API account.
 */
export async function getMatches({
  dateFrom,
  dateTo,
  status,
  competitions,
  limit = 500,
} = {}) {
  const params = {};

  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (status) params.status = status;

  if (competitions) {
    params.competitions = Array.isArray(competitions)
      ? competitions.join(",")
      : competitions;
  }

  if (limit) params.limit = limit;

  const key = buildCacheKey(params);
  const now = Date.now();
  const cached = responseCache.get(key);

  if (cached && cached.expiresAt > now) {
    console.log("FOOTBALL CACHE HIT:", { dateFrom, dateTo, status });
    return cached.data;
  }

  if (cached) responseCache.delete(key);

  if (pendingRequests.has(key)) {
    console.log("FOOTBALL REQUEST DEDUPLICATED:", { dateFrom, dateTo, status });
    return pendingRequests.get(key);
  }

  const request = footballClient
    .get("/matches", { params })
    .then(({ data }) => {
      responseCache.set(key, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      // Keep the in-memory cache bounded.
      if (responseCache.size > 200) {
        const oldestKey = responseCache.keys().next().value;
        if (oldestKey !== undefined) responseCache.delete(oldestKey);
      }

      return data;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);

  return request;
}

export async function getFixtures({ dateFrom, dateTo, league } = {}) {
  if (!league) {
    throw new Error("League is required");
  }

  const competition = await getCompetition(league);

  const seasonStart = competition?.currentSeason?.startDate;

  const season = seasonStart
    ? new Date(seasonStart).getUTCFullYear()
    : new Date().getUTCFullYear();

  const params = {
    season,
  };

  if (dateFrom) {
    params.dateFrom = dateFrom;
  }

  if (dateTo) {
    params.dateTo = dateTo;
  }

  const response = await footballClient.get(`/competitions/${league}/matches`, {
    params,
  });

  return response.data;
}

export async function getTeamMatches({
  teamId,
  dateFrom,
  dateTo,
  season,
  competitions,
  status,
  limit,
} = {}) {
  if (!teamId) {
    throw new Error("Team ID is required");
  }

  const params = {};

  if (dateFrom) {
    params.dateFrom = dateFrom;
  }

  if (dateTo) {
    params.dateTo = dateTo;
  }

  if (season) {
    params.season = season;
  }

  if (competitions) {
    params.competitions = Array.isArray(competitions)
      ? competitions.join(",")
      : competitions;
  }

  if (status) {
    params.status = status;
  }

  if (limit) {
    params.limit = limit;
  }

  const response = await footballClient.get(`/teams/${teamId}/matches`, {
    params,
  });

  return response.data;
}

export async function getStandings(league) {
  if (!league) {
    throw new Error("League is required");
  }

  const response = await footballClient.get(
    `/competitions/${league}/standings`
  );

  return response.data;
}
