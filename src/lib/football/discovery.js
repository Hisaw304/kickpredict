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
  const from = dateFrom ? startOfDay(dateFrom) : startOfDay(new Date());

  const to = dateTo ? endOfDay(dateTo) : endOfDay(from);

  const formattedFrom = formatDate(from);
  const formattedTo = formatDate(to);

  console.log("DISCOVER FIXTURES:", {
    dateFrom: formattedFrom,
    dateTo: formattedTo,
  });

  try {
    const competitions = await discoverCompetitions();

    if (!competitions.length) {
      console.warn("NO COMPETITIONS AVAILABLE TO THIS API KEY");
      return [];
    }

    const results = await Promise.allSettled(
      competitions.map(async (competition) => {
        const code = competition.code;

        const response = await getFixtures({
          league: code,
          dateFrom: formattedFrom,
          dateTo: formattedTo,
        });

        const matches = Array.isArray(response?.matches)
          ? response.matches
          : [];

        return {
          competition,
          matches,
        };
      })
    );

    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      const competition = competitions[index];

      if (result.status === "fulfilled") {
        successful.push(result.value);

        console.log("COMPETITION FIXTURES RESULT:", {
          code: competition.code,
          name: competition.name,
          count: result.value.matches.length,
        });
      } else {
        const error = result.reason;

        failed.push({
          code: competition.code,
          name: competition.name,
          message: error?.message || "Unknown error",
          status: error?.response?.status || null,
          data: error?.response?.data || null,
        });

        console.error("COMPETITION FIXTURES FAILED:", {
          code: competition.code,
          name: competition.name,
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
      }
    });

    const uniqueMatches = new Map();

    for (const result of successful) {
      for (const match of result.matches) {
        if (match?.id != null) {
          uniqueMatches.set(String(match.id), match);
        }
      }
    }

    const rawMatches = [...uniqueMatches.values()];

    console.log("FIXTURE DISCOVERY SUMMARY:", {
      requestedDateFrom: formattedFrom,
      requestedDateTo: formattedTo,
      availableCompetitions: competitions.length,
      successfulCompetitionRequests: successful.length,
      failedCompetitionRequests: failed.length,
      failedCompetitions: failed,
      totalUniqueMatches: rawMatches.length,
    });

    if (successful.length === 0 && failed.length > 0) {
      throw new Error(
        `All competition fixture requests failed: ${failed
          .map(({ code, status, message }) => `${code}: ${status || message}`)
          .join("; ")}`
      );
    }

    if (!rawMatches.length) {
      console.warn("NO FIXTURES FOUND FOR REQUESTED DATE:", {
        dateFrom: formattedFrom,
        dateTo: formattedTo,
      });

      return [];
    }

    const normalized = rawMatches
      .map(normalizeFixture)
      .filter(Boolean)
      .sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      );

    console.log(
      "DISCOVERED FIXTURES:",
      normalized.map((fixture) => ({
        id: fixture.id,
        date: fixture.utcDate,
        status: fixture.status,
        competition: fixture.competition?.name,
        competitionCode: fixture.competition?.code,
        home: fixture.homeTeam?.name,
        away: fixture.awayTeam?.name,
      }))
    );

    return normalized;
  } catch (error) {
    console.error("Fixture discovery failed:", {
      requestedDateFrom: formattedFrom,
      requestedDateTo: formattedTo,
      message: error.message,
      status: error.response?.status || null,
      data: error.response?.data || null,
    });

    throw error;
  }
}

/**
 * Retrieve historical finished matches for team research.
 * Historical lookback remains separate from fixture discovery.
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
        status: error.response?.status || null,
        data: error.response?.data || null,
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
