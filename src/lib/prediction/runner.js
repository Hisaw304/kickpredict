import { normalizeFixture } from "../football/normalise.js";
import { predictFixture } from "./engine.js";

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

function isUpcoming(match) {
  const fixtureTime = getMatchTime(match);

  if (!Number.isFinite(fixtureTime)) {
    return false;
  }

  /*
   * Only generate tips for matches that have
   * not started yet.
   */
  return (
    fixtureTime > Date.now() &&
    (match.status === "SCHEDULED" || match.status === "TIMED")
  );
}

function getPreviousTeamMatches(matches, teamId, fixtureTime) {
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

export function runPredictions({
  fixtures = [],
  historicalMatches = [],
  minHistory = 5,
} = {}) {
  const results = [];

  for (const rawFixture of fixtures) {
    /*
     * Important:
     * The tips system must never generate a prediction
     * for a finished or already-started fixture.
     */
    if (!isUpcoming(rawFixture)) {
      continue;
    }

    const fixture = normalizeFixture(rawFixture);

    const fixtureTime = getMatchTime(fixture);

    if (!Number.isFinite(fixtureTime)) {
      continue;
    }

    /*
     * Previous matches for the home team.
     */
    const homeMatches = getPreviousTeamMatches(
      historicalMatches,
      fixture.homeTeam.id,
      fixtureTime
    );

    /*
     * Previous matches for the away team.
     */
    const awayMatches = getPreviousTeamMatches(
      historicalMatches,
      fixture.awayTeam.id,
      fixtureTime
    );

    /*
     * Previous matches from the same competition.
     */
    const leagueMatches = getPreviousLeagueMatches(
      historicalMatches,
      fixture.competition.id,
      fixtureTime
    );

    /*
     * Don't predict fixtures where either team
     * doesn't have enough historical data.
     */
    if (homeMatches.length < minHistory || awayMatches.length < minHistory) {
      continue;
    }

    try {
      const prediction = predictFixture({
        fixture,
        homeMatches,
        awayMatches,
        leagueMatches,
      });

      results.push({
        fixture: {
          id: fixture.id,

          utcDate: fixture.utcDate,

          status: fixture.status,

          competition: fixture.competition,

          homeTeam: fixture.homeTeam,

          awayTeam: fixture.awayTeam,
        },

        research: {
          homeMatches: homeMatches.length,

          awayMatches: awayMatches.length,

          leagueMatches: leagueMatches.length,
        },

        prediction,
      });
    } catch (error) {
      console.error(`Prediction failed for fixture ${fixture.id}:`, error);
    }
  }

  return results;
}
