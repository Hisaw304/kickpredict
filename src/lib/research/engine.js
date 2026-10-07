import { getRecentForm } from "./form.js";
import { getGoalStats } from "./goals.js";
import { getHomeAwayStats } from "./homeAway.js";
import { calculateLeagueAverages } from "./league.js";

export function researchTeam({ matches = [], teamId, venue } = {}) {
  if (!teamId) {
    throw new Error("Team ID is required");
  }

  return {
    teamId,

    overall: {
      form: getRecentForm(matches, teamId, 10),

      goals: getGoalStats(matches, teamId, 10),
    },

    venue: getHomeAwayStats(matches, teamId, venue, 10),
  };
}

export function researchFixture({
  fixture,
  homeMatches = [],
  awayMatches = [],
  leagueMatches = [],
} = {}) {
  if (!fixture) {
    throw new Error("Fixture is required");
  }

  const homeTeamId = fixture.homeTeam?.id;

  const awayTeamId = fixture.awayTeam?.id;

  if (!homeTeamId || !awayTeamId) {
    throw new Error("Fixture must contain both team IDs");
  }

  return {
    fixtureId: fixture.id,

    league: calculateLeagueAverages(leagueMatches),

    home: researchTeam({
      matches: homeMatches,
      teamId: homeTeamId,
      venue: "home",
    }),

    away: researchTeam({
      matches: awayMatches,
      teamId: awayTeamId,
      venue: "away",
    }),
  };
}
