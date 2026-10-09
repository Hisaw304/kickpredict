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
 * Get competitions available to the current API key.
 *
 * We intentionally do NOT hard-code PL, PD, BL1, etc.
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
    const globalData = await getMatches({
      dateFrom: formattedFrom,
      dateTo: formattedTo,
      limit: 500,
    });

    const matches = Array.isArray(globalData?.matches)
      ? globalData.matches
      : [];

    const summary = {
      dateFrom: formattedFrom,
      dateTo: formattedTo,
      returnedMatches: matches.length,
      resultSet: globalData?.resultSet || null,
      filters: globalData?.filters || null,
      competitions: [
        ...new Map(
          matches
            .filter((match) => match.competition?.code)
            .map((match) => [match.competition.code, match.competition.name])
        ),
      ].map(([code, name]) => ({ code, name })),
      statuses: matches.reduce((acc, match) => {
        const status = match.status || "UNKNOWN";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
      sampleMatches: matches.slice(0, 5).map((match) => ({
        id: match.id,
        utcDate: match.utcDate,
        status: match.status,
        competition: match.competition?.name,
        competitionCode: match.competition?.code,
        home: match.homeTeam?.name,
        away: match.awayTeam?.name,
      })),
    };

    console.log("DISCOVERY DEBUG:", summary);

    if (!matches.length) {
      console.warn("NO FIXTURES RETURNED BY GLOBAL ENDPOINT:", summary);
      return [];
    }

    const normalized = matches
      .map(normalizeFixture)
      .sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      );

    const fixturesByDate = normalized.reduce((acc, fixture) => {
      const date = fixture.utcDate?.slice(0, 10);
      if (!date) return acc;

      if (!acc[date]) acc[date] = [];

      acc[date].push({
        id: fixture.id,
        home: fixture.homeTeam?.name,
        away: fixture.awayTeam?.name,
        competition: fixture.competition?.name,
        competitionCode: fixture.competition?.code,
        utcDate: fixture.utcDate,
        status: fixture.status,
      });

      return acc;
    }, {});

    console.log(
      "FIXTURE DATE SUMMARY:",
      Object.entries(fixturesByDate).map(([date, dateFixtures]) => ({
        date,
        count: dateFixtures.length,
        competitions: [
          ...new Set(
            dateFixtures
              .map((fixture) => fixture.competitionCode)
              .filter(Boolean)
          ),
        ],
      }))
    );

    console.log("DISCOVERED FIXTURES:", {
      count: normalized.length,
      competitions: [
        ...new Map(
          normalized
            .filter((fixture) => fixture.competition?.code)
            .map((fixture) => [
              fixture.competition.code,
              fixture.competition.name,
            ])
        ),
      ].map(([code, name]) => ({ code, name })),
    });

    return normalized;
  } catch (error) {
    console.error("Global fixture discovery failed:", {
      requestedDateFrom: formattedFrom,
      requestedDateTo: formattedTo,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    throw error;
  }
}

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

    // Football-Data.org allows a maximum 10-day period.
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

      // Don't completely kill the tips request
      // because one historical window failed.
      if (error.response?.status === 429) {
        throw error;
      }
    }

    // Move to the next window.
    chunkStart = new Date(chunkEnd);
    chunkStart.setUTCDate(chunkStart.getUTCDate() + 1);
  }

  // Remove duplicate fixtures.
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
