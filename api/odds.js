import { getFixtureOdds } from "../src/lib/odds/client.js";

import { normalizeOddsResponse } from "../src/lib/odds/normalise.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const fixtureId = req.query?.fixtureId;

    if (!fixtureId) {
      return res.status(400).json({
        ok: false,
        error: "fixtureId is required.",
      });
    }

    const data = await getFixtureOdds(fixtureId);

    const odds = normalizeOddsResponse(data);

    return res.status(200).json({
      ok: true,
      fixtureId: Number(fixtureId),
      count: odds.markets.length,
      markets: odds.markets,
    });
  } catch (error) {
    console.error("Odds API error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to retrieve bookmaker odds.",
    });
  }
}
