function getScore(match) {
  const home = match.score?.fullTime?.home;
  const away = match.score?.fullTime?.away;

  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return null;
  }

  return {
    home,
    away,
  };
}

export function calculateLeagueAverages(matches = []) {
  const completed = matches.filter(
    (match) => match.status === "FINISHED" && getScore(match)
  );

  if (!completed.length) {
    return {
      matches: 0,

      homeGoals: 0,
      awayGoals: 0,
      totalGoals: 0,

      averageHomeGoals: 0,
      averageAwayGoals: 0,
      averageTotalGoals: 0,
    };
  }

  let homeGoals = 0;
  let awayGoals = 0;

  for (const match of completed) {
    const score = getScore(match);

    homeGoals += score.home;
    awayGoals += score.away;
  }

  const count = completed.length;

  return {
    matches: count,

    homeGoals,
    awayGoals,

    totalGoals: homeGoals + awayGoals,

    averageHomeGoals: homeGoals / count,

    averageAwayGoals: awayGoals / count,

    averageTotalGoals: (homeGoals + awayGoals) / count,
  };
}
