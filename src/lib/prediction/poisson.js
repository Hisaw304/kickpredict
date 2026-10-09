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

  const homeProbabilities = [];
  const awayProbabilities = [];

  for (let goals = 0; goals <= maxGoals; goals++) {
    homeProbabilities.push(poissonProbability(goals, homeExpectedGoals));

    awayProbabilities.push(poissonProbability(goals, awayExpectedGoals));
  }

  for (let home = 0; home <= maxGoals; home++) {
    for (let away = 0; away <= maxGoals; away++) {
      const probability = homeProbabilities[home] * awayProbabilities[away];

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

    if (home > 0 && away > 0) probabilities.bttsYes += probability;
    else probabilities.bttsNo += probability;

    if (home >= 1) probabilities.homeOver05 += probability;
    if (home >= 2) probabilities.homeOver15 += probability;

    if (away >= 1) probabilities.awayOver05 += probability;
    if (away >= 2) probabilities.awayOver15 += probability;
  }

  return probabilities;
}
