import { getMatches, getTeamMatches } from "./service.js";
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

/*
 * ------------------------------------------------
 * UPCOMING FIXTURES
 * ------------------------------------------------
 *
 * One global request.
 *
 * Do NOT query every competition individually here.
 * That creates a huge number of API calls.
 */

export async function discoverFixtures({ dateFrom, dateTo } = {}) {
  const from = dateFrom ? startOfDay(dateFrom) : startOfDay(new Date());

  const to = dateTo ? endOfDay(dateTo) : endOfDay(from);

  const formattedFrom = formatDate(from);
  const formattedTo = formatDate(to);

  console.log("DISCOVER FIXTURES:", {
    dateFrom: formattedFrom,
    dateTo: formattedTo,
  });

  try {
    const data = await getMatches({
      dateFrom: formattedFrom,
      dateTo: formattedTo,
      limit: 500,
    });

    const matches = Array.isArray(data?.matches) ? data.matches : [];

    console.log("GLOBAL FIXTURE RESPONSE:", {
      count: matches.length,
      filters: data?.filters,
      resultSet: data?.resultSet,
    });

    const uniqueMatches = Array.from(
      new Map(matches.map((match) => [String(match.id), match])).values()
    );

    const normalized = uniqueMatches
      .map(normalizeFixture)
      .filter((fixture) => fixture?.id)
      .sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      );

    const competitionMap = new Map();

    for (const fixture of normalized) {
      const code = fixture.competition?.code;

      if (!code) {
        continue;
      }

      competitionMap.set(code, fixture.competition?.name || code);
    }

    console.log("DISCOVERED FIXTURES:", {
      count: normalized.length,

      competitions: Array.from(competitionMap.entries()).map(
        ([code, name]) => ({
          code,
          name,
        })
      ),
    });

    return normalized;
  } catch (error) {
    console.error("FIXTURE DISCOVERY FAILED:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    throw error;
  }
}

/*
 * ------------------------------------------------
 * TEAM HISTORY
 * ------------------------------------------------
 *
 * Instead of downloading 90 days of every match
 * in every competition, get history only for the
 * teams we actually need.
 */

export async function discoverHistoricalMatches({
  fixtures = [],
  dateTo,
  historyDays = 90,
} = {}) {
  const end = dateTo ? endOfDay(dateTo) : endOfDay(new Date());

  const start = new Date(end);

  start.setUTCDate(start.getUTCDate() - historyDays);

  const formattedFrom = formatDate(start);
  const formattedTo = formatDate(end);

  /*
   * Get unique team IDs from the fixtures we're
   * actually trying to predict.
   */

  const teamIds = Array.from(
    new Set(
      fixtures
        .flatMap((fixture) => [fixture.homeTeam?.id, fixture.awayTeam?.id])
        .filter(Boolean)
        .map(String)
    )
  );

  console.log("HISTORY TEAMS:", {
    count: teamIds.length,
    teams: teamIds,
    dateFrom: formattedFrom,
    dateTo: formattedTo,
  });

  if (!teamIds.length) {
    return [];
  }

  const allMatches = [];

  /*
   * Query each relevant team only.
   *
   * This is still several requests, but dramatically
   * fewer than downloading every competition's history.
   */

  for (const teamId of teamIds) {
    try {
      console.log("FETCHING TEAM HISTORY:", {
        teamId,
      });

      const data = await getTeamMatches({
        teamId,
        dateFrom: formattedFrom,
        dateTo: formattedTo,
        status: "FINISHED",
        limit: 100,
      });

      const matches = Array.isArray(data?.matches) ? data.matches : [];

      console.log("TEAM HISTORY RESPONSE:", {
        teamId,
        count: matches.length,
      });

      allMatches.push(...matches);
    } catch (error) {
      console.error("TEAM HISTORY FAILED:", {
        teamId,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      /*
       * If rate limited, stop immediately.
       */

      if (error.response?.status === 429) {
        throw error;
      }
    }
  }

  /*
   * Remove duplicate matches.
   */

  const uniqueMatches = Array.from(
    new Map(allMatches.map((match) => [String(match.id), match])).values()
  );

  uniqueMatches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );

  console.log("HISTORY COMPLETE:", {
    requestedDays: historyDays,
    teams: teamIds.length,
    rawMatches: allMatches.length,
    uniqueMatches: uniqueMatches.length,
  });

  return uniqueMatches;
}
