import { discoverHistoricalMatches } from "../src/lib/football/discovery.js";

import { runBacktest } from "../src/lib/backtest/runner.js";

import {
  calculateMetrics,
  calculateMarketMetrics,
  calculateThresholdMetrics,
  calculateMarketThresholdMetrics,
  calculateCalibration,
  calculateMarketCalibration,
} from "../src/lib/backtest/metrics.js";

const allowedLeagues = ["PL", "PD", "BL1", "SA", "FL1", "CL"];

function parseNumber(value, fallback) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { league, limit, minHistory, historyDays } = req.query;

  if (!league) {
    return res.status(400).json({
      error: "league is required",
    });
  }

  if (!allowedLeagues.includes(league)) {
    return res.status(400).json({
      error: "Invalid league",
    });
  }

  if (!process.env.FOOTBALL_API_KEY) {
    return res.status(500).json({
      error: "FOOTBALL_API_KEY is not configured on the server.",
    });
  }

  try {
    /*
     * How much historical data should
     * we retrieve?
     *
     * Default: 90 days
     */
    const requestedHistoryDays = Math.min(
      Math.max(parseNumber(historyDays, 90), 7),
      365
    );

    /*
     * How many fixtures should actually
     * be tested?
     *
     * No limit = test every eligible
     * historical fixture.
     */
    const parsedLimit = limit ? Number(limit) : undefined;

    /*
     * Minimum number of previous matches
     * required for each team.
     */
    const parsedMinHistory = parseNumber(minHistory, 3);

    const effectiveMinHistory =
      Number.isFinite(parsedMinHistory) && parsedMinHistory >= 0
        ? parsedMinHistory
        : 3;

    const effectiveLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    console.log("BACKTEST REQUEST:", {
      league,
      historyDays: requestedHistoryDays,
      limit: effectiveLimit,
      minHistory: effectiveMinHistory,
    });

    /*
     * Retrieve historical matches.
     *
     * discoverHistoricalMatches()
     * already handles the provider's
     * date-window restrictions.
     */
    const historicalMatches = await discoverHistoricalMatches({
      dateTo: getToday(),
      historyDays: requestedHistoryDays,
    });

    console.log("BACKTEST HISTORICAL DATA:", {
      requestedHistoryDays,
      totalHistoricalMatches: historicalMatches.length,
    });

    /*
     * Filter historical data to the
     * requested competition.
     *
     * This allows the global historical
     * endpoint to provide the data while
     * keeping the backtest league-specific.
     */
    const matches = historicalMatches.filter(
      (match) => match.competition?.code === league
    );

    console.log("BACKTEST LEAGUE DATA:", {
      league,
      totalMatches: matches.length,

      finishedMatches: matches.filter((match) => match.status === "FINISHED")
        .length,
    });

    if (!matches.length) {
      return res.status(200).json({
        success: true,

        league,

        dataset: {
          historyDays: requestedHistoryDays,

          historicalMatches: historicalMatches.length,

          totalMatches: 0,

          finishedMatches: 0,

          testedFixtures: 0,

          evaluatedMarkets: 0,
        },

        metrics: calculateMetrics([]),

        marketMetrics: calculateMarketMetrics([]),

        thresholdMetrics: calculateThresholdMetrics([]),

        marketThresholdMetrics: calculateMarketThresholdMetrics([]),

        calibration: calculateCalibration([]),

        marketCalibration: calculateMarketCalibration([]),

        results: [],
      });
    }

    /*
     * Run the historical backtest.
     *
     * The runner itself makes sure each
     * fixture only sees matches that
     * happened before it.
     */
    const results = runBacktest({
      matches,

      minHistory: effectiveMinHistory,

      limit: effectiveLimit,
    });

    /*
     * Flatten all evaluated markets.
     */
    const allMarkets = results.flatMap(
      (result) => result.evaluation?.markets || []
    );

    /*
     * Overall metrics.
     */
    const metrics = calculateMetrics(allMarkets);

    /*
     * Metrics by market.
     */
    const marketMetrics = calculateMarketMetrics(allMarkets);

    /*
     * Overall threshold metrics.
     */
    const thresholdMetrics = calculateThresholdMetrics(allMarkets);

    /*
     * Threshold metrics by market.
     */
    const marketThresholdMetrics = calculateMarketThresholdMetrics(allMarkets);

    /*
     * Overall probability calibration.
     */
    const calibration = calculateCalibration(allMarkets);

    /*
     * Calibration by market.
     */
    const marketCalibration = calculateMarketCalibration(allMarkets);

    return res.status(200).json({
      success: true,

      league,

      dataset: {
        historyDays: requestedHistoryDays,

        historicalMatches: historicalMatches.length,

        totalMatches: matches.length,

        finishedMatches: matches.filter((match) => match.status === "FINISHED")
          .length,

        testedFixtures: results.length,

        evaluatedMarkets: allMarkets.length,
      },

      metrics,

      marketMetrics,

      thresholdMetrics,

      marketThresholdMetrics,

      calibration,

      marketCalibration,

      results,
    });
  } catch (error) {
    console.error("Backtest request failed:", {
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
        "Failed to run backtest",
    });
  }
}
