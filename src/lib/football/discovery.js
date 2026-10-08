import { getMatches } from "./service.js";
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
 * Discover every competition available to the current
 * Football-Data.org API account.
 */
async function discoverCompetitions() {
  const response = await footballClient.get("/competitions");

  const competitions = Array.isArray(response.data?.competitions)
    ? response.data.competitions
    : [];

  console.log("AVAILABLE COMPETITIONS:", {
    count: competitions.length,
    competitions: competitions.map((competition) => ({
      id: competition.id,
      name: competition.name,
      code: competition.code,
      type: competition.type,
    })),
  });

  return competitions;
}

/**
 * Query competitions individually instead of relying only
 * on the global /matches endpoint.
 *
 * This is important because the global endpoint may not
 * expose the complete fixture pool available to the account.
 */
async function discoverFixturesByCompetition({
  dateFrom,
  dateTo,
  competitions,
}) {
  const allMatches = [];

  for (const competition of competitions) {
    const code = competition?.code;

    if (!code) {
      continue;
    }

    try {
      console.log("CHECKING COMPETITION:", {
        code,
        name: competition.name,
        dateFrom,
        dateTo,
      });

      const data = await getMatches({
        dateFrom,
        dateTo,
        competitions: code,
        limit: 500,
      });

      const matches = Array.isArray(data?.matches) ? data.matches : [];

      console.log("COMPETITION RESPONSE:", {
        code,
        name: competition.name,
        count: matches.length,
      });

      allMatches.push(...matches);
    } catch (error) {
      console.error("COMPETITION DISCOVERY FAILED:", {
        code,
        name: competition.name,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      /*
       * One competition failing should not prevent us
       * from discovering the rest of the available fixtures.
       */
      if (error.response?.status === 429) {
        throw error;
      }
    }
  }

  return allMatches;
}

/**
 * Discover upcoming fixtures for the requested date range.
 *
 * Strategy:
 *
 * 1. Discover competitions available to the account.
 * 2. Query each competition individually.
 * 3. Also query the global endpoint as a fallback/source.
 * 4. Merge everything.
 * 5. Remove duplicate fixtures.
 * 6. Normalize and sort.
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
    /*
     * ----------------------------------------------------
     * 1. Discover competitions available to this account
     * ----------------------------------------------------
     */

    const competitions = await discoverCompetitions();

    console.log("COMPETITION DISCOVERY COMPLETE:", {
      count: competitions.length,
    });

    /*
     * ----------------------------------------------------
     * 2. Query each competition individually
     * ----------------------------------------------------
     */

    const competitionMatches = await discoverFixturesByCompetition({
      dateFrom: formattedFrom,
      dateTo: formattedTo,
      competitions,
    });

    /*
     * ----------------------------------------------------
     * 3. Also query the global endpoint
     *
     * Keep this because it can sometimes return fixtures
     * that individual competition requests expose differently.
     * ----------------------------------------------------
     */

    let globalMatches = [];

    try {
      const globalData = await getMatches({
        dateFrom: formattedFrom,
        dateTo: formattedTo,
        limit: 500,
      });

      globalMatches = Array.isArray(globalData?.matches)
        ? globalData.matches
        : [];

      console.log("GLOBAL MATCH RESPONSE:", {
        filters: globalData?.filters,
        resultSet: globalData?.resultSet,
        count: globalMatches.length,
      });
    } catch (error) {
      console.error("GLOBAL FIXTURE DISCOVERY FAILED:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 429) {
        throw error;
      }
    }

    /*
     * ----------------------------------------------------
     * 4. Merge all sources
     * ----------------------------------------------------
     */

    const combinedMatches = [...competitionMatches, ...globalMatches];

    console.log("COMBINED FIXTURE POOL:", {
      competitionMatches: competitionMatches.length,
      globalMatches: globalMatches.length,
      combined: combinedMatches.length,
    });

    /*
     * ----------------------------------------------------
     * 5. Remove duplicates
     * ----------------------------------------------------
     */

    const uniqueMatches = Array.from(
      new Map(
        combinedMatches.map((match) => [String(match.id), match])
      ).values()
    );

    /*
     * ----------------------------------------------------
     * 6. Normalize and sort
     * ----------------------------------------------------
     */

    const normalized = uniqueMatches
      .map(normalizeFixture)
      .filter((fixture) => fixture?.id || fixture?.fixtureId)
      .sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      );

    /*
     * ----------------------------------------------------
     * 7. Produce useful discovery diagnostics
     * ----------------------------------------------------
     */

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

/**
 * Discover historical finished matches.
 */
export async function discoverHistoricalMatches({
  dateTo,
  historyDays = 90,
} = {}) {
  const end = dateTo ? endOfDay(dateTo) : endOfDay(new Date());

  const start = new Date(end);

  start.setUTCDate(start.getUTCDate() - historyDays);

  const allMatches = [];

  let chunkStart = new Date(start);

  while (chunkStart < end) {
    const chunkEnd = new Date(chunkStart);

    /*
     * Football-Data.org allows a maximum
     * 10-day period.
     */
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + 9);

    if (chunkEnd > end) {
      chunkEnd.setTime(end.getTime());
    }

    const formattedFrom = formatDate(chunkStart);
    const formattedTo = formatDate(chunkEnd);

    console.log("HISTORY CHUNK:", {
      dateFrom: formattedFrom,
      dateTo: formattedTo,
    });

    try {
      const data = await getMatches({
        dateFrom: formattedFrom,
        dateTo: formattedTo,
        status: "FINISHED",
        limit: 500,
      });

      const matches = Array.isArray(data?.matches) ? data.matches : [];

      console.log("HISTORY CHUNK RESPONSE:", {
        dateFrom: formattedFrom,
        dateTo: formattedTo,
        count: matches.length,
      });

      allMatches.push(...matches);
    } catch (error) {
      console.error("HISTORY CHUNK FAILED:", {
        dateFrom: formattedFrom,
        dateTo: formattedTo,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 429) {
        throw error;
      }
    }

    chunkStart = new Date(chunkEnd);

    chunkStart.setUTCDate(chunkStart.getUTCDate() + 1);
  }

  const uniqueMatches = Array.from(
    new Map(allMatches.map((match) => [String(match.id), match])).values()
  );

  uniqueMatches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );

  console.log("HISTORY COMPLETE:", {
    requestedDays: historyDays,
    rawMatches: allMatches.length,
    uniqueMatches: uniqueMatches.length,
  });

  return uniqueMatches;
}
