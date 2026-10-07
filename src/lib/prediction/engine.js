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

  /*
   * ----------------------------------------
   * LEAGUE BASELINE
   * ----------------------------------------
   */

  const leagueHomeGoals = league.averageHomeGoals || 1.4;

  const leagueAwayGoals = league.averageAwayGoals || 1.1;

  /*
   * ----------------------------------------
   * HOME ATTACK
   * ----------------------------------------
   */

  const homeVenueAttack = home.venue.goals.weightedAverageGoalsFor;

  const homeOverallAttack = home.overall.goals.weightedAverageGoalsFor;

  /*
   * Blend venue and overall data.
   *
   * If we only have a few home games,
   * overall form gets more influence.
   */

  const homeVenueMatches = home.venue.goals.matches;

  const homeVenueWeight = Math.min(homeVenueMatches / 8, 0.65);

  const homeAttack =
    homeVenueAttack * homeVenueWeight +
    homeOverallAttack * (1 - homeVenueWeight);

  /*
   * ----------------------------------------
   * HOME DEFENCE
   * ----------------------------------------
   */

  const homeVenueDefense = home.venue.goals.weightedAverageGoalsAgainst;

  const homeOverallDefense = home.overall.goals.weightedAverageGoalsAgainst;

  const homeDefense =
    homeVenueDefense * homeVenueWeight +
    homeOverallDefense * (1 - homeVenueWeight);

  /*
   * ----------------------------------------
   * AWAY ATTACK
   * ----------------------------------------
   */

  const awayVenueAttack = away.venue.goals.weightedAverageGoalsFor;

  const awayOverallAttack = away.overall.goals.weightedAverageGoalsFor;

  const awayVenueMatches = away.venue.goals.matches;

  const awayVenueWeight = Math.min(awayVenueMatches / 8, 0.65);

  const awayAttack =
    awayVenueAttack * awayVenueWeight +
    awayOverallAttack * (1 - awayVenueWeight);

  /*
   * ----------------------------------------
   * AWAY DEFENCE
   * ----------------------------------------
   */

  const awayVenueDefense = away.venue.goals.weightedAverageGoalsAgainst;

  const awayOverallDefense = away.overall.goals.weightedAverageGoalsAgainst;

  const awayDefense =
    awayVenueDefense * awayVenueWeight +
    awayOverallDefense * (1 - awayVenueWeight);

  /*
   * ----------------------------------------
   * ATTACK STRENGTH
   * ----------------------------------------
   */

  const homeAttackStrength =
    leagueHomeGoals > 0 ? homeAttack / leagueHomeGoals : 1;

  const awayAttackStrength =
    leagueAwayGoals > 0 ? awayAttack / leagueAwayGoals : 1;

  /*
   * ----------------------------------------
   * DEFENSIVE STRENGTH
   *
   * Higher concession rate means
   * weaker defence.
   * ----------------------------------------
   */

  const homeDefenseWeakness =
    leagueAwayGoals > 0 ? homeDefense / leagueAwayGoals : 1;

  const awayDefenseWeakness =
    leagueHomeGoals > 0 ? awayDefense / leagueHomeGoals : 1;

  /*
   * ----------------------------------------
   * EXPECTED GOALS
   * ----------------------------------------
   */

  let homeExpected = leagueHomeGoals * homeAttackStrength * awayDefenseWeakness;

  let awayExpected = leagueAwayGoals * awayAttackStrength * homeDefenseWeakness;

  /*
   * ----------------------------------------
   * RECENT FORM ADJUSTMENT
   *
   * Keep this deliberately small.
   * Form should influence the model,
   * not dominate it.
   * ----------------------------------------
   */

  const homeForm = home.overall.form;

  const awayForm = away.overall.form;

  if (homeForm.matches >= 5) {
    const formFactor = 0.95 + homeForm.winRate * 0.1;

    homeExpected *= formFactor;
  }

  if (awayForm.matches >= 5) {
    const formFactor = 0.95 + awayForm.winRate * 0.1;

    awayExpected *= formFactor;
  }

  /*
   * ----------------------------------------
   * HOME ADVANTAGE
   * ----------------------------------------
   */

  homeExpected *= 1.05;

  /*
   * ----------------------------------------
   * SAFETY LIMITS
   * ----------------------------------------
   */

  homeExpected = clamp(homeExpected, 0.15, 4);

  awayExpected = clamp(awayExpected, 0.15, 4);

  return {
    home: homeExpected,
    away: awayExpected,
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
