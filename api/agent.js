import {
  discoverFixtures,
  discoverHistoricalMatches,
} from "../src/lib/football/discovery.js";

import { runPredictions } from "../src/lib/prediction/runner.js";

import { selectPredictions } from "../src/lib/prediction/select.js";

import { parsePredictionRequest } from "../src/lib/agent/parser.js";

import { buildAgentResponse } from "../src/lib/agent/response.js";

import { runBacktest } from "../src/lib/backtest/runner.js";

import { buildCalibrationProfile } from "../src/lib/prediction/calibration.js";

function getDateTime(date, time) {
  return new Date(`${date}T${time}:00Z`).getTime();
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
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

/*
 * ------------------------------------------------
 * DISCOVERY RANGE
 * ------------------------------------------------
 *
 * Search wider than the user's exact request
 * so we can determine whether the requested
 * period actually has fixtures and, only when
 * necessary, find a future fallback date.
 */

function expandDiscoveryRange(request) {
  const start = new Date(`${request.dateFrom}T00:00:00Z`);

  const end = new Date(`${request.dateTo}T23:59:59Z`);

  start.setUTCDate(start.getUTCDate() - 1);

  end.setUTCDate(end.getUTCDate() + 6);

  return {
    dateFrom: formatDate(start),
    dateTo: formatDate(end),
  };
}

/*
 * ------------------------------------------------
 * TIME WINDOW
 * ------------------------------------------------
 */

function matchesTimeWindow(fixture, timeWindow) {
  if (!timeWindow) {
    return true;
  }

  const fixtureDate = new Date(fixture.utcDate);

  if (Number.isNaN(fixtureDate.getTime())) {
    return false;
  }

  const hours = fixtureDate.getUTCHours();
  const minutes = fixtureDate.getUTCMinutes();

  const currentMinutes = hours * 60 + minutes;

  const [startHour, startMinute] = timeWindow.start.split(":").map(Number);

  const [endHour, endMinute] = timeWindow.end.split(":").map(Number);

  const startMinutes = startHour * 60 + startMinute;

  const endMinutes = endHour * 60 + endMinute;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/*
 * ------------------------------------------------
 * REQUESTED DATE
 * ------------------------------------------------
 */

function isWithinDateRange(fixture, request) {
  const fixtureTime = new Date(fixture.utcDate).getTime();

  if (!Number.isFinite(fixtureTime)) {
    return false;
  }

  const start = getDateTime(request.dateFrom, "00:00");

  const end = getDateTime(request.dateTo, "23:59");

  return fixtureTime >= start && fixtureTime <= end;
}

/*
 * ------------------------------------------------
 * FILTER EXACT USER REQUEST
 * ------------------------------------------------
 */

function filterFixtures(fixtures, request) {
  return fixtures.filter((fixture) => {
    if (!isUpcomingFixture(fixture)) {
      return false;
    }

    if (!isWithinDateRange(fixture, request)) {
      return false;
    }

    if (request.league && fixture.competition?.code !== request.league) {
      return false;
    }

    if (!matchesTimeWindow(fixture, request.timeWindow)) {
      return false;
    }

    return true;
  });
}

/*
 * ------------------------------------------------
 * FIND FIXTURES ON REQUESTED DATE
 * ------------------------------------------------
 *
 * IMPORTANT:
 *
 * This deliberately ignores the requested
 * time window.
 *
 * We need to know whether games exist on the
 * requested date before deciding whether a
 * fallback is necessary.
 */

function getFixturesOnRequestedDate(fixtures, request) {
  return fixtures.filter((fixture) => {
    if (!isUpcomingFixture(fixture)) {
      return false;
    }

    if (!isWithinDateRange(fixture, request)) {
      return false;
    }

    if (request.league && fixture.competition?.code !== request.league) {
      return false;
    }

    return true;
  });
}

/*
 * ------------------------------------------------
 * FIND NEXT AVAILABLE FIXTURES
 * ------------------------------------------------
 *
 * Fallback is ONLY used when there are no
 * fixtures at all during the requested period.
 *
 * If fixtures exist but none qualify because
 * of confidence, market, or time-window filters,
 * we do NOT silently move the user to another day.
 */

function getNextAvailableFixtures(fixtures, request) {
  const requestedEnd = getDateTime(request.dateTo, "23:59");

  return fixtures
    .filter((fixture) => {
      if (!isUpcomingFixture(fixture)) {
        return false;
      }

      const fixtureTime = new Date(fixture.utcDate).getTime();

      if (!Number.isFinite(fixtureTime) || fixtureTime <= requestedEnd) {
        return false;
      }

      if (request.league && fixture.competition?.code !== request.league) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );
}

/*
 * ------------------------------------------------
 * CONFIDENCE THRESHOLD
 * ------------------------------------------------
 */

function getMinimumProbability(confidence) {
  switch (confidence) {
    case "high":
      return 75;

    case "medium_high":
      return 70;

    case "aggressive":
      return 55;

    default:
      return 65;
  }
}

/*
 * ------------------------------------------------
 * MARKET FILTER
 * ------------------------------------------------
 */

function filterMarkets(predictions, requestedMarkets) {
  if (!requestedMarkets || !requestedMarkets.length) {
    return predictions;
  }

  return predictions.map((result) => ({
    ...result,

    prediction: {
      ...result.prediction,

      predictions:
        result.prediction?.predictions?.filter((market) =>
          requestedMarkets.some((requested) =>
            market.market?.includes(requested)
          )
        ) || [],
    },
  }));
}

/*
 * ------------------------------------------------
 * MAIN HANDLER
 * ------------------------------------------------
 */

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
    /*
     * --------------------------------------------
     * 1. READ QUERY
     * --------------------------------------------
     */

    const query =
      typeof req.query?.q === "string"
        ? req.query.q
        : typeof req.query?.query === "string"
        ? req.query.query
        : "";

    if (!query.trim()) {
      return res.status(400).json({
        error:
          "Missing prediction query. Example: /api/agent?q=give me 5 safe picks tonight",
      });
    }

    /*
     * --------------------------------------------
     * 2. PARSE REQUEST
     * --------------------------------------------
     */

    const request = parsePredictionRequest(query);

    console.log("AGENT REQUEST:", request);

    /*
     * --------------------------------------------
     * 3. DISCOVER FIXTURES
     * --------------------------------------------
     */

    const discoveryRange = expandDiscoveryRange(request);

    console.log("AGENT DISCOVERY RANGE:", discoveryRange);

    const fixtures = await discoverFixtures({
      dateFrom: discoveryRange.dateFrom,
      dateTo: discoveryRange.dateTo,
    });

    console.log("AGENT FIXTURES DISCOVERED:", fixtures.length);

    /*
     * --------------------------------------------
     * 4. CHECK REQUESTED DATE
     * --------------------------------------------
     *
     * IMPORTANT:
     *
     * We first check whether there are ANY
     * fixtures during the requested period.
     *
     * This is intentionally separate from
     * filterFixtures(), because a date can have
     * fixtures that simply don't produce enough
     * qualifying predictions.
     */

    const requestedDateFixtures = getFixturesOnRequestedDate(fixtures, request);

    console.log("AGENT REQUESTED DATE FIXTURES:", requestedDateFixtures.length);

    /*
     * --------------------------------------------
     * 5. EXACT REQUESTED FIXTURES
     * --------------------------------------------
     */

    let eligibleFixtures = filterFixtures(fixtures, request);

    let usedFallback = false;

    /*
     * --------------------------------------------
     * 6. FALLBACK
     * --------------------------------------------
     *
     * ONLY fallback when there are ZERO fixtures
     * during the requested period.
     *
     * If fixtures exist but don't qualify because
     * of time, market, confidence, history, etc.,
     * we DO NOT silently move to another date.
     */

    if (requestedDateFixtures.length === 0) {
      const fallbackFixtures = getNextAvailableFixtures(fixtures, request);

      if (fallbackFixtures.length) {
        /*
         * Use the first available future fixture
         * date only when the requested period had
         * no fixtures at all.
         */

        const firstFixture = fallbackFixtures[0];

        const firstDate = new Date(firstFixture.utcDate);

        const fallbackDate = formatDate(firstDate);

        eligibleFixtures = fallbackFixtures.filter(
          (fixture) => formatDate(new Date(fixture.utcDate)) === fallbackDate
        );

        usedFallback = true;

        console.log("AGENT FALLBACK FIXTURES:", {
          fallbackDate,
          count: eligibleFixtures.length,
        });
      }
    }

    console.log("AGENT ELIGIBLE FIXTURES:", eligibleFixtures.length);

    /*
     * --------------------------------------------
     * 7. STILL NOTHING
     * --------------------------------------------
     */

    if (!eligibleFixtures.length) {
      const response = buildAgentResponse({
        request,

        picks: [],

        dataset: {
          fixtures: fixtures.length,

          requestedDateFixtures: requestedDateFixtures.length,

          eligibleFixtures: 0,

          historicalMatches: 0,

          predictions: 0,

          markets: 0,

          fallbackUsed: false,

          fallbackDate: null,
        },
      });

      /*
       * If the requested date had fixtures but
       * nothing qualified, explain that honestly.
       */

      if (requestedDateFixtures.length > 0) {
        response.message = `I found ${requestedDateFixtures.length} fixture${
          requestedDateFixtures.length === 1 ? "" : "s"
        } during your requested time, but none produced enough qualifying selections.`;

        response.dataset.fallbackUsed = false;
      } else {
        response.message =
          "There were no fixtures during your requested time, and I couldn't find a suitable upcoming fallback.";

        response.dataset.fallbackUsed = false;
      }

      return res.status(200).json(response);
    }

    /*
     * --------------------------------------------
     * 8. DISCOVER HISTORY
     * --------------------------------------------
     *
     * For fallback fixtures, use the actual
     * fallback fixture date as the historical
     * cutoff.
     *
     * For exact requested fixtures, use the
     * requested date.
     */

    const historyDate = usedFallback
      ? formatDate(new Date(eligibleFixtures[0].utcDate))
      : request.dateFrom;

    const historicalMatches = await discoverHistoricalMatches({
      dateTo: historyDate,

      historyDays: 90,
    });

    console.log("AGENT HISTORICAL MATCHES:", historicalMatches.length);

    /*
     * --------------------------------------------
     * 9. BUILD CALIBRATION PROFILE
     * --------------------------------------------
     */

    console.log("AGENT BUILDING CALIBRATION PROFILE...");

    const calibrationBacktest = runBacktest({
      matches: historicalMatches,

      minHistory: 5,
    });

    const calibrationProfile = buildCalibrationProfile(calibrationBacktest, {
      minSamples: 20,
    });

    console.log(
      "AGENT CALIBRATION PROFILE:",
      Object.fromEntries(
        Object.entries(calibrationProfile).map(([market, buckets]) => [
          market,

          buckets.map((bucket) => ({
            range: `${Math.round(bucket.min * 100)}-${Math.round(
              Math.min(bucket.max, 1) * 100
            )}%`,

            samples: bucket.count,

            predicted: Number((bucket.meanProbability * 100).toFixed(1)),

            observed: Number((bucket.observedRate * 100).toFixed(1)),

            gap: Number((bucket.calibrationGap * 100).toFixed(1)),
          })),
        ])
      )
    );

    /*
     * --------------------------------------------
     * 10. RUN PREDICTIONS
     * --------------------------------------------
     */

    const predictions = runPredictions({
      fixtures: eligibleFixtures,

      historicalMatches,

      minHistory: 5,
    });

    console.log("AGENT PREDICTIONS:", predictions.length);

    /*
     * --------------------------------------------
     * 11. MARKET FILTER
     * --------------------------------------------
     */

    const marketFiltered = filterMarkets(predictions, request.markets);

    /*
     * --------------------------------------------
     * 12. QUALITY THRESHOLD
     * --------------------------------------------
     */

    const minProbability = getMinimumProbability(request.confidence);

    /*
     * --------------------------------------------
     * 13. SELECT PICKS
     * --------------------------------------------
     */

    const picks = selectPredictions({
      results: marketFiltered,

      limit: request.count,

      minProbability,

      calibrationProfile,
    });

    console.log("AGENT SELECTED PICKS:", picks.length);

    /*
     * --------------------------------------------
     * 14. DATASET
     * --------------------------------------------
     */

    const totalMarkets = marketFiltered.reduce(
      (total, result) => total + (result.prediction?.predictions || []).length,
      0
    );

    /*
     * --------------------------------------------
     * 15. RESPONSE
     * --------------------------------------------
     */

    const response = buildAgentResponse({
      request,

      picks,

      dataset: {
        fixtures: fixtures.length,

        requestedDateFixtures: requestedDateFixtures.length,

        eligibleFixtures: eligibleFixtures.length,

        historicalMatches: historicalMatches.length,

        predictions: predictions.length,

        markets: totalMarkets,

        minimumProbability: minProbability,

        fallbackUsed: usedFallback,

        fallbackDate: usedFallback
          ? formatDate(new Date(eligibleFixtures[0].utcDate))
          : null,
      },
    });

    /*
     * --------------------------------------------
     * 16. EXPLAIN FALLBACK
     * --------------------------------------------
     */

    if (usedFallback) {
      response.message = picks.length
        ? `There were no fixtures during your requested time, so I checked the next available games and found ${
            picks.length
          } qualifying pick${picks.length === 1 ? "" : "s"}.`
        : "There were no fixtures during your requested time, so I checked the next available games but couldn't find enough high-confidence selections.";
    } else if (picks.length < request.count) {
      response.message = `I found ${picks.length} qualifying pick${
        picks.length === 1 ? "" : "s"
      } instead of the requested ${request.count}.`;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("AGENT REQUEST FAILED:", {
      message: error.message,

      status: error.response?.status,

      data: error.response?.data,

      stack: error.stack,
    });

    return res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to generate prediction agent response.",
    });
  }
}
