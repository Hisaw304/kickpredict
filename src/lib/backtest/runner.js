import { predictFixture } from "../prediction/engine.js";
import { normalizeFixture } from "../football/normalise.js";
import { evaluateFixture } from "./evaluator.js";

function getMatchTime(match) {
  return new Date(match.utcDate).getTime();
}

function isFinished(match) {
  return (
    match.status === "FINISHED" &&
    Number.isFinite(match.score?.fullTime?.home) &&
    Number.isFinite(match.score?.fullTime?.away)
  );
}

function getPreviousMatches(matches, teamId, fixtureTime) {
  return matches
    .filter(isFinished)
    .filter(
      (match) => match.homeTeam?.id === teamId || match.awayTeam?.id === teamId
    )
    .filter((match) => getMatchTime(match) < fixtureTime)
    .sort((a, b) => getMatchTime(b) - getMatchTime(a));
}

function getPreviousLeagueMatches(matches, competitionId, fixtureTime) {
  return matches
    .filter(isFinished)
    .filter((match) => match.competition?.id === competitionId)
    .filter((match) => getMatchTime(match) < fixtureTime)
    .sort((a, b) => getMatchTime(b) - getMatchTime(a));
}

export function runBacktest({ matches = [], minHistory = 3, limit } = {}) {
  /*
   * Only completed matches can be
   * used for backtesting.
   */
  const finishedMatches = matches
    .filter(isFinished)
    .sort((a, b) => getMatchTime(a) - getMatchTime(b));

  /*
   * Test the most recent N finished
   * fixtures when a limit is supplied.
   *
   * IMPORTANT:
   * We still keep ALL finishedMatches
   * available as historical context.
   */
  const fixturesToTest =
    Number.isFinite(limit) && limit > 0
      ? finishedMatches.slice(-limit)
      : finishedMatches;

  const results = [];

  let skippedInsufficientHistory = 0;
  let skippedPredictionErrors = 0;

  for (const rawFixture of fixturesToTest) {
    const fixtureTime = getMatchTime(rawFixture);

    if (!Number.isFinite(fixtureTime)) {
      continue;
    }

    const fixture = normalizeFixture(rawFixture);

    /*
     * IMPORTANT:
     *
     * Historical matches are always
     * filtered to BEFORE the fixture.
     *
     * This prevents future information
     * from leaking into the prediction.
     */
    const homeMatches = getPreviousMatches(
      finishedMatches,
      fixture.homeTeam.id,
      fixtureTime
    );

    const awayMatches = getPreviousMatches(
      finishedMatches,
      fixture.awayTeam.id,
      fixtureTime
    );

    const leagueMatches = getPreviousLeagueMatches(
      finishedMatches,
      fixture.competition.id,
      fixtureTime
    );

    /*
     * Require enough history for
     * both teams.
     */
    if (homeMatches.length < minHistory || awayMatches.length < minHistory) {
      skippedInsufficientHistory++;

      continue;
    }

    let prediction;

    try {
      prediction = predictFixture({
        fixture,

        homeMatches,

        awayMatches,

        leagueMatches,
      });
    } catch (error) {
      skippedPredictionErrors++;

      console.error(`Backtest prediction failed for fixture ${fixture.id}:`, {
        message: error.message,
        stack: error.stack,
      });

      continue;
    }

    let evaluation;

    try {
      evaluation = evaluateFixture({
        prediction,
        fixture,
      });
    } catch (error) {
      skippedPredictionErrors++;

      console.error(`Backtest evaluation failed for fixture ${fixture.id}:`, {
        message: error.message,
        stack: error.stack,
      });

      continue;
    }

    if (!evaluation) {
      skippedPredictionErrors++;

      continue;
    }

    results.push({
      fixture: {
        id: fixture.id,

        utcDate: fixture.utcDate,

        competition: fixture.competition,

        homeTeam: fixture.homeTeam,

        awayTeam: fixture.awayTeam,

        score: fixture.score,
      },

      history: {
        homeMatches: homeMatches.length,

        awayMatches: awayMatches.length,

        leagueMatches: leagueMatches.length,
      },

      prediction,

      evaluation,
    });
  }

  console.log("BACKTEST COMPLETE:", {
    availableFinishedMatches: finishedMatches.length,

    requestedFixtures: fixturesToTest.length,

    testedFixtures: results.length,

    skippedInsufficientHistory,

    skippedPredictionErrors,

    minHistory,
    limit,
  });

  return results;
}
