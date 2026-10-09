import {
  discoverFixtures,
  discoverHistoricalMatches,
} from "../src/lib/football/discovery.js";

import { runPredictions } from "../src/lib/prediction/runner.js";

import { selectPredictions } from "../src/lib/prediction/select.js";

import { parsePredictionRequest } from "../src/lib/agent/parser.js";

import { interpretPredictionRequest } from "../src/lib/agent/interpreter.js";

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

  /*
   * The deterministic parser returns an object:
   *
   * {
   *   start: "18:00",
   *   end: "23:59"
   * }
   *
   * Protect against malformed values.
   */

  if (typeof timeWindow !== "object" || !timeWindow.start || !timeWindow.end) {
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
 * Deliberately ignores time window.
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
 * VALIDATE AI INTERPRETATION
 * ------------------------------------------------
 *
 * The AI is allowed to understand language.
 *
 * It is NOT allowed to introduce arbitrary values
 * into the prediction system.
 *
 * This function converts its structured output into
 * the shape expected by the existing agent.
 */

function applyAiInterpretation(parsedRequest, interpretedRequest) {
  const request = {
    ...parsedRequest,
  };

  /*
   * Count
   */

  if (
    Number.isInteger(interpretedRequest.count) &&
    interpretedRequest.count >= 1 &&
    interpretedRequest.count <= 20
  ) {
    request.count = interpretedRequest.count;
  }

  /*
   * Confidence
   */

  const validConfidence = ["high", "medium_high", "standard", "aggressive"];

  if (validConfidence.includes(interpretedRequest.confidence)) {
    request.confidence = interpretedRequest.confidence;
  }

  /*
   * League
   */

  const validLeagues = ["PL", "PD", "BL1", "SA", "FL1", "CL"];

  if (
    interpretedRequest.league === null ||
    validLeagues.includes(interpretedRequest.league)
  ) {
    request.league = interpretedRequest.league;
  }

  /*
   * Request type
   */

  if (
    interpretedRequest.requestType === "picks" ||
    interpretedRequest.requestType === "odds"
  ) {
    request.type = interpretedRequest.requestType;
  }

  /*
   * MARKET
   *
   * The AI returns one canonical market.
   *
   * The existing prediction pipeline expects
   * an array, so convert it here.
   */

  if (interpretedRequest.market) {
    request.markets = [interpretedRequest.market];
  } else {
    /*
     * IMPORTANT:
     *
     * Do not overwrite a valid deterministic
     * parser result when AI intentionally says
     * there is no explicit market.
     *
     * This allows:
     *
     * "give me 5 safe picks tonight"
     *
     * to remain a broad prediction request.
     */

    if (!parsedRequest.markets || !parsedRequest.markets.length) {
      request.markets = null;
    }
  }

  /*
   * Preserve deterministic date resolution.
   *
   * parsePredictionRequest() is still the
   * authoritative date/time resolver.
   */

  return request;
}

/*
 * ------------------------------------------------
 * BUILD CLARIFICATION RESPONSE
 * ------------------------------------------------
 */

function buildClarificationResponse(query, interpretedRequest) {
  return {
    success: true,

    needsClarification: true,

    clarification:
      interpretedRequest.clarification ||
      "Could you clarify what prediction market you want?",

    request: {
      query,

      intent: interpretedRequest.intent,

      type: interpretedRequest.requestType,

      count: interpretedRequest.count,

      confidence: interpretedRequest.confidence,

      market: interpretedRequest.market,

      league: interpretedRequest.league,

      timeWindow: interpretedRequest.timeWindow,

      dateFrom: interpretedRequest.dateFrom,

      dateTo: interpretedRequest.dateTo,
    },

    picks: [],

    dataset: {
      fixtures: 0,

      requestedDateFixtures: 0,

      eligibleFixtures: 0,

      historicalMatches: 0,

      predictions: 0,

      markets: 0,
    },
  };
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
     * 2. DETERMINISTIC PARSER
     * --------------------------------------------
     *
     * We keep this.
     *
     * It is particularly useful for:
     *
     * - date resolution
     * - time-window resolution
     * - fallback behavior
     * - AI failure fallback
     *
     * The AI interpreter will then improve the
     * understanding of the user's actual intent.
     */

    const parsedRequest = parsePredictionRequest(query);

    console.log("AGENT DETERMINISTIC REQUEST:", parsedRequest);

    /*
     * --------------------------------------------
     * 3. AI INTERPRETER
     * --------------------------------------------
     *
     * The AI understands the user's natural
     * language and returns structured intent.
     *
     * If the interpreter is temporarily unavailable,
     * we fall back to the deterministic parser.
     */

    let interpretedRequest = null;

    try {
      interpretedRequest = await interpretPredictionRequest(query, new Date());

      console.log("AGENT AI INTERPRETATION:", interpretedRequest);
    } catch (interpreterError) {
      console.error("AGENT AI INTERPRETER FAILED:", interpreterError);

      /*
       * Do NOT fail the whole prediction agent.
       *
       * The existing parser remains our fallback.
       */

      interpretedRequest = null;
    }

    /*
     * --------------------------------------------
     * 4. CLARIFICATION
     * --------------------------------------------
     *
     * If AI understands that the user's request
     * is ambiguous, stop here.
     *
     * Do NOT call the football API.
     * Do NOT research fixtures.
     * Do NOT generate predictions.
     */

    if (interpretedRequest?.needsClarification === true) {
      return res
        .status(200)
        .json(buildClarificationResponse(query, interpretedRequest));
    }

    /*
     * --------------------------------------------
     * 5. BUILD FINAL REQUEST
     * --------------------------------------------
     */

    const request = interpretedRequest
      ? applyAiInterpretation(parsedRequest, interpretedRequest)
      : parsedRequest;

    console.log("AGENT FINAL REQUEST:", request);

    /*
     * --------------------------------------------
     * 6. DISCOVER FIXTURES
     * --------------------------------------------
     */

    const discoveryRange = {
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
    };

    console.log("AGENT DISCOVERY RANGE:", discoveryRange);

    const fixtures = await discoverFixtures(discoveryRange);

    console.log("AGENT FIXTURES DISCOVERED:", fixtures.length);

    /*
     * --------------------------------------------
     * 7. CHECK REQUESTED DATE
     * --------------------------------------------
     */

    const requestedDateFixtures = getFixturesOnRequestedDate(fixtures, request);

    console.log("AGENT REQUESTED DATE FIXTURES:", requestedDateFixtures.length);

    /*
     * --------------------------------------------
     * 8. EXACT REQUESTED FIXTURES
     * --------------------------------------------
     */

    let eligibleFixtures = filterFixtures(fixtures, request);

    let usedFallback = false;

    /*
     * --------------------------------------------
     * 9. FALLBACK
     * --------------------------------------------
     *
     * ONLY fallback when there are ZERO fixtures
     * during the requested period.
     */

    if (requestedDateFixtures.length === 0) {
      const fallbackFixtures = getNextAvailableFixtures(fixtures, request);

      if (fallbackFixtures.length) {
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
     * 10. STILL NOTHING
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
     * 11. DISCOVER HISTORY
     * --------------------------------------------
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
     * 12. BUILD CALIBRATION PROFILE
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
     * 13. RUN PREDICTIONS
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
     * 14. MARKET FILTER
     * --------------------------------------------
     */

    const marketFiltered = filterMarkets(predictions, request.markets);

    /*
     * --------------------------------------------
     * 15. QUALITY THRESHOLD
     * --------------------------------------------
     */

    const minProbability = getMinimumProbability(request.confidence);

    /*
     * --------------------------------------------
     * 16. SELECT PICKS
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
     * 17. DATASET
     * --------------------------------------------
     */

    const totalMarkets = marketFiltered.reduce(
      (total, result) => total + (result.prediction?.predictions || []).length,
      0
    );

    /*
     * --------------------------------------------
     * 18. RESPONSE
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
     * 19. EXPLAIN FALLBACK / SHORT RESULT
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
