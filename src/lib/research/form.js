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

function getTeamResult(match, teamId) {
  const score = getScore(match);

  if (!score) {
    return null;
  }

  const isHome = match.homeTeam?.id === teamId;

  if (!isHome && match.awayTeam?.id !== teamId) {
    return null;
  }

  const goalsFor = isHome ? score.home : score.away;

  const goalsAgainst = isHome ? score.away : score.home;

  if (goalsFor > goalsAgainst) {
    return "W";
  }

  if (goalsFor === goalsAgainst) {
    return "D";
  }

  return "L";
}

function getRecencyWeight(index) {
  /*
   * Most recent match gets 1.0.
   *
   * Each older match receives a smaller weight.
   */
  return Math.pow(0.85, index);
}

export function getRecentForm(matches = [], teamId, limit = 10) {
  const completed = matches
    .filter((match) => match.status === "FINISHED")
    .filter(
      (match) => match.homeTeam?.id === teamId || match.awayTeam?.id === teamId
    )
    .filter((match) => getScore(match))
    .sort(
      (a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
    )
    .slice(0, limit);

  let wins = 0;
  let draws = 0;
  let losses = 0;

  let goalsFor = 0;
  let goalsAgainst = 0;

  let weightedGoalsFor = 0;
  let weightedGoalsAgainst = 0;

  let weightedPoints = 0;
  let totalWeight = 0;

  const results = [];

  for (let index = 0; index < completed.length; index++) {
    const match = completed[index];

    const score = getScore(match);

    const isHome = match.homeTeam?.id === teamId;

    const scored = isHome ? score.home : score.away;

    const conceded = isHome ? score.away : score.home;

    const result = getTeamResult(match, teamId);

    const weight = getRecencyWeight(index);

    let points = 0;

    if (result === "W") {
      wins++;
      points = 3;
    }

    if (result === "D") {
      draws++;
      points = 1;
    }

    if (result === "L") {
      losses++;
    }

    goalsFor += scored;
    goalsAgainst += conceded;

    weightedGoalsFor += scored * weight;

    weightedGoalsAgainst += conceded * weight;

    weightedPoints += points * weight;

    totalWeight += weight;

    results.push(result);
  }

  const count = completed.length;

  return {
    matches: count,

    results,

    form: results.join(""),

    wins,
    draws,
    losses,

    points: wins * 3 + draws,

    goalsFor,
    goalsAgainst,

    averageGoalsFor: count > 0 ? goalsFor / count : 0,

    averageGoalsAgainst: count > 0 ? goalsAgainst / count : 0,

    weightedAverageGoalsFor:
      totalWeight > 0 ? weightedGoalsFor / totalWeight : 0,

    weightedAverageGoalsAgainst:
      totalWeight > 0 ? weightedGoalsAgainst / totalWeight : 0,

    weightedPoints: totalWeight > 0 ? weightedPoints / totalWeight : 0,

    winRate: count > 0 ? wins / count : 0,

    drawRate: count > 0 ? draws / count : 0,

    lossRate: count > 0 ? losses / count : 0,
  };
}
