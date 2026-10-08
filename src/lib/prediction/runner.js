import { normalizeFixture } from "../football/normalise.js";
import { predictFixture } from "./engine.js";

function getMatchTime(match) {
  const time = new Date(match?.utcDate).getTime();

  return Number.isFinite(time) ? time : NaN;
}

function isFinished(match) {
  return (
    match?.status === "FINISHED" &&
    Number.isFinite(match?.score?.fullTime?.home) &&
    Number.isFinite(match?.score?.fullTime?.away)
  );
}

function isUpcoming(match) {
  const fixtureTime = getMatchTime(match);

  if (!Number.isFinite(fixtureTime)) {
    return false;
  }

  /*
   * Never predict matches that have already started.
   */
  if (fixtureTime <= Date.now()) {
    return false;
  }

  return match?.status === "SCHEDULED" || match?.status === "TIMED";
}

/*
 * ------------------------------------------------
 * BUILD HISTORY INDEX
 * ------------------------------------------------
 *
 * Instead of repeatedly doing:
 *
 * matches.filter(...).filter(...).sort(...)
 *
 * for every fixture, we build indexes once.
 */
function buildHistoryIndex(matches = []) {
  const teamMatches = new Map();
  const competitionMatches = new Map();

  for (const match of matches) {
    if (!isFinished(match)) {
      continue;
    }

    const matchTime = getMatchTime(match);

    if (!Number.isFinite(matchTime)) {
      continue;
    }

    const homeTeamId = match.homeTeam?.id;
    const awayTeamId = match.awayTeam?.id;
    const competitionId = match.competition?.id;

    /*
     * Index by home team.
     */
    if (homeTeamId != null) {
      const key = String(homeTeamId);

      if (!teamMatches.has(key)) {
        teamMatches.set(key, []);
      }

      teamMatches.get(key).push(match);
    }

    /*
     * Index by away team.
     */
    if (awayTeamId != null) {
      const key = String(awayTeamId);

      if (!teamMatches.has(key)) {
        teamMatches.set(key, []);
      }

      teamMatches.get(key).push(match);
    }

    /*
     * Index by competition.
     */
    if (competitionId != null) {
      const key = String(competitionId);

      if (!competitionMatches.has(key)) {
        competitionMatches.set(key, []);
      }

      competitionMatches.get(key).push(match);
    }
  }

  /*
   * Sort each list newest → oldest once.
   */
  for (const matchesForTeam of teamMatches.values()) {
    matchesForTeam.sort((a, b) => getMatchTime(b) - getMatchTime(a));
  }

  for (const matchesForCompetition of competitionMatches.values()) {
    matchesForCompetition.sort((a, b) => getMatchTime(b) - getMatchTime(a));
  }

  return {
    teamMatches,
    competitionMatches,
  };
}

/*
 * ------------------------------------------------
 * GET PREVIOUS TEAM MATCHES
 * ------------------------------------------------
 */
function getPreviousTeamMatches(teamMatches, teamId, fixtureTime) {
  if (teamId == null) {
    return [];
  }

  const matches = teamMatches.get(String(teamId)) || [];

  /*
   * Lists are already sorted newest → oldest.
   *
   * Stop as soon as we reach a match that is
   * not before the fixture.
   */
  return matches.filter((match) => getMatchTime(match) < fixtureTime);
}

/*
 * ------------------------------------------------
 * GET PREVIOUS LEAGUE MATCHES
 * ------------------------------------------------
 */
function getPreviousLeagueMatches(
  competitionMatches,
  competitionId,
  fixtureTime
) {
  if (competitionId == null) {
    return [];
  }

  const matches = competitionMatches.get(String(competitionId)) || [];

  return matches.filter((match) => getMatchTime(match) < fixtureTime);
}

/*
 * ------------------------------------------------
 * RUN PREDICTIONS
 * ------------------------------------------------
 */
export function runPredictions({
  fixtures = [],
  historicalMatches = [],
  minHistory = 5,
} = {}) {
  const results = [];

  if (!fixtures.length) {
    console.log("PREDICTION RUNNER: no fixtures supplied");

    return results;
  }

  console.log("PREDICTION RUNNER START:", {
    fixtures: fixtures.length,
    historicalMatches: historicalMatches.length,
    minHistory,
  });

  /*
   * Build once.
   */
  const { teamMatches, competitionMatches } =
    buildHistoryIndex(historicalMatches);

  let upcomingFixtures = 0;
  let insufficientHistory = 0;
  let predictionFailures = 0;

  for (const rawFixture of fixtures) {
    /*
     * Never generate predictions for a fixture
     * that has already started or finished.
     */
    if (!isUpcoming(rawFixture)) {
      continue;
    }

    upcomingFixtures += 1;

    const fixture = normalizeFixture(rawFixture);

    if (!fixture?.homeTeam?.id || !fixture?.awayTeam?.id) {
      continue;
    }

    const fixtureTime = getMatchTime(fixture);

    if (!Number.isFinite(fixtureTime)) {
      continue;
    }

    /*
     * Historical matches for home team.
     */
    const homeMatches = getPreviousTeamMatches(
      teamMatches,
      fixture.homeTeam.id,
      fixtureTime
    );

    /*
     * Historical matches for away team.
     */
    const awayMatches = getPreviousTeamMatches(
      teamMatches,
      fixture.awayTeam.id,
      fixtureTime
    );

    /*
     * Historical matches from the same
     * competition.
     */
    const leagueMatches = getPreviousLeagueMatches(
      competitionMatches,
      fixture.competition?.id,
      fixtureTime
    );

    /*
     * Require enough history for BOTH teams.
     */
    if (homeMatches.length < minHistory || awayMatches.length < minHistory) {
      insufficientHistory += 1;

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
      predictionFailures += 1;

      console.error(`Prediction failed for fixture ${fixture.id}:`, error);
    }
  }

  console.log("PREDICTION RUNNER COMPLETE:", {
    fixturesReceived: fixtures.length,
    upcomingFixtures,
    predictedFixtures: results.length,
    insufficientHistory,
    predictionFailures,
    historicalMatches: historicalMatches.length,
  });

  return results;
}
