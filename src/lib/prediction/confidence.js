export function getConfidence(probability) {
  if (probability >= 85) {
    return {
      level: "very_high",
      score: probability,
    };
  }

  if (probability >= 75) {
    return {
      level: "high",
      score: probability,
    };
  }

  if (probability >= 65) {
    return {
      level: "medium",
      score: probability,
    };
  }

  return {
    level: "low",
    score: probability,
  };
}
