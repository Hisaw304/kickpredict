function factorial(n) {
  if (n === 0 || n === 1) {
    return 1;
  }

  let result = 1;

  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  return result;
}

export function poissonProbability(goals, expectedGoals) {
  if (goals < 0 || !Number.isFinite(expectedGoals) || expectedGoals < 0) {
    return 0;
  }

  return (
    (Math.exp(-expectedGoals) * Math.pow(expectedGoals, goals)) /
    factorial(goals)
  );
}

export function buildScoreMatrix(
  homeExpectedGoals,
  awayExpectedGoals,
  maxGoals = 10
) {
  const matrix = [];

  let totalProbability = 0;

  for (let home = 0; home <= maxGoals; home++) {
    for (let away = 0; away <= maxGoals; away++) {
      const probability =
        poissonProbability(home, homeExpectedGoals) *
        poissonProbability(away, awayExpectedGoals);

      totalProbability += probability;

      matrix.push({
        home,
        away,
        probability,
      });
    }
  }

  // Normalize so the matrix always represents 100%
  return matrix.map((item) => ({
    ...item,
    probability: totalProbability > 0 ? item.probability / totalProbability : 0,
  }));
}

export function calculateMatchProbabilities(
  homeExpectedGoals,
  awayExpectedGoals
) {
  const matrix = buildScoreMatrix(homeExpectedGoals, awayExpectedGoals);

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  let over05 = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;

  let under15 = 0;
  let under25 = 0;
  let under35 = 0;

  let bttsYes = 0;
  let bttsNo = 0;

  let homeOver05 = 0;
  let homeOver15 = 0;

  let awayOver05 = 0;
  let awayOver15 = 0;

  for (const item of matrix) {
    const { home, away, probability } = item;

    const total = home + away;

    // Result
    if (home > away) {
      homeWin += probability;
    }

    if (home === away) {
      draw += probability;
    }

    if (away > home) {
      awayWin += probability;
    }

    // Total goals
    if (total >= 1) {
      over05 += probability;
    }

    if (total >= 2) {
      over15 += probability;
    }

    if (total >= 3) {
      over25 += probability;
    }

    if (total >= 4) {
      over35 += probability;
    }

    if (total < 2) {
      under15 += probability;
    }

    if (total < 3) {
      under25 += probability;
    }

    if (total < 4) {
      under35 += probability;
    }

    // BTTS
    if (home > 0 && away > 0) {
      bttsYes += probability;
    } else {
      bttsNo += probability;
    }

    // Home goals
    if (home >= 1) {
      homeOver05 += probability;
    }

    if (home >= 2) {
      homeOver15 += probability;
    }

    // Away goals
    if (away >= 1) {
      awayOver05 += probability;
    }

    if (away >= 2) {
      awayOver15 += probability;
    }
  }

  return {
    homeWin,
    draw,
    awayWin,

    over05,
    over15,
    over25,
    over35,

    under15,
    under25,
    under35,

    bttsYes,
    bttsNo,

    homeOver05,
    homeOver15,

    awayOver05,
    awayOver15,
  };
}
