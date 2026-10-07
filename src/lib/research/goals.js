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

function getRecencyWeight(index) {
  return Math.pow(0.85, index);
}

export function getGoalStats(matches = [], teamId, limit = 10) {
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

  let over05 = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;

  let under15 = 0;
  let under25 = 0;
  let under35 = 0;

  let bttsYes = 0;

  let goalsFor = 0;
  let goalsAgainst = 0;

  let weightedGoalsFor = 0;
  let weightedGoalsAgainst = 0;

  let weightedOver15 = 0;
  let weightedOver25 = 0;
  let weightedBTTS = 0;

  let totalWeight = 0;

  for (let index = 0; index < completed.length; index++) {
    const match = completed[index];

    const score = getScore(match);

    const isHome = match.homeTeam?.id === teamId;

    const scored = isHome ? score.home : score.away;

    const conceded = isHome ? score.away : score.home;

    const total = score.home + score.away;

    const weight = getRecencyWeight(index);

    goalsFor += scored;
    goalsAgainst += conceded;

    weightedGoalsFor += scored * weight;

    weightedGoalsAgainst += conceded * weight;

    if (total >= 1) {
      over05++;
    }

    if (total >= 2) {
      over15++;
      weightedOver15 += weight;
    }

    if (total >= 3) {
      over25++;
      weightedOver25 += weight;
    }

    if (total >= 4) {
      over35++;
    }

    if (total < 2) {
      under15++;
    }

    if (total < 3) {
      under25++;
    }

    if (total < 4) {
      under35++;
    }

    if (score.home > 0 && score.away > 0) {
      bttsYes++;
      weightedBTTS += weight;
    }

    totalWeight += weight;
  }

  const count = completed.length;

  const rate = (value) => (count > 0 ? value / count : 0);

  const weightedRate = (value) => (totalWeight > 0 ? value / totalWeight : 0);

  return {
    matches: count,

    goalsFor,
    goalsAgainst,

    averageGoalsFor: count > 0 ? goalsFor / count : 0,

    averageGoalsAgainst: count > 0 ? goalsAgainst / count : 0,

    weightedAverageGoalsFor:
      totalWeight > 0 ? weightedGoalsFor / totalWeight : 0,

    weightedAverageGoalsAgainst:
      totalWeight > 0 ? weightedGoalsAgainst / totalWeight : 0,

    over05Rate: rate(over05),
    over15Rate: rate(over15),
    over25Rate: rate(over25),
    over35Rate: rate(over35),

    under15Rate: rate(under15),
    under25Rate: rate(under25),
    under35Rate: rate(under35),

    bttsYesRate: rate(bttsYes),

    bttsNoRate: count > 0 ? 1 - rate(bttsYes) : 0,

    weightedOver15Rate: weightedRate(weightedOver15),

    weightedOver25Rate: weightedRate(weightedOver25),

    weightedBttsYesRate: weightedRate(weightedBTTS),

    weightedBttsNoRate: totalWeight > 0 ? 1 - weightedRate(weightedBTTS) : 0,
  };
}
