import { getRecentForm } from "./form.js";
import { getGoalStats } from "./goals.js";
import { getHomeAwayStats } from "./homeAway.js";
import { calculateLeagueAverages } from "./league.js";

function getMatchDate(match) {
  return match.utcDate || match.date || null;
}

function getTeamName(match, side) {
  return (
    match[`${side}Team`]?.name || match[`${side}Team`]?.shortName || "Unknown"
  );
}

function getTeamScore(match, side) {
  const score = match.score?.fullTime;

  if (!score) return null;

  return score[side] ?? null;
}

function getTeamVenue(match, teamId) {
  if (String(match.homeTeam?.id) === String(teamId)) {
    return "home";
  }

  if (String(match.awayTeam?.id) === String(teamId)) {
    return "away";
  }

  return null;
}

function getTeamMatches(matches, teamId, venue) {
  return matches
    .filter((match) => {
      const isHome = String(match.homeTeam?.id) === String(teamId);

      const isAway = String(match.awayTeam?.id) === String(teamId);

      if (!isHome && !isAway) return false;

      if (venue === "home" && !isHome) return false;
      if (venue === "away" && !isAway) return false;

      return true;
    })
    .sort(
      (a, b) =>
        new Date(getMatchDate(b) || 0).getTime() -
        new Date(getMatchDate(a) || 0).getTime()
    )
    .slice(0, 10)
    .map((match) => ({
      id: match.id,
      date: getMatchDate(match),
      homeTeam: getTeamName(match, "home"),
      awayTeam: getTeamName(match, "away"),
      homeScore: getTeamScore(match, "home"),
      awayScore: getTeamScore(match, "away"),
      venue: getTeamVenue(match, teamId),
      competition: match.competition?.name || null,
      status: match.status || null,
    }));
}

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

    matches: getTeamMatches(matches, teamId, venue),
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
