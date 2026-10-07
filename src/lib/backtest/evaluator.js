import { calculateBrierScore, calculateLogLoss } from "./metrics.js";

function getActualOutcome(market, fixture) {
  const homeGoals = fixture.score?.home;
  const awayGoals = fixture.score?.away;

  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) {
    return null;
  }

  switch (market) {
    case "home_win":
      return homeGoals > awayGoals ? 1 : 0;

    case "draw":
      return homeGoals === awayGoals ? 1 : 0;

    case "away_win":
      return awayGoals > homeGoals ? 1 : 0;

    case "double_chance_1x":
      return homeGoals >= awayGoals ? 1 : 0;

    case "double_chance_x2":
      return awayGoals >= homeGoals ? 1 : 0;

    case "double_chance_12":
      return homeGoals !== awayGoals ? 1 : 0;

    case "over_1_5":
      return homeGoals + awayGoals > 1.5 ? 1 : 0;

    case "over_2_5":
      return homeGoals + awayGoals > 2.5 ? 1 : 0;

    case "over_3_5":
      return homeGoals + awayGoals > 3.5 ? 1 : 0;

    case "under_1_5":
      return homeGoals + awayGoals < 1.5 ? 1 : 0;

    case "under_2_5":
      return homeGoals + awayGoals < 2.5 ? 1 : 0;

    case "under_3_5":
      return homeGoals + awayGoals < 3.5 ? 1 : 0;

    case "btts_yes":
      return homeGoals > 0 && awayGoals > 0 ? 1 : 0;

    case "btts_no":
      return homeGoals === 0 || awayGoals === 0 ? 1 : 0;

    case "home_over_0_5":
      return homeGoals > 0 ? 1 : 0;

    case "home_over_1_5":
      return homeGoals > 1.5 ? 1 : 0;

    case "away_over_0_5":
      return awayGoals > 0 ? 1 : 0;

    case "away_over_1_5":
      return awayGoals > 1.5 ? 1 : 0;

    default:
      return null;
  }
}

export function evaluatePrediction({ prediction, fixture } = {}) {
  if (!prediction) {
    throw new Error("Prediction is required");
  }

  if (!fixture) {
    throw new Error("Fixture is required");
  }

  const actualOutcome = getActualOutcome(prediction.market, fixture);

  if (actualOutcome === null) {
    return null;
  }

  const probability = prediction.probability / 100;

  return {
    market: prediction.market,
    label: prediction.label,

    predictedProbability: prediction.probability,

    actualOutcome,

    correct: probability >= 0.5 ? actualOutcome === 1 : actualOutcome === 0,

    brierScore: calculateBrierScore(probability, actualOutcome),

    logLoss: calculateLogLoss(probability, actualOutcome),
  };
}

export function evaluateFixture({ prediction, fixture } = {}) {
  if (!prediction || !fixture) {
    throw new Error("Prediction and fixture are required");
  }

  const markets = prediction.predictions || [];

  const evaluatedMarkets = markets
    .map((marketPrediction) =>
      evaluatePrediction({
        prediction: marketPrediction,
        fixture,
      })
    )
    .filter(Boolean);

  return {
    fixtureId: fixture.id,

    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,

    actualScore: {
      home: fixture.score?.home,
      away: fixture.score?.away,
    },

    expectedGoals: prediction.expectedGoals,

    markets: evaluatedMarkets,
  };
}
