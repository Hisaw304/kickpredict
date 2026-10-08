import { getMatches } from "./service.js";
import { normalizeFixture } from "./normalise.js";

const MAX_HISTORY_CHUNK_DAYS = 10;

function startOfDay(date) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  value.setUTCHours(0, 0, 0, 0);

  return value;
}

function endOfDay(date) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  value.setUTCHours(23, 59, 59, 999);

  return value;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

/*
 * Remove duplicate matches by fixture ID.
 */
function dedupeMatches(matches = []) {
  return Array.from(
    new Map(
      matches
        .filter((match) => match?.id != null)
        .map((match) => [String(match.id), match])
    ).values()
  );
}

/*
 * ------------------------------------------------
 * DISCOVER UPCOMING FIXTURES
 * ------------------------------------------------
 *
 * One global Football-Data request.
 *
 * We deliberately do NOT request each competition
 * individually.
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

    const uniqueMatches = dedupeMatches(matches);

    const normalized = uniqueMatches
      .map(normalizeFixture)
      .filter((fixture) => {
        return (
          fixture?.id &&
          fixture?.utcDate &&
          fixture?.homeTeam?.id &&
          fixture?.awayTeam?.id
        );
      })
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
 * DISCOVER HISTORICAL MATCHES
 * ------------------------------------------------
 *
 * IMPORTANT:
 *
 * Football-Data.org has date-range limitations.
 *
 * Instead of:
 *
 *   competition × teams × requests
 *
 * we use the GLOBAL /matches endpoint and split
 * the requested history into <=10-day chunks.
 *
 * Example:
 *
 * 30 days of history
 *
 *   → 10 days
 *   → 10 days
 *   → 10 days
 *
 * = only 3 external requests.
 *
 * This history is shared by ALL fixtures and ALL
 * teams in the prediction run.
 */
export async function discoverHistoricalMatches({
  fixtures = [],
  dateTo,
  historyDays = 30,
} = {}) {
  const safeHistoryDays = Math.max(1, Number(historyDays) || 30);

  const end = dateTo ? endOfDay(dateTo) : endOfDay(new Date());

  const start = new Date(end);

  start.setUTCDate(start.getUTCDate() - safeHistoryDays + 1);

  console.log("HISTORY REQUEST:", {
    historyDays: safeHistoryDays,
    dateFrom: formatDate(start),
    dateTo: formatDate(end),
  });

  /*
   * No fixtures means there is no reason to fetch
   * historical data.
   */
  if (!fixtures.length) {
    console.log("HISTORY SKIPPED: no fixtures");
    return [];
  }

  const allMatches = [];

  let chunkStart = new Date(start);
  let chunkNumber = 0;

  while (chunkStart <= end) {
    chunkNumber += 1;

    /*
     * Maximum 10-day request window.
     */
    const chunkEndCandidate = addDays(chunkStart, MAX_HISTORY_CHUNK_DAYS - 1);

    const chunkEnd =
      chunkEndCandidate < end ? endOfDay(chunkEndCandidate) : end;

    const formattedFrom = formatDate(chunkStart);
    const formattedTo = formatDate(chunkEnd);

    console.log("FETCHING HISTORY CHUNK:", {
      chunk: chunkNumber,
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
        chunk: chunkNumber,
        dateFrom: formattedFrom,
        dateTo: formattedTo,
        count: matches.length,
      });

      allMatches.push(...matches);
    } catch (error) {
      console.error("HISTORY CHUNK FAILED:", {
        chunk: chunkNumber,
        dateFrom: formattedFrom,
        dateTo: formattedTo,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      /*
       * Do not continue hammering Football-Data after
       * a rate-limit response.
       */
      if (error.response?.status === 429) {
        throw error;
      }

      throw error;
    }

    /*
     * Move to the next day after this chunk.
     */
    chunkStart = addDays(new Date(chunkEnd), 1);

    chunkStart.setUTCHours(0, 0, 0, 0);
  }

  const uniqueMatches = dedupeMatches(allMatches);

  uniqueMatches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );

  console.log("HISTORY COMPLETE:", {
    requestedDays: safeHistoryDays,
    chunks: chunkNumber,
    rawMatches: allMatches.length,
    uniqueMatches: uniqueMatches.length,
  });

  return uniqueMatches;
}
