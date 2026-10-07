import { discoverHistoricalMatches } from "../src/lib/football/discovery.js";
import { runBacktest } from "../src/lib/backtest/runner.js";
import { buildCalibrationProfile } from "../src/lib/prediction/calibration.js";
import { saveCalibrationProfile } from "../src/lib/prediction/calibrationStore.js";

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "Supabase calibration storage is not configured.",
    });
  }

  try {
    const { historyDays, minHistory, minSamples, dateTo } = req.query;

    const historicalDays = Math.min(
      Math.max(parseNumber(historyDays, 90), 7),
      365
    );

    const minimumHistory = Math.max(parseNumber(minHistory, 5), 1);

    const minimumSamples = Math.max(parseNumber(minSamples, 20), 1);

    const calibrationDate = dateTo || new Date().toISOString().slice(0, 10);

    console.log("CALIBRATION START:", {
      historyDays: historicalDays,
      minHistory: minimumHistory,
      minSamples: minimumSamples,
      dateTo: calibrationDate,
    });

    const historicalMatches = await discoverHistoricalMatches({
      dateTo: calibrationDate,
      historyDays: historicalDays,
    });

    console.log("CALIBRATION HISTORICAL MATCHES:", historicalMatches.length);

    const backtestResults = runBacktest({
      matches: historicalMatches,
      minHistory: minimumHistory,
    });

    console.log("CALIBRATION BACKTEST RESULTS:", backtestResults.length);

    const calibrationProfile = buildCalibrationProfile(backtestResults, {
      minSamples: minimumSamples,
    });

    const saved = await saveCalibrationProfile(calibrationProfile);

    const calibrationMarkets = Object.keys(calibrationProfile).length;

    const calibrationBuckets = Object.values(calibrationProfile).reduce(
      (total, buckets) => total + buckets.length,
      0
    );

    console.log(
      "CALIBRATION PROFILE:",
      JSON.stringify(calibrationProfile, null, 2)
    );

    console.log("CALIBRATION SAVED:", saved);

    return res.status(200).json({
      success: true,

      message: "Calibration profile built and saved successfully.",

      configuration: {
        historyDays: historicalDays,
        minHistory: minimumHistory,
        minSamples: minimumSamples,
        dateTo: calibrationDate,
      },

      dataset: {
        historicalMatches: historicalMatches.length,

        backtestFixtures: backtestResults.length,

        calibrationMarkets,

        calibrationBuckets,

        savedRows: saved.saved,
      },

      calibration: calibrationProfile,
    });
  } catch (error) {
    console.error("Calibration request failed:", {
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
        "Failed to build calibration profile.",
    });
  }
}
