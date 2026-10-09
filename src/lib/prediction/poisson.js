function factorial(n) {
  if (!Number.isInteger(n) || n < 0) {
    return NaN;
  }

  let result = 1;

  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  return result;
}

export function poissonProbability(goals, expectedGoals) {
  if (
    !Number.isInteger(goals) ||
    goals < 0 ||
    !Number.isFinite(expectedGoals) ||
    expectedGoals < 0
  ) {
    return 0;
  }

  if (expectedGoals === 0) {
    return goals === 0 ? 1 : 0;
  }

  // Iterative PMF avoids repeatedly calculating powers and factorials.
  let probability = Math.exp(-expectedGoals);

  for (let i = 1; i <= goals; i++) {
    probability *= expectedGoals / i;
  }

  return Number.isFinite(probability) ? probability : 0;
}

export function buildScoreMatrix(
  homeExpectedGoals,
  awayExpectedGoals,
  maxGoals = 10
) {
  if (
    !Number.isFinite(homeExpectedGoals) ||
    !Number.isFinite(awayExpectedGoals) ||
    homeExpectedGoals < 0 ||
    awayExpectedGoals < 0 ||
    !Number.isInteger(maxGoals) ||
    maxGoals < 1
  ) {
    throw new Error("Invalid expected goals or score matrix limit");
  }

  const matrix = [];
  let totalProbability = 0;

  for (let home = 0; home <= maxGoals; home++) {
    const homeProbability = poissonProbability(home, homeExpectedGoals);

    for (let away = 0; away <= maxGoals; away++) {
      const probability =
        homeProbability * poissonProbability(away, awayExpectedGoals);

      matrix.push({ home, away, probability });
      totalProbability += probability;
    }
  }

  if (!Number.isFinite(totalProbability) || totalProbability <= 0) {
    throw new Error("Could not calculate a valid score probability matrix");
  }

  return matrix.map((item) => ({
    ...item,
    probability: item.probability / totalProbability,
  }));
}

export function calculateMatchProbabilities(
  homeExpectedGoals,
  awayExpectedGoals
) {
  const matrix = buildScoreMatrix(homeExpectedGoals, awayExpectedGoals);

  const probabilities = {
    homeWin: 0,
    draw: 0,
    awayWin: 0,

    over05: 0,
    over15: 0,
    over25: 0,
    over35: 0,

    under15: 0,
    under25: 0,
    under35: 0,

    bttsYes: 0,
    bttsNo: 0,

    homeOver05: 0,
    homeOver15: 0,

    awayOver05: 0,
    awayOver15: 0,
  };

  for (const { home, away, probability } of matrix) {
    const total = home + away;

    if (home > away) probabilities.homeWin += probability;
    else if (home === away) probabilities.draw += probability;
    else probabilities.awayWin += probability;

    if (total >= 1) probabilities.over05 += probability;
    if (total >= 2) probabilities.over15 += probability;
    if (total >= 3) probabilities.over25 += probability;
    if (total >= 4) probabilities.over35 += probability;

    if (total < 2) probabilities.under15 += probability;
    if (total < 3) probabilities.under25 += probability;
    if (total < 4) probabilities.under35 += probability;

    if (home > 0 && away > 0) {
      probabilities.bttsYes += probability;
    } else {
      probabilities.bttsNo += probability;
    }

    if (home >= 1) probabilities.homeOver05 += probability;
    if (home >= 2) probabilities.homeOver15 += probability;

    if (away >= 1) probabilities.awayOver05 += probability;
    if (away >= 2) probabilities.awayOver15 += probability;
  }

  return probabilities;
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
