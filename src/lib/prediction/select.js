import { calibrateProbability } from "./calibration.js";

const MIN_PROBABILITY = 65;

/*
 * Market reliability weights.
 *
 * These remain temporary starting weights.
 * Later we can derive these from actual
 * KickPredict backtest performance.
 */
const MARKET_WEIGHTS = {
  under_1_5: 0.94,
  under_2_5: 0.98,
  under_3_5: 1.0,

  over_1_5: 0.98,
  over_2_5: 0.94,
  over_3_5: 0.88,

  double_chance_1x: 0.99,
  double_chance_x2: 0.99,
  double_chance_12: 0.95,

  home_over_0_5: 0.97,
  away_over_0_5: 0.97,

  home_over_1_5: 0.9,
  away_over_1_5: 0.9,

  btts_yes: 0.91,
  btts_no: 0.94,

  home_win: 0.86,
  draw: 0.72,
  away_win: 0.86,
};

/*
 * Normalize research strength.
 *
 * More historical matches = more evidence,
 * but we cap the benefit so huge league samples
 * don't dominate everything.
 */
function getResearchScore(research = {}) {
  const homeMatches = Number(research.homeMatches || 0);

  const awayMatches = Number(research.awayMatches || 0);

  const leagueMatches = Number(research.leagueMatches || 0);

  const teamHistory = Math.min((homeMatches + awayMatches) / 20, 1);

  const leagueHistory = Math.min(leagueMatches / 80, 1);

  return teamHistory * 0.7 + leagueHistory * 0.3;
}

/*
 * Convert research strength into a small
 * quality adjustment.
 *
 * Probability remains much more important.
 */
function getResearchAdjustment(research) {
  const score = getResearchScore(research);

  return score * 3;
}

/*
 * Market reliability adjustment.
 */
function getMarketAdjustment(market) {
  const weight = MARKET_WEIGHTS[market] ?? 0.9;

  return (weight - 0.9) * 10;
}

/*
 * Probability remains the strongest factor.
 */
function getBaseScore(probability) {
  return probability;
}

/*
 * Give a small bonus to stronger
 * calibrated confidence levels.
 */
function getConfidenceAdjustment(confidence) {
  switch (confidence?.level) {
    case "very_high":
      return 1.5;

    case "high":
      return 0.75;

    case "medium":
      return 0;

    default:
      return -0.5;
  }
}

/*
 * Calibration evidence adjustment.
 *
 * This is intentionally small compared
 * with probability.
 *
 * The purpose is NOT to overpower the model.
 * It simply makes the selector prefer
 * probabilities supported by stronger
 * historical evidence.
 */
function getCalibrationReliabilityAdjustment(selection) {
  switch (selection.calibrationReliability) {
    case "strong":
      return 2.5;

    case "good":
      return 1.5;

    case "moderate":
      return 0.5;

    case "limited":
      return 0;

    case "uncalibrated":
      return -2.5;

    default:
      return -1.5;
  }
}

/*
 * Additional sample-size evidence.
 *
 * We deliberately keep this small.
 *
 * 20 samples should not be treated as
 * equivalent to 200 samples, but sample size
 * should also not dominate probability.
 */
function getCalibrationSampleAdjustment(selection) {
  const samples = Number(selection.calibrationSamples || 0);

  if (samples <= 0) {
    return 0;
  }

  if (samples >= 200) {
    return 1.5;
  }

  if (samples >= 100) {
    return 1.0;
  }

  if (samples >= 50) {
    return 0.6;
  }

  if (samples >= 30) {
    return 0.3;
  }

  if (samples >= 20) {
    return 0.15;
  }

  return 0;
}

/*
 * Penalize meaningful overconfidence.
 *
 * calibrationGap:
 *
 * positive  = historically better than model
 * negative  = historically worse than model
 *
 * We already adjust the probability itself,
 * so this is only a small ranking adjustment.
 */
function getCalibrationGapAdjustment(selection) {
  const gap = Number(selection.calibrationGap);

  if (!Number.isFinite(gap)) {
    return 0;
  }

  /*
   * Very small gaps are effectively noise.
   */
  if (gap >= -2) {
    return 0;
  }

  /*
   * Model is moderately overconfident.
   */
  if (gap >= -5) {
    return -0.25;
  }

  /*
   * Significant overconfidence.
   */
  if (gap >= -10) {
    return -0.75;
  }

  /*
   * Very significant overconfidence.
   */
  return -1.5;
}

/*
 * Calculate the initial quality score.
 */
function calculateQualityScore(selection) {
  const probability = Number(selection.probability);

  if (!Number.isFinite(probability)) {
    return -Infinity;
  }

  const base = getBaseScore(probability);

  const research = getResearchAdjustment(selection.research);

  const market = getMarketAdjustment(selection.market);

  const confidence = getConfidenceAdjustment(selection.confidence);

  const calibrationReliability = getCalibrationReliabilityAdjustment(selection);

  const calibrationSamples = getCalibrationSampleAdjustment(selection);

  const calibrationGap = getCalibrationGapAdjustment(selection);

  return (
    base +
    research +
    market +
    confidence +
    calibrationReliability +
    calibrationSamples +
    calibrationGap
  );
}

/*
 * Convert market into a broader category.
 *
 * This prevents the final selection from
 * becoming five versions of essentially
 * the same prediction type.
 */
function getMarketCategory(market) {
  if (!market) {
    return "unknown";
  }

  if (market.startsWith("under_")) {
    return "under";
  }

  if (market.startsWith("over_")) {
    return "over";
  }

  if (market.startsWith("double_chance")) {
    return "double_chance";
  }

  if (market.includes("btts")) {
    return "btts";
  }

  if (market.includes("win")) {
    return "result";
  }

  return market;
}

/*
 * Penalize candidates that are too similar
 * to selections already chosen.
 */
function getCorrelationPenalty(selection, selected) {
  let penalty = 0;

  const category = getMarketCategory(selection.market);

  for (const existing of selected) {
    /*
     * Same fixture should already be blocked,
     * but keep this protection here.
     */
    if (existing.fixture?.id === selection.fixture?.id) {
      penalty += 100;
      continue;
    }

    const existingCategory = getMarketCategory(existing.market);

    /*
     * Same market category.
     *
     * Example:
     *
     * Under 3.5
     * Under 2.5
     * Under 1.5
     */
    if (category === existingCategory) {
      penalty += 1.75;
    }

    /*
     * Exact same market receives
     * an additional penalty.
     */
    if (selection.market === existing.market) {
      penalty += 1.5;
    }

    /*
     * Same competition gets a small penalty.
     *
     * We don't ban multiple picks from
     * one competition.
     */
    if (
      selection.fixture?.competition?.code &&
      selection.fixture?.competition?.code ===
        existing.fixture?.competition?.code
    ) {
      penalty += 0.35;
    }
  }

  return penalty;
}

/*
 * Flatten prediction results into
 * individual market selections.
 */
function flattenMarkets(results, calibrationProfile = {}) {
  const selections = [];

  for (const result of results) {
    const markets = result.prediction?.predictions || [];

    for (const prediction of markets) {
      if (!Number.isFinite(prediction.probability)) {
        continue;
      }

      const calibration = calibrateProbability({
        probability: prediction.probability,

        market: prediction.market,

        profile: calibrationProfile,
      });

      const calibratedProbability =
        calibration.calibratedProbability ?? prediction.probability;

      /*
       * Confidence is based on the
       * probability actually being used.
       */
      let confidenceLevel = "low";

      if (calibratedProbability >= 85) {
        confidenceLevel = "very_high";
      } else if (calibratedProbability >= 75) {
        confidenceLevel = "high";
      } else if (calibratedProbability >= 65) {
        confidenceLevel = "medium";
      }

      const calibratedConfidence = {
        level: confidenceLevel,

        score: calibratedProbability,
      };

      const selection = {
        fixture: result.fixture,

        market: prediction.market,

        label: prediction.label,

        /*
         * Calibrated probability is now
         * the primary probability used
         * for filtering and ranking.
         */
        probability: calibratedProbability,

        rawProbability: calibration.rawProbability,

        calibratedProbability: calibration.calibratedProbability,

        calibrationAdjustment: calibration.calibrationAdjustment,

        calibrationReliability: calibration.reliability,

        calibrationSamples: calibration.calibrationSamples,

        observedRate: calibration.observedRate,

        calibrationGap: calibration.calibrationGap,

        confidence: calibratedConfidence,

        expectedGoals: result.prediction.expectedGoals,

        research: result.research,
      };

      /*
       * Calculate quality only after
       * calibration information has been
       * attached to the selection.
       */
      selection.qualityScore = calculateQualityScore(selection);

      selections.push(selection);
    }
  }

  return selections;
}

/*
 * Select the strongest combination
 * of probability + evidence + diversity.
 */
export function selectPredictions({
  results = [],
  limit = 5,
  minProbability = MIN_PROBABILITY,
  calibrationProfile = {},
} = {}) {
  const markets = flattenMarkets(results, calibrationProfile);

  /*
   * First remove weak predictions.
   */
  const eligible = markets.filter(
    (selection) => selection.probability >= minProbability
  );

  /*
   * If nothing qualifies,
   * return nothing.
   */
  if (!eligible.length) {
    return [];
  }

  /*
   * We don't simply sort once and
   * take the first N.
   *
   * The score changes after every
   * selected pick because correlation
   * penalties change.
   */
  const remaining = [...eligible];

  const selected = [];

  const usedFixtures = new Set();

  while (selected.length < limit && remaining.length) {
    let bestIndex = -1;

    let bestScore = -Infinity;

    for (let index = 0; index < remaining.length; index++) {
      const selection = remaining[index];

      const fixtureId = selection.fixture?.id;

      /*
       * Only one prediction
       * per fixture.
       */
      if (!fixtureId || usedFixtures.has(fixtureId)) {
        continue;
      }

      const correlationPenalty = getCorrelationPenalty(selection, selected);

      const finalScore = selection.qualityScore - correlationPenalty;

      if (finalScore > bestScore) {
        bestScore = finalScore;

        bestIndex = index;
      }
    }

    /*
     * Nothing else can be selected.
     */
    if (bestIndex === -1) {
      break;
    }

    const winner = remaining[bestIndex];

    selected.push({
      fixture: winner.fixture,

      market: winner.market,

      label: winner.label,

      probability: winner.probability,

      rawProbability: winner.rawProbability,

      calibratedProbability: winner.calibratedProbability,

      calibrationAdjustment: winner.calibrationAdjustment,

      calibrationReliability: winner.calibrationReliability,

      calibrationSamples: winner.calibrationSamples,

      observedRate: winner.observedRate,

      calibrationGap: winner.calibrationGap,

      confidence: winner.confidence,

      expectedGoals: winner.expectedGoals,

      research: winner.research,
    });

    usedFixtures.add(winner.fixture.id);

    remaining.splice(bestIndex, 1);
  }

  /*
   * Return final selections ordered
   * by calibrated probability for the
   * API/frontend.
   */
  return selected.sort((a, b) => b.probability - a.probability);
}
