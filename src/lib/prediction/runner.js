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

  if (fixtureTime <= Date.now()) {
    return false;
  }

  return match?.status === "SCHEDULED" || match?.status === "TIMED";
}

/*
 * ------------------------------------------------
 * BUILD HISTORY INDEX
 * ------------------------------------------------
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
     * HOME TEAM
     */
    if (homeTeamId != null) {
      const key = String(homeTeamId);

      if (!teamMatches.has(key)) {
        teamMatches.set(key, []);
      }

      teamMatches.get(key).push(match);
    }

    /*
     * AWAY TEAM
     */
    if (awayTeamId != null) {
      const key = String(awayTeamId);

      if (!teamMatches.has(key)) {
        teamMatches.set(key, []);
      }

      teamMatches.get(key).push(match);
    }

    /*
     * COMPETITION
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
   * Newest → oldest.
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
 *
 * Important:
 *
 * minHistory is a minimum research threshold,
 * not a requirement for perfect statistical history.
 *
 * A fixture with 3–4 previous matches can still be
 * researched and predicted. The research layer decides
 * which metrics are reliable enough to use.
 */

export function runPredictions({
  fixtures = [],
  historicalMatches = [],
  minHistory = 3,
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
   * Build history indexes once.
   */
  const { teamMatches, competitionMatches } =
    buildHistoryIndex(historicalMatches);

  let upcomingFixtures = 0;
  let insufficientHistory = 0;
  let predictionFailures = 0;

  for (const rawFixture of fixtures) {
    /*
     * Only scheduled future fixtures.
     */
    if (!isUpcoming(rawFixture)) {
      continue;
    }

    upcomingFixtures += 1;

    const fixture = normalizeFixture(rawFixture);

    if (!fixture?.homeTeam?.id || !fixture?.awayTeam?.id) {
      console.log("PREDICTION RUNNER: invalid fixture", {
        fixtureId: fixture?.id,
      });

      continue;
    }

    const fixtureTime = getMatchTime(fixture);

    if (!Number.isFinite(fixtureTime)) {
      console.log("PREDICTION RUNNER: invalid fixture time", {
        fixtureId: fixture.id,
        utcDate: fixture.utcDate,
      });

      continue;
    }

    /*
     * ------------------------------------------------
     * TEAM HISTORY
     * ------------------------------------------------
     */

    const homeMatches = getPreviousTeamMatches(
      teamMatches,
      fixture.homeTeam.id,
      fixtureTime
    );

    const awayMatches = getPreviousTeamMatches(
      teamMatches,
      fixture.awayTeam.id,
      fixtureTime
    );

    /*
     * ------------------------------------------------
     * LEAGUE HISTORY
     * ------------------------------------------------
     */

    const leagueMatches = getPreviousLeagueMatches(
      competitionMatches,
      fixture.competition?.id,
      fixtureTime
    );

    /*
     * ------------------------------------------------
     * DIAGNOSTIC
     * ------------------------------------------------
     */

    console.log("FIXTURE HISTORY:", {
      fixtureId: fixture.id,
      home: fixture.homeTeam?.name,
      away: fixture.awayTeam?.name,
      competition: fixture.competition?.name,
      homeMatches: homeMatches.length,
      awayMatches: awayMatches.length,
      leagueMatches: leagueMatches.length,
      required: minHistory,
    });

    /*
     * ------------------------------------------------
     * MINIMUM HISTORY
     * ------------------------------------------------
     *
     * We need at least a small sample for BOTH teams.
     *
     * Do NOT require five matches anymore.
     *
     * The research engine handles weighting and stronger
     * form calculations when more history is available.
     */

    if (homeMatches.length < minHistory || awayMatches.length < minHistory) {
      insufficientHistory += 1;

      console.log("INSUFFICIENT HISTORY:", {
        fixtureId: fixture.id,
        home: fixture.homeTeam?.name,
        away: fixture.awayTeam?.name,
        competition: fixture.competition?.name,
        homeMatches: homeMatches.length,
        awayMatches: awayMatches.length,
        required: minHistory,
        fixtureTime: fixture.utcDate,
      });

      continue;
    }

    /*
     * ------------------------------------------------
     * GENERATE PREDICTION
     * ------------------------------------------------
     */

    try {
      const prediction = predictFixture({
        fixture,
        homeMatches,
        awayMatches,
        leagueMatches,
      });

      if (!prediction) {
        console.log(`Prediction returned no result for fixture ${fixture.id}`);

        continue;
      }

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
