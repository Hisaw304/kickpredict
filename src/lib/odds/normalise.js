const MARKET_MAP = {
  "Match Winner": "match_winner",
  "Fulltime Result": "match_winner",

  "Double Chance": "double_chance",

  "Both Teams Score": "btts",
  "Both Teams To Score": "btts",

  "Over/Under 1.5 Goals": "over_under_1_5",
  "Over/Under 2.5 Goals": "over_under_2_5",
  "Over/Under 3.5 Goals": "over_under_3_5",

  "Home/Away": "home_away",

  "Home Team Total Goals": "home_team_total_goals",
  "Away Team Total Goals": "away_team_total_goals",
};

function normalizeMarketName(name) {
  if (!name) {
    return null;
  }

  return (
    MARKET_MAP[name] ||
    name
      .toLowerCase()
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}

function normalizeOdd(odd) {
  if (!odd) {
    return null;
  }

  const value = Number(odd.value);

  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    id: odd.id ?? null,

    fixtureId: odd.fixture_id ?? null,

    bookmakerId: odd.bookmaker_id ?? null,

    bookmakerName: odd.bookmaker?.name ?? odd.bookmaker_name ?? null,

    marketId: odd.market_id ?? null,

    market: normalizeMarketName(
      odd.market?.name || odd.market?.developer_name || null
    ),

    marketName: odd.market?.name ?? odd.market_name ?? null,

    selection: odd.label ?? null,

    odd: value,

    probability:
      odd.probability != null
        ? Number(String(odd.probability).replace("%", ""))
        : null,

    fractional: odd.fractional ?? null,

    american: odd.american ?? null,

    handicap: odd.handicap ?? null,

    updatedAt:
      odd.latest_bookmaker_update ?? odd.last_update ?? odd.updated_at ?? null,
  };
}

export function normalizeOddsResponse(data) {
  const odds = Array.isArray(data?.data) ? data.data : [];

  const markets = odds.map(normalizeOdd).filter(Boolean);

  return {
    fixtureId: markets[0]?.fixtureId ?? data?.data?.[0]?.fixture_id ?? null,

    count: markets.length,

    markets,
  };
}
