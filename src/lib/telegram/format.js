function formatProbability(value) {
  if (typeof value !== "number") {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

const MARKET_LABELS = {
  home_win: "Home Win",
  draw: "Draw",
  away_win: "Away Win",

  double_chance_1x: "Double Chance — 1X",
  double_chance_x2: "Double Chance — X2",
  double_chance_12: "Double Chance — 12",

  over_1_5: "Over 1.5",
  over_2_5: "Over 2.5",
  over_3_5: "Over 3.5",

  under_1_5: "Under 1.5",
  under_2_5: "Under 2.5",
  under_3_5: "Under 3.5",

  btts_yes: "BTTS — Yes",
  btts_no: "BTTS — No",

  home_over_0_5: "Home Team Over 0.5",
  home_over_1_5: "Home Team Over 1.5",

  away_over_0_5: "Away Team Over 0.5",
  away_over_1_5: "Away Team Over 1.5",
};

function formatMarket(market) {
  if (!market) {
    return "Prediction";
  }

  if (MARKET_LABELS[market]) {
    return MARKET_LABELS[market];
  }

  return market
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPick(pick, index) {
  const fixture =
    pick.fixture ||
    pick.match ||
    `${pick.homeTeam || "Home"} vs ${pick.awayTeam || "Away"}`;

  const market = formatMarket(pick.market || pick.marketId || pick.selection);

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
    return [
      "KICKPREDICT AI",
      "",
      response.clarification ||
        "Could you clarify what prediction market you want?",
    ].join("\n");
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
