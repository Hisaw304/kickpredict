import { getMatches, getFixtures } from "./service.js";
import footballClient from "./client.js";
import { normalizeFixture } from "./normalise.js";

function startOfDay(date) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Discover competitions exposed by the current API key.
 * No hardcoded league list.
 */
async function discoverCompetitions() {
  const response = await footballClient.get("/competitions");

  const competitions = Array.isArray(response.data?.competitions)
    ? response.data.competitions
    : [];

  console.log("AVAILABLE COMPETITIONS:", {
    count: competitions.length,
    competitions: competitions.map(({ id, name, code, type }) => ({
      id,
      name,
      code,
      type,
    })),
  });

  return competitions.filter((competition) => competition.code);
}

/**
 * Discover fixtures across the competitions available to the API key.
 */

export async function discoverFixtures({ dateFrom, dateTo } = {}) {
  const from = dateFrom || new Date().toISOString().slice(0, 10);
  const to = dateTo || from;

  console.log("DISCOVER FIXTURES:", {
    dateFrom: from,
    dateTo: to,
  });

  const competitions = await discoverCompetitions();
  const allMatches = new Map();
  const failed = [];
  let rateLimited = false;

  for (const competition of competitions) {
    if (rateLimited) break;

    if (!competition.code || !competition.currentSeason?.startDate) {
      console.log("SKIPPING COMPETITION WITHOUT CODE OR CURRENT SEASON:", {
        code: competition.code,
        name: competition.name,
      });
      continue;
    }

    const season = new Date(
      competition.currentSeason.startDate
    ).getUTCFullYear();

    try {
      const response = await getFixtures({
        league: competition.code,
        season,
        dateFrom: from,
        dateTo: to,
      });

      const matches = Array.isArray(response?.matches) ? response.matches : [];

      console.log("COMPETITION FIXTURES RESULT:", {
        code: competition.code,
        name: competition.name,
        season,
        count: matches.length,
      });

      for (const match of matches) {
        if (match?.id == null) continue;

        allMatches.set(String(match.id), match);
      }
    } catch (error) {
      const status = error?.response?.status || null;

      const failure = {
        code: competition.code,
        status,
        message: error?.message || "Unknown error",
      };

      failed.push(failure);

      console.error("COMPETITION FIXTURES FAILED:", failure);

      if (status === 429) {
        rateLimited = true;
        break;
      }
    }
  }

  const normalized = [...allMatches.values()]
    .map(normalizeFixture)
    .filter(Boolean)
    .sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );

  console.log("FIXTURE DISCOVERY SUMMARY:", {
    requestedDateFrom: from,
    requestedDateTo: to,
    availableCompetitions: competitions.length,
    totalUniqueMatches: normalized.length,
    rateLimited,
    failed,
  });

  return normalized;
}
/**
 * Retrieve historical finished matches for team research.
 * Historical lookback remains separate from fixture discovery.
 */

export async function discoverHistoricalMatches({
  dateTo,
  historyDays = 90,
  competitions = [],
} = {}) {
  const end = dateTo ? startOfDay(dateTo) : startOfDay(new Date());

  // dateTo is exclusive in the Football-Data.org API.
  // Request up to, but not including, the specified date.
  const dateUntil = formatDate(end);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - historyDays);

  const dateFrom = formatDate(start);

  const competitionCodes = [
    ...new Set(
      competitions
        .filter(Boolean)
        .map((code) => String(code).trim().toUpperCase())
    ),
  ];

  console.log("HISTORY REQUEST:", {
    dateFrom,
    dateTo: dateUntil,
    historyDays,
    competitions: competitionCodes,
  });

  const data = await getMatches({
    dateFrom,
    dateTo: dateUntil,
    status: "FINISHED",
    competitions: competitionCodes.length ? competitionCodes : undefined,
    limit: 500,
  });

  const matches = Array.isArray(data?.matches) ? data.matches : [];

  console.log("HISTORICAL MATCH API RESPONSE:", {
    resultSet: data?.resultSet ?? null,
    matchCount: matches.length,
    sample: matches.slice(0, 3).map((match) => ({
      id: match.id,
      status: match.status,
      utcDate: match.utcDate,
      competition: match.competition?.code,
      homeTeamId: match.homeTeam?.id,
      awayTeamId: match.awayTeam?.id,
      homeScore: match.score?.fullTime?.home,
      awayScore: match.score?.fullTime?.away,
    })),
  });

  const uniqueMatches = [
    ...new Map(
      matches
        .filter((match) => match?.id != null)
        .map((match) => [String(match.id), match])
    ).values(),
  ]
    .filter(
      (match) =>
        match.status === "FINISHED" &&
        Number.isFinite(match.score?.fullTime?.home) &&
        Number.isFinite(match.score?.fullTime?.away)
    )
    .sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );

  console.log("HISTORY COMPLETE:", {
    requestedDays: historyDays,
    rawMatches: matches.length,
    uniqueFinishedMatches: uniqueMatches.length,
    dateFrom,
    dateTo: dateUntil,
    competitions: competitionCodes,
  });

  return uniqueMatches;
}
