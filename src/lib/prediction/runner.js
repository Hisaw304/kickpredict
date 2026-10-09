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

  if (!Number.isFinite(fixtureTime) || fixtureTime <= Date.now()) {
    return false;
  }

  return ["SCHEDULED", "TIMED"].includes(
    String(match.status || "").toUpperCase()
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

  const diagnostics = {
    receivedFixtures: fixtures.length,
    upcomingFixtures: 0,
    skippedNotUpcoming: 0,
    skippedInsufficientHistory: 0,
    predictionFailures: 0,
    successfulPredictions: 0,
    minHistory,
    fixtures: [],
  };

  for (const rawFixture of fixtures) {
    const fixtureName =
      `${rawFixture.homeTeam?.name || "Unknown"} vs ` +
      `${rawFixture.awayTeam?.name || "Unknown"}`;

    if (!isUpcoming(rawFixture)) {
      diagnostics.skippedNotUpcoming++;

      diagnostics.fixtures.push({
        fixture: fixtureName,
        outcome: "SKIPPED_NOT_UPCOMING",
        status: rawFixture.status,
        utcDate: rawFixture.utcDate,
      });

      continue;
    }

    diagnostics.upcomingFixtures++;

    const fixture = normalizeFixture(rawFixture);
    const fixtureTime = getMatchTime(fixture);

    if (!Number.isFinite(fixtureTime)) {
      diagnostics.skippedNotUpcoming++;

      diagnostics.fixtures.push({
        fixture: fixtureName,
        outcome: "SKIPPED_INVALID_DATE",
        utcDate: fixture.utcDate,
      });

      continue;
    }

    const homeMatches = getPreviousTeamMatches(
      historicalMatches,
      fixture.homeTeam.id,
      fixtureTime
    );

    if (diagnostics.fixtures.length === 0) {
      console.log("HISTORY MATCHING DEBUG:", {
        fixture: {
          id: fixture.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          competition: fixture.competition,
          utcDate: fixture.utcDate,
        },
        historicalMatchSample: historicalMatches[0] ?? null,
        historicalMatchCount: historicalMatches.length,
        finishedMatchCount: historicalMatches.filter(isFinished).length,
      });
    }

    const awayMatches = getPreviousTeamMatches(
      historicalMatches,
      fixture.awayTeam.id,
      fixtureTime
    );

    const leagueMatches = getPreviousLeagueMatches(
      historicalMatches,
      fixture.competition.id,
      fixtureTime
    );

    if (homeMatches.length < minHistory || awayMatches.length < minHistory) {
      diagnostics.skippedInsufficientHistory++;

      diagnostics.fixtures.push({
        fixture: fixtureName,
        outcome: "SKIPPED_INSUFFICIENT_HISTORY",
        homeHistory: homeMatches.length,
        awayHistory: awayMatches.length,
        requiredHistory: minHistory,
        competition: fixture.competition?.name,
      });

      continue;
    }

    try {
      const prediction = predictFixture({
        fixture,
        homeMatches,
        awayMatches,
        leagueMatches,
      });

      if (!prediction) {
        diagnostics.predictionFailures++;

        diagnostics.fixtures.push({
          fixture: fixtureName,
          outcome: "EMPTY_PREDICTION",
        });

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

      diagnostics.successfulPredictions++;

      diagnostics.fixtures.push({
        fixture: fixtureName,
        outcome: "PREDICTED",
        homeHistory: homeMatches.length,
        awayHistory: awayMatches.length,
        competition: fixture.competition?.name,
      });
    } catch (error) {
      diagnostics.predictionFailures++;

      console.error(`Prediction failed for fixture ${fixture.id}:`, error);

      diagnostics.fixtures.push({
        fixture: fixtureName,
        outcome: "PREDICTION_ERROR",
        error: error.message,
      });
    }
  }

  console.log("RUN PREDICTIONS DIAGNOSTICS:", diagnostics);

  return results;
}
