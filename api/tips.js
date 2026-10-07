import {
  discoverFixtures,
  discoverHistoricalMatches,
} from "../src/lib/football/discovery.js";

import { runPredictions } from "../src/lib/prediction/runner.js";

import { selectPredictions } from "../src/lib/prediction/select.js";

function parseNumber(value, fallback) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDateRange({ date, dateFrom, dateTo, days } = {}) {
  if (dateFrom || dateTo) {
    return {
      dateFrom: dateFrom || dateTo || getToday(),
      dateTo: dateTo || dateFrom || getToday(),
    };
  }

  const target = date || getToday();

  const numberOfDays = Math.min(Math.max(parseNumber(days, 1), 1), 10);

  const start = new Date(`${target}T00:00:00Z`);

  const end = new Date(start);

  end.setUTCDate(end.getUTCDate() + numberOfDays - 1);

  return {
    dateFrom: target,
    dateTo: end.toISOString().slice(0, 10),
  };
}

function isUpcomingFixture(fixture) {
  const fixtureTime = new Date(fixture.utcDate).getTime();

  if (!Number.isFinite(fixtureTime)) {
    return false;
  }

  return (
    fixtureTime > Date.now() &&
    (fixture.status === "SCHEDULED" || fixture.status === "TIMED")
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!process.env.FOOTBALL_API_KEY) {
    return res.status(500).json({
      error: "FOOTBALL_API_KEY is not configured on the server.",
    });
  }

  try {
    const {
      date,
      dateFrom,
      dateTo,
      days,
      limit,
      minProbability,
      minHistory,
      historyDays,
    } = req.query;

    const range = getDateRange({
      date,
      dateFrom,
      dateTo,
      days,
    });

    const selectionLimit = Math.min(Math.max(parseNumber(limit, 5), 1), 20);

    const probabilityThreshold = Math.min(
      Math.max(parseNumber(minProbability, 65), 0),
      100
    );

    const minimumHistory = Math.max(parseNumber(minHistory, 5), 1);

    const historicalDays = Math.min(
      Math.max(parseNumber(historyDays, 90), 7),
      365
    );

    /*
     * STEP 1
     *
     * Discover all fixtures available from
     * Football-Data for the requested period.
     */
    const fixtures = await discoverFixtures({
      dateFrom: range.dateFrom,

      dateTo: range.dateTo,
    });

    console.log("KICKPREDICT DISCOVERY:", {
      requested: {
        dateFrom: range.dateFrom,

        dateTo: range.dateTo,
      },

      fixtureCount: fixtures.length,

      fixtures: fixtures.slice(0, 10),
    });

    /*
     * STEP 2
     *
     * Only keep fixtures that have not started.
     *
     * This prevents:
     *
     * FINISHED
     * IN_PLAY
     * PAUSED
     * POSTPONED
     * CANCELLED
     *
     * from entering the tips engine.
     */
    const upcomingFixtures = fixtures.filter(isUpcomingFixture);

    console.log("KICKPREDICT UPCOMING:", {
      discovered: fixtures.length,

      upcoming: upcomingFixtures.length,

      fixtures: upcomingFixtures.slice(0, 10),
    });

    /*
     * No upcoming fixtures means there is
     * nothing to predict.
     *
     * Most importantly, we return BEFORE
     * requesting the 90-day historical dataset.
     */
    if (!upcomingFixtures.length) {
      return res.status(200).json({
        success: true,

        request: {
          dateFrom: range.dateFrom,

          dateTo: range.dateTo,

          limit: selectionLimit,

          minProbability: probabilityThreshold,

          minHistory: minimumHistory,

          historyDays: historicalDays,
        },

        dataset: {
          fixtures: fixtures.length,

          upcomingFixtures: 0,

          historicalMatches: 0,

          predictions: 0,

          markets: 0,
        },

        picks: [],
      });
    }

    /*
     * STEP 3
     *
     * Pull one global historical dataset.
     *
     * The discovery function automatically
     * splits this into <=10-day API requests.
     */
    const historicalMatches = await discoverHistoricalMatches({
      dateTo: range.dateFrom,

      historyDays: historicalDays,
    });

    /*
     * STEP 4
     *
     * Generate predictions for every
     * qualifying upcoming fixture.
     */
    const predictions = runPredictions({
      fixtures: upcomingFixtures,

      historicalMatches,

      minHistory: minimumHistory,
    });

    /*
     * STEP 5
     *
     * Select the requested number of
     * markets.
     *
     * selectPredictions currently allows
     * only ONE selection per fixture.
     */
    const picks = selectPredictions({
      results: predictions,

      limit: selectionLimit,

      minProbability: probabilityThreshold,
    });

    /*
     * Count all generated markets.
     */
    const totalMarkets = predictions.reduce(
      (total, result) => total + (result.prediction?.predictions || []).length,
      0
    );

    return res.status(200).json({
      success: true,

      request: {
        dateFrom: range.dateFrom,

        dateTo: range.dateTo,

        limit: selectionLimit,

        minProbability: probabilityThreshold,

        minHistory: minimumHistory,

        historyDays: historicalDays,
      },

      dataset: {
        /*
         * All fixtures discovered
         * from the provider.
         */
        fixtures: fixtures.length,

        /*
         * Fixtures actually eligible
         * for tips.
         */
        upcomingFixtures: upcomingFixtures.length,

        /*
         * Historical research dataset.
         */
        historicalMatches: historicalMatches.length,

        /*
         * Fixtures that successfully
         * received predictions.
         */
        predictions: predictions.length,

        /*
         * Total markets generated across
         * all predicted fixtures.
         */
        markets: totalMarkets,
      },

      picks,
    });
  } catch (error) {
    console.error("Tips request failed:", {
      message: error.message,

      code: error.code,

      status: error.response?.status,

      data: error.response?.data,

      stack: error.stack,
    });

    return res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to generate tips",
    });
  }
}
