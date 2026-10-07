function formatProbability(value) {
  if (typeof value !== "number") {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatPick(pick, index) {
  const fixture =
    pick.fixture ||
    pick.match ||
    `${pick.homeTeam || "Home"} vs ${pick.awayTeam || "Away"}`;

  const market = pick.marketLabel || pick.market || "Prediction";

  const probability =
    pick.calibratedProbability ?? pick.probability ?? pick.confidence?.score;

  return [
    `${index + 1}. ${fixture}`,
    `   ${market}`,
    probability != null
      ? `   Confidence: ${formatProbability(probability)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatPredictionResponse(response) {
  if (!response) {
    return "I couldn't generate a prediction right now.";
  }

  if (response.needsClarification) {
    return (
      response.clarification ||
      "Could you clarify what prediction market you want?"
    );
  }

  const picks = response.picks || [];

  if (!picks.length) {
    return (
      response.message || "I couldn't find qualifying picks for that request."
    );
  }

  const header =
    response.message || "Here are your strongest qualifying picks:";

  const body = picks.map((pick, index) => formatPick(pick, index)).join("\n\n");

  return ["KICKPREDICT AI", "", header, "", body].join("\n");
}

export function formatTelegramError() {
  return [
    "KICKPREDICT AI",
    "",
    "I couldn't complete that request right now.",
    "",
    "Please try again in a moment.",
  ].join("\n");
}
