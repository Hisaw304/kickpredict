import { MARKETS, MARKET_LABELS } from "./markets.js";
import { calculateMatchProbabilities } from "./poisson.js";
import { researchFixture } from "../research/engine.js";
import { getConfidence } from "./confidence.js";

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function round(value) {
  return Number(value.toFixed(1));
}

/*
 * Calculate expected goals from:
 *
 * - Home attacking output
 * - Home defensive output
 * - Away attacking output
 * - Away defensive output
 * - Recent form
 * - Small home advantage
 */

function calculateExpectedGoals(research) {
  const home = research.home;
  const away = research.away;
  const league = research.league;

  const finiteOr = (value, fallback) =>
    Number.isFinite(Number(value)) && value !== null && value !== ""
      ? Number(value)
      : fallback;

  const clampRate = (value, min = 0.15, max = 3.5) =>
    Math.min(Math.max(value, min), max);

  const leagueHomeGoals = Math.max(
    0.5,
    finiteOr(league?.averageHomeGoals, 1.4)
  );

  const leagueAwayGoals = Math.max(
    0.5,
    finiteOr(league?.averageAwayGoals, 1.1)
  );

  function getGoalsStats(team, side) {
    const venue = team?.venue?.goals ?? {};
    const overall = team?.overall?.goals ?? {};

    const venueAttack = Math.max(
      0,
      finiteOr(venue.weightedAverageGoalsFor, NaN)
    );

    const overallAttack = Math.max(
      0,
      finiteOr(overall.weightedAverageGoalsFor, NaN)
    );

    const venueDefense = Math.max(
      0,
      finiteOr(venue.weightedAverageGoalsAgainst, NaN)
    );

    const overallDefense = Math.max(
      0,
      finiteOr(overall.weightedAverageGoalsAgainst, NaN)
    );

    const venueMatches = Math.max(0, finiteOr(venue.matches, 0));

    const overallMatches = Math.max(0, finiteOr(overall.matches, 0));

    const leagueAttack = side === "home" ? leagueHomeGoals : leagueAwayGoals;

    // Defensive baseline is the typical opponent scoring rate.
    const leagueDefense = side === "home" ? leagueAwayGoals : leagueHomeGoals;

    // Give venue-specific performance influence gradually.
    const venueWeight = Math.min(venueMatches / 8, 0.65);

    const blendedAttack =
      Number.isFinite(venueAttack) && Number.isFinite(overallAttack)
        ? venueAttack * venueWeight + overallAttack * (1 - venueWeight)
        : Number.isFinite(overallAttack)
        ? overallAttack
        : Number.isFinite(venueAttack)
        ? venueAttack
        : leagueAttack;

    const blendedDefense =
      Number.isFinite(venueDefense) && Number.isFinite(overallDefense)
        ? venueDefense * venueWeight + overallDefense * (1 - venueWeight)
        : Number.isFinite(overallDefense)
        ? overallDefense
        : Number.isFinite(venueDefense)
        ? venueDefense
        : leagueDefense;

    /*
     * Shrink observed rates toward the league baseline.
     *
     * Five matches provide some evidence, but not enough
     * to trust extreme averages without moderation.
     */
    const effectiveMatches = Math.max(overallMatches, venueMatches);
    const reliability = effectiveMatches / (effectiveMatches + 6);

    const attack = leagueAttack + (blendedAttack - leagueAttack) * reliability;

    const defense =
      leagueDefense + (blendedDefense - leagueDefense) * reliability;

    return {
      attack: Math.max(0, attack),
      defense: Math.max(0, defense),
      form: team?.overall?.form,
    };
  }

  const homeStats = getGoalsStats(home, "home");
  const awayStats = getGoalsStats(away, "away");

  /*
   * Expected home goals:
   * league home scoring rate × home attack strength
   * × away defensive weakness.
   */
  let homeExpected =
    leagueHomeGoals *
    (homeStats.attack / leagueHomeGoals) *
    (awayStats.defense / leagueHomeGoals);

  /*
   * Expected away goals:
   * league away scoring rate × away attack strength
   * × home defensive weakness.
   */
  let awayExpected =
    leagueAwayGoals *
    (awayStats.attack / leagueAwayGoals) *
    (homeStats.defense / leagueAwayGoals);

  /*
   * Small recent-form adjustment.
   * Form is optional and should not dominate the goal model.
   */
  const homeFormMatches = finiteOr(homeStats.form?.matches, 0);
  const awayFormMatches = finiteOr(awayStats.form?.matches, 0);

  const homeWinRate = Math.min(
    1,
    Math.max(0, finiteOr(homeStats.form?.winRate, 0.33))
  );

  const awayWinRate = Math.min(
    1,
    Math.max(0, finiteOr(awayStats.form?.winRate, 0.33))
  );

  if (homeFormMatches >= 5) {
    homeExpected *= 0.97 + homeWinRate * 0.06;
  }

  if (awayFormMatches >= 5) {
    awayExpected *= 0.97 + awayWinRate * 0.06;
  }

  // Modest home advantage.
  homeExpected *= 1.04;

  return {
    home: clampRate(homeExpected),
    away: clampRate(awayExpected),
  };
}
/*
 * Convert a probability into the
 * public prediction format.
 */
function createPrediction(market, probability) {
  const score = round(clamp(probability * 100));

  return {
    market,
    label: MARKET_LABELS[market],
    probability: score,
    confidence: getConfidence(score),
  };
}

export function predictFixture({
  fixture,
  homeMatches = [],
  awayMatches = [],
  leagueMatches = [],
} = {}) {
  if (!fixture) {
    throw new Error("Fixture is required");
  }

  /*
   * ----------------------------------------
   * 1. RESEARCH
   * ----------------------------------------
   */

  const research = researchFixture({
    fixture,
    homeMatches,
    awayMatches,
    leagueMatches,
  });

  /*
   * ----------------------------------------
   * 2. EXPECTED GOALS
   * ----------------------------------------
   */

  const expectedGoals = calculateExpectedGoals(research);

  /*
   * ----------------------------------------
   * 3. POISSON PROBABILITIES
   * ----------------------------------------
   */

  const probabilities = calculateMatchProbabilities(
    expectedGoals.home,
    expectedGoals.away
  );

  /*
   * ----------------------------------------
   * 4. DOUBLE CHANCE
   * ----------------------------------------
   *
   * 1X = Home Win + Draw
   * X2 = Draw + Away Win
   * 12 = Home Win + Away Win
   */

  const doubleChance = {
    oneX: probabilities.homeWin + probabilities.draw,

    xTwo: probabilities.draw + probabilities.awayWin,

    oneTwo: probabilities.homeWin + probabilities.awayWin,
  };

  /*
   * ----------------------------------------
   * 5. MARKETS
   * ----------------------------------------
   */

  const predictions = [
    /*
     * RESULT
     */

    createPrediction(MARKETS.HOME_WIN, probabilities.homeWin),

    createPrediction(MARKETS.DRAW, probabilities.draw),

    createPrediction(MARKETS.AWAY_WIN, probabilities.awayWin),

    /*
     * DOUBLE CHANCE
     */

    createPrediction(MARKETS.DOUBLE_CHANCE_1X, doubleChance.oneX),

    createPrediction(MARKETS.DOUBLE_CHANCE_X2, doubleChance.xTwo),

    createPrediction(MARKETS.DOUBLE_CHANCE_12, doubleChance.oneTwo),

    /*
     * TOTAL GOALS
     */

    createPrediction(MARKETS.OVER_1_5, probabilities.over15),

    createPrediction(MARKETS.OVER_2_5, probabilities.over25),

    createPrediction(MARKETS.OVER_3_5, probabilities.over35),

    createPrediction(MARKETS.UNDER_1_5, probabilities.under15),

    createPrediction(MARKETS.UNDER_2_5, probabilities.under25),

    createPrediction(MARKETS.UNDER_3_5, probabilities.under35),

    /*
     * BOTH TEAMS TO SCORE
     */

    createPrediction(MARKETS.BTTS_YES, probabilities.bttsYes),

    createPrediction(MARKETS.BTTS_NO, probabilities.bttsNo),

    /*
     * HOME TEAM GOALS
     */

    createPrediction(MARKETS.HOME_OVER_0_5, probabilities.homeOver05),

    createPrediction(MARKETS.HOME_OVER_1_5, probabilities.homeOver15),

    /*
     * AWAY TEAM GOALS
     */

    createPrediction(MARKETS.AWAY_OVER_0_5, probabilities.awayOver05),

    createPrediction(MARKETS.AWAY_OVER_1_5, probabilities.awayOver15),
  ];

  /*
   * ----------------------------------------
   * 6. RETURN COMPLETE PREDICTION
   * ----------------------------------------
   */

  return {
    fixtureId: fixture.id,

    homeTeam: fixture.homeTeam,

    awayTeam: fixture.awayTeam,

    expectedGoals: {
      home: round(expectedGoals.home),
      away: round(expectedGoals.away),
      total: round(expectedGoals.home + expectedGoals.away),
    },

    predictions,

    research,
  };
}
