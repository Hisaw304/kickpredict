function formatProbability(probability) {
  if (!Number.isFinite(Number(probability))) {
    return null;
  }

  return `${Number(probability).toFixed(1)}%`;
}

function formatFixture(fixture) {
  const home = fixture?.homeTeam?.name || "Home";

  const away = fixture?.awayTeam?.name || "Away";

  return `${home} vs ${away}`;
}

function formatKickoff(utcDate) {
  if (!utcDate) {
    return null;
  }

  const date = new Date(utcDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function getConfidenceLabel(probability) {
  if (!Number.isFinite(Number(probability))) {
    return null;
  }

  if (probability >= 85) {
    return "Very High";
  }

  if (probability >= 75) {
    return "High";
  }

  if (probability >= 65) {
    return "Medium";
  }

  return "Low";
}

function buildPick(selection, index) {
  const rawProbability = Number(selection.rawProbability);

  const calibratedProbability = Number(selection.calibratedProbability);

  /*
   * The selector's probability is now the
   * calibrated probability when calibration
   * is available.
   */
  const probability = Number.isFinite(calibratedProbability)
    ? calibratedProbability
    : Number(selection.probability);

  return {
    rank: index + 1,

    fixture: formatFixture(selection.fixture),

    homeTeam: selection.fixture?.homeTeam?.name || null,

    awayTeam: selection.fixture?.awayTeam?.name || null,

    competition: selection.fixture?.competition?.name || null,

    competitionCode: selection.fixture?.competition?.code || null,

    kickoff: formatKickoff(selection.fixture?.utcDate),

    utcDate: selection.fixture?.utcDate || null,

    market: selection.market || null,

    label: selection.label || selection.market || null,

    /*
     * Main probability used by the
     * selector and displayed to users.
     */
    probability: Number.isFinite(probability)
      ? Number(probability.toFixed(1))
      : null,

    probabilityFormatted: formatProbability(probability),

    /*
     * Original model probability before
     * calibration.
     */
    rawProbability: Number.isFinite(rawProbability)
      ? Number(rawProbability.toFixed(1))
      : null,

    rawProbabilityFormatted: formatProbability(rawProbability),

    /*
     * Probability after historical
     * calibration.
     */
    calibratedProbability: Number.isFinite(calibratedProbability)
      ? Number(calibratedProbability.toFixed(1))
      : null,

    calibratedProbabilityFormatted: formatProbability(calibratedProbability),

    /*
     * How much calibration changed
     * the original model probability.
     */
    calibrationAdjustment: Number.isFinite(
      Number(selection.calibrationAdjustment)
    )
      ? Number(Number(selection.calibrationAdjustment).toFixed(1))
      : 0,

    calibrationReliability: selection.calibrationReliability || "uncalibrated",

    calibrationSamples: Number(selection.calibrationSamples || 0),

    observedRate: Number.isFinite(Number(selection.observedRate))
      ? Number(Number(selection.observedRate).toFixed(1))
      : null,

    calibrationGap: Number.isFinite(Number(selection.calibrationGap))
      ? Number(Number(selection.calibrationGap).toFixed(1))
      : null,

    confidence: getConfidenceLabel(probability),

    expectedGoals: selection.expectedGoals || null,

    research: selection.research || null,
  };
}

function buildSummary({ request, picks }) {
  const count = picks.length;

  if (!count) {
    return `I couldn't find enough qualifying picks for "${request.originalQuery}".`;
  }

  if (count < request.count) {
    return `I found ${count} qualifying pick${
      count === 1 ? "" : "s"
    } instead of the requested ${request.count}.`;
  }

  let confidenceText = "";

  if (request.confidence === "high") {
    confidenceText = "high-confidence ";
  } else if (request.confidence === "medium_high") {
    confidenceText = "strong ";
  }

  const timeText = request.timeWindow
    ? `${request.dateFrom} during the requested time window`
    : request.dateFrom;

  return `I found ${count} ${confidenceText}pick${
    count === 1 ? "" : "s"
  } for ${timeText}.`.replace(/\s+/g, " ");
}

export function buildAgentResponse({ request, picks = [], dataset = {} }) {
  const formattedPicks = picks.map(buildPick);

  return {
    success: true,

    message: buildSummary({
      request,
      picks: formattedPicks,
    }),

    request: {
      query: request.originalQuery,

      type: request.type,

      count: request.count,

      confidence: request.confidence,

      league: request.league,

      markets: request.markets,

      dateFrom: request.dateFrom,

      dateTo: request.dateTo,

      timeWindow: request.timeWindow,
    },

    dataset,

    picks: formattedPicks,
  };
}
