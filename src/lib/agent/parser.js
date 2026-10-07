import { resolveTimeWindow } from "./time.js";
import { normalizeQuery } from "./normalizeQuery.js";

const LEAGUE_ALIASES = {
  "premier league": "PL",
  "english premier league": "PL",
  epl: "PL",

  "la liga": "PD",
  laliga: "PD",
  "spanish league": "PD",

  bundesliga: "BL1",
  "german league": "BL1",

  "serie a": "SA",
  "italian league": "SA",

  "ligue 1": "FL1",
  "french league": "FL1",

  champions: "CL",
  "champions league": "CL",
  ucl: "CL",
};

function extractCount(text) {
  const directNumber = text.match(
    /\b(?:give me|find|get|show me|show|top|pick|select|need)\s+(\d{1,2})\b/i
  );

  if (directNumber) {
    return Number(directNumber[1]);
  }

  const nounNumber = text.match(
    /\b(\d{1,2})\s+(?:picks?|predictions?|selections?|tips?|bets?)\b/i
  );

  if (nounNumber) {
    return Number(nounNumber[1]);
  }

  return 5;
}

function extractConfidence(text) {
  if (
    /\b(safe|sure|safest|strong|strongest|high confidence|high-confidence|confident)\b/i.test(
      text
    )
  ) {
    return "high";
  }

  if (/\b(best|top|good|recommended|quality)\b/i.test(text)) {
    return "medium_high";
  }

  if (/\b(risky|riskier|aggressive|longshot|long shot)\b/i.test(text)) {
    return "aggressive";
  }

  return "standard";
}

function extractLeague(text) {
  const normalized = text.toLowerCase();

  for (const [alias, code] of Object.entries(LEAGUE_ALIASES)) {
    if (normalized.includes(alias)) {
      return code;
    }
  }

  return null;
}

function extractMarkets(text) {
  const normalized = text.toLowerCase();

  const markets = [];

  /*
   * DOUBLE CHANCE
   */

  if (/\bdouble chance\b/.test(normalized)) {
    if (/\b1x\b/.test(normalized)) {
      markets.push("double_chance_1x");
    } else if (/\bx2\b/.test(normalized)) {
      markets.push("double_chance_x2");
    } else if (/\b12\b/.test(normalized)) {
      markets.push("double_chance_12");
    } else {
      markets.push("double_chance_1x");
      markets.push("double_chance_x2");
      markets.push("double_chance_12");
    }
  } else {
    /*
     * Support shorthand requests such as:
     *
     * "1X picks"
     * "X2 predictions"
     * "12 tips"
     */

    if (/\b1x\b/.test(normalized)) {
      markets.push("double_chance_1x");
    }

    if (/\bx2\b/.test(normalized)) {
      markets.push("double_chance_x2");
    }

    if (/\b12\b/.test(normalized)) {
      markets.push("double_chance_12");
    }
  }

  /*
   * OVER / UNDER 1.5
   */

  if (/\bover\s*1\.5\b/.test(normalized)) {
    markets.push("over_1_5");
  }

  if (/\bunder\s*1\.5\b/.test(normalized)) {
    markets.push("under_1_5");
  }

  /*
   * OVER / UNDER 2.5
   */

  if (/\bover\s*2\.5\b/.test(normalized)) {
    markets.push("over_2_5");
  }

  if (/\bunder\s*2\.5\b/.test(normalized)) {
    markets.push("under_2_5");
  }

  /*
   * OVER / UNDER 3.5
   */

  if (/\bover\s*3\.5\b/.test(normalized)) {
    markets.push("over_3_5");
  }

  if (/\bunder\s*3\.5\b/.test(normalized)) {
    markets.push("under_3_5");
  }

  /*
   * BTTS
   */

  if (/\b(btts|both teams to score)\b/.test(normalized)) {
    if (/\b(btts\s*no|both teams.*not.*score)\b/.test(normalized)) {
      markets.push("btts_no");
    } else {
      markets.push("btts_yes");
    }
  }

  /*
   * HOME WIN
   */

  if (
    /\b(home win|home wins|home team to win|home victory)\b/.test(normalized)
  ) {
    markets.push("home_win");
  }

  /*
   * AWAY WIN
   */

  if (
    /\b(away win|away wins|away team to win|away victory)\b/.test(normalized)
  ) {
    markets.push("away_win");
  }

  /*
   * Remove duplicates while preserving order.
   */

  return markets.length ? [...new Set(markets)] : null;
}

function extractRequestType(text) {
  if (/\b(odds?|accumulator|acca|parlay|combo|combined)\b/i.test(text)) {
    return "odds";
  }

  if (/\b(picks?|predictions?|tips?|bets?)\b/i.test(text)) {
    return "picks";
  }

  return "picks";
}

export function parsePredictionRequest(query, now) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Prediction request is required.");
  }

  const text = normalizeQuery(query);

  const count = Math.min(Math.max(extractCount(text), 1), 20);

  const confidence = extractConfidence(text);

  const league = extractLeague(text);

  const markets = extractMarkets(text);

  const requestType = extractRequestType(text);

  const time = resolveTimeWindow(text, now);

  return {
    originalQuery: text,

    type: requestType,

    count,

    confidence,

    league,

    markets,

    dateFrom: time.dateFrom,

    dateTo: time.dateTo,

    timeWindow: time.timeWindow,
  };
}
