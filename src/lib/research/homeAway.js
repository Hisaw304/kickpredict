import { getRecentForm } from "./form.js";
import { getGoalStats } from "./goals.js";

export function getHomeAwayStats(matches = [], teamId, venue, limit = 10) {
  const filtered = matches.filter((match) => {
    if (match.status !== "FINISHED") {
      return false;
    }

    if (venue === "home") {
      return match.homeTeam?.id === teamId;
    }

    if (venue === "away") {
      return match.awayTeam?.id === teamId;
    }

    return false;
  });

  return {
    venue,

    form: getRecentForm(filtered, teamId, limit),

    goals: getGoalStats(filtered, teamId, limit),
  };
}
