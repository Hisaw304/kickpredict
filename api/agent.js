import {
  discoverFixtures,
  discoverHistoricalMatches,
} from "../src/lib/football/discovery.js";

import { loadCalibrationProfile } from "../src/lib/prediction/calibrationStore.js";

import { runPredictions } from "../src/lib/prediction/runner.js";

import { selectPredictions } from "../src/lib/prediction/select.js";

import { parsePredictionRequest } from "../src/lib/agent/parser.js";

import { interpretPredictionRequest } from "../src/lib/agent/interpreter.js";

import { buildAgentResponse } from "../src/lib/agent/response.js";

/*
 * ================================================================
 * DETERMINISTIC PARSER GATE
 * ================================================================
 *
 * Simple requests should NEVER consume OpenAI tokens.
 *
 * Examples:
 *
 *   Give me 5 safe picks tonight
 *   Give me 10 premier league picks tomorrow
 *   5 over 2.5 picks tonight
 *   3 btts picks
 *   5 home win picks tonight
 *   5 odds tonight
 *
 * More complex requests are sent to the AI interpreter.
 *
 * Examples:
 *
 *   Give me picks based on recent home form
 *   Find teams that have scored in their last 5 games
 *   Give me picks where both teams have good form
 *   Avoid teams with injuries
 *   Find value picks
 * ================================================================
 */

function shouldUseDeterministicParser(query, parsedRequest) {
  const text = String(query || "")
    .toLowerCase()
    .trim();

  if (!parsedRequest) {
    return false;
  }

  const hasRequestKeyword =
    /\b(picks?|predictions?|tips?|bets?|odds?|accumulator|acca|parlay|combo|combined)\b/i.test(
      text
    );

  if (!hasRequestKeyword) {
    return false;
  }

  /*
   * These indicate that the user is asking for something
   * beyond the deterministic parser's basic capabilities.
   */
  const complexIntentPattern =
    /\b(where|that|which|whose|based on|according to|because|since|avoid|excluding|exclude|only if|if they|if the|teams that|games that|matches that|looked|form|recent form|home form|away form|head[- ]?to[- ]?head|h2h|injur|injuries|suspension|suspended|lineup|line[- ]?up|starting eleven|weather|motivation|value|underdog|favorite|favourite)\b/i;

  if (complexIntentPattern.test(text)) {
    return false;
  }

  /*
   * If the deterministic parser successfully resolved
   * the request into a basic prediction/odds request
   * with a valid date range, no AI call is necessary.
   */
  return (
    (parsedRequest.type === "picks" || parsedRequest.type === "odds") &&
    Boolean(parsedRequest.dateFrom) &&
    Boolean(parsedRequest.dateTo)
  );
}

/*
 * ================================================================
 * DATE HELPERS
 * ================================================================
 */

function getDateTime(date, time) {
  return new Date(`${date}T${time}:00Z`).getTime();
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/*
 * ================================================================
 * UPCOMING FIXTURE
 * ================================================================
 */

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
 * ================================================================
 * DISCOVERY RANGE
 * ================================================================
 *
 * Search slightly before the requested date and several days
 * after it so fallback fixtures are available.
 *
 * Example:
 *
 * October 8 request
 * =>
 * October 7 through October 14
 * ================================================================
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
 * ================================================================
 * TIME WINDOW
 * ================================================================
 */

function matchesTimeWindow(fixture, timeWindow) {
  if (!timeWindow) {
    return true;
  }

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
 * ================================================================
 * DATE RANGE
 * ================================================================
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
 * ================================================================
 * EXACT FIXTURE FILTER
 * ================================================================
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
 * ================================================================
 * REQUESTED DATE FIXTURES
 * ================================================================
 *
 * This intentionally ignores the time window.
 *
 * Why?
 *
 * If the user says:
 *
 *   "safe picks tonight"
 *
 * and there are games today but none tonight,
 * we should NOT immediately use tomorrow.
 *
 * We first know that today's date has fixtures,
 * then return zero qualifying picks for the requested
 * time window.
 * ================================================================
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
 * ================================================================
 * NEXT AVAILABLE FIXTURES
 * ================================================================
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
 * ================================================================
 * CONFIDENCE THRESHOLD
 * ================================================================
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
 * ================================================================
 * MARKET FILTER
 * ================================================================
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
          requestedMarkets.some((requested) => market.market === requested)
        ) || [],
    },
  }));
}

/*
 * ================================================================
 * APPLY AI INTERPRETATION
 * ================================================================
 *
 * The AI is only responsible for understanding
 * complicated natural language.
 *
 * It cannot invent markets or arbitrary values.
 * ================================================================
 */

function applyAiInterpretation(parsedRequest, interpretedRequest) {
  const request = {
    ...parsedRequest,
  };

  /*
   * COUNT
   */

  if (
    Number.isInteger(interpretedRequest.count) &&
    interpretedRequest.count >= 1 &&
    interpretedRequest.count <= 20
  ) {
    request.count = interpretedRequest.count;
  }

  /*
   * CONFIDENCE
   */

  const validConfidence = ["high", "medium_high", "standard", "aggressive"];

  if (validConfidence.includes(interpretedRequest.confidence)) {
    request.confidence = interpretedRequest.confidence;
  }

  /*
   * LEAGUE
   */

  const validLeagues = ["PL", "PD", "BL1", "SA", "FL1", "CL"];

  if (
    interpretedRequest.league === null ||
    validLeagues.includes(interpretedRequest.league)
  ) {
    request.league = interpretedRequest.league;
  }

  /*
   * REQUEST TYPE
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
   * AI returns one canonical market.
   *
   * Convert it to the array expected by
   * the prediction pipeline.
   */

  if (interpretedRequest.market) {
    request.markets = [interpretedRequest.market];
  } else {
    /*
     * Do not destroy a deterministic parser
     * market when AI intentionally returns null.
     */

    if (!parsedRequest.markets || !parsedRequest.markets.length) {
      request.markets = null;
    }
  }

  /*
   * Date/time remains controlled by the
   * deterministic parser.
   */

  return request;
}

/*
 * ================================================================
 * CLARIFICATION RESPONSE
 * ================================================================
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
 * ================================================================
 * MAIN HANDLER
 * ================================================================
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  /*
   * Football-Data is required for fixture discovery.
   */

  if (!process.env.FOOTBALL_API_KEY) {
    return res.status(500).json({
      error: "FOOTBALL_API_KEY is not configured on the server.",
    });
  }

  try {
    /*
     * ------------------------------------------------
     * 1. READ QUERY
     * ------------------------------------------------
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
     * ------------------------------------------------
     * 2. DETERMINISTIC PARSER FIRST
     * ------------------------------------------------
     *
     * This is the critical change.
     *
     * We parse every request locally first.
     *
     * Simple requests never reach OpenAI.
     */

    const parsedRequest = parsePredictionRequest(query, new Date());

    console.log("AGENT DETERMINISTIC REQUEST:", parsedRequest);

    let interpretedRequest = null;

    let request = null;

    const useDeterministicParser = shouldUseDeterministicParser(
      query,
      parsedRequest
    );

    /*
     * ------------------------------------------------
     * 3. SIMPLE REQUEST
     * ------------------------------------------------
     *
     * NO OPENAI CALL.
     * ------------------------------------------------
     */

    if (useDeterministicParser) {
      request = parsedRequest;

      console.log("AGENT USING DETERMINISTIC PARSER:", {
        type: request.type,
        count: request.count,
        confidence: request.confidence,
        league: request.league,
        markets: request.markets,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
        timeWindow: request.timeWindow,
      });
    } else {
      /*
       * ------------------------------------------------
       * 3B. COMPLEX REQUEST
       * ------------------------------------------------
       *
       * Only complicated natural-language requests
       * reach OpenAI.
       */

      console.log("AGENT USING AI INTERPRETER:", {
        query,
      });

      try {
        interpretedRequest = await interpretPredictionRequest(
          query,
          new Date()
        );

        console.log("AGENT AI INTERPRETATION:", interpretedRequest);
      } catch (interpreterError) {
        /*
         * OpenAI being unavailable should NOT
         * destroy the entire prediction endpoint.
         */

        console.error("AGENT AI INTERPRETER FAILED:", interpreterError);

        interpretedRequest = null;
      }

      /*
       * ------------------------------------------------
       * 4. AI CLARIFICATION
       * ------------------------------------------------
       *
       * If the AI says the request is ambiguous,
       * stop before hitting Football-Data.
       */

      if (interpretedRequest?.needsClarification === true) {
        return res
          .status(200)
          .json(buildClarificationResponse(query, interpretedRequest));
      }

      /*
       * ------------------------------------------------
       * 5. BUILD FINAL REQUEST
       * ------------------------------------------------
       */

      request = interpretedRequest
        ? applyAiInterpretation(parsedRequest, interpretedRequest)
        : parsedRequest;

      console.log("AGENT FINAL REQUEST:", request);
    }

    /*
     * ------------------------------------------------
     * 6. FINAL VALIDATION
     * ------------------------------------------------
     */

    if (!request) {
      return res.status(400).json({
        error: "Could not understand prediction request.",
      });
    }

    /*
     * ------------------------------------------------
     * 7. DISCOVER FIXTURES
     * ------------------------------------------------
     */

    const discoveryRange = expandDiscoveryRange(request);

    console.log("AGENT DISCOVERY RANGE:", discoveryRange);

    const fixtures = await discoverFixtures({
      dateFrom: discoveryRange.dateFrom,
      dateTo: discoveryRange.dateTo,
    });

    console.log("AGENT FIXTURES DISCOVERED:", fixtures.length);

    /*
     * ------------------------------------------------
     * 8. REQUESTED DATE FIXTURES
     * ------------------------------------------------
     */

    const requestedDateFixtures = getFixturesOnRequestedDate(fixtures, request);

    console.log("AGENT REQUESTED DATE FIXTURES:", requestedDateFixtures.length);

    /*
     * ------------------------------------------------
     * 9. EXACT ELIGIBLE FIXTURES
     * ------------------------------------------------
     */

    let eligibleFixtures = filterFixtures(fixtures, request);

    let usedFallback = false;

    /*
     * ------------------------------------------------
     * 10. FALLBACK
     * ------------------------------------------------
     *
     * Only fallback if there are ZERO fixtures
     * on the requested date.
     *
     * If there are games today but none match
     * "tonight", do NOT silently switch to tomorrow.
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
     * ------------------------------------------------
     * 11. NO ELIGIBLE FIXTURES
     * ------------------------------------------------
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
     * ------------------------------------------------
     * 12. HISTORICAL MATCHES
     * ------------------------------------------------
     */

    const historyDate = usedFallback
      ? formatDate(new Date(eligibleFixtures[0].utcDate))
      : request.dateFrom;

    console.log("AGENT HISTORY REQUEST:", {
      dateTo: historyDate,
      historyDays: 30,
      fixtures: eligibleFixtures.length,
    });

    const historicalMatches = await discoverHistoricalMatches({
      fixtures: eligibleFixtures,

      dateTo: historyDate,

      historyDays: 30,
    });

    console.log("AGENT HISTORICAL MATCHES:", historicalMatches.length);

    /*
     * ------------------------------------------------
     * 13. LOAD CALIBRATION
     * ------------------------------------------------
     *
     * Calibration is loaded from Supabase.
     *
     * We do NOT run a backtest on every request.
     */

    console.log("AGENT LOADING CALIBRATION PROFILE...");

    let calibrationProfile = {};

    try {
      calibrationProfile = await loadCalibrationProfile();

      console.log("CALIBRATION LOADED:", {
        markets: Object.keys(calibrationProfile).length,
      });
    } catch (error) {
      console.error("CALIBRATION LOAD FAILED:", error.message);

      /*
       * Prediction continues using raw
       * probabilities when calibration is unavailable.
       */

      calibrationProfile = {};
    }

    /*
     * Optional calibration diagnostics.
     */

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
     * ------------------------------------------------
     * 14. RUN PREDICTIONS
     * ------------------------------------------------
     */

    const predictions = runPredictions({
      fixtures: eligibleFixtures,

      historicalMatches,

      minHistory: 5,
    });

    console.log("AGENT PREDICTIONS:", predictions.length);

    /*
     * ------------------------------------------------
     * 15. MARKET FILTER
     * ------------------------------------------------
     */

    const marketFiltered = filterMarkets(predictions, request.markets);

    /*
     * ------------------------------------------------
     * 16. MINIMUM PROBABILITY
     * ------------------------------------------------
     */

    const minProbability = getMinimumProbability(request.confidence);

    /*
     * ------------------------------------------------
     * 17. SELECT PICKS
     * ------------------------------------------------
     */

    const picks = selectPredictions({
      results: marketFiltered,

      limit: request.count,

      minProbability,

      calibrationProfile,
    });

    console.log("AGENT SELECTED PICKS:", picks.length);

    /*
     * ------------------------------------------------
     * 18. MARKET COUNT
     * ------------------------------------------------
     */

    const totalMarkets = marketFiltered.reduce(
      (total, result) => total + (result.prediction?.predictions || []).length,
      0
    );

    /*
     * ------------------------------------------------
     * 19. BUILD RESPONSE
     * ------------------------------------------------
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
     * ------------------------------------------------
     * 20. RESPONSE MESSAGE
     * ------------------------------------------------
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

    /*
     * ------------------------------------------------
     * 21. RETURN
     * ------------------------------------------------
     */

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
