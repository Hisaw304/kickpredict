/**
 * KICKPREDICT — FIXTURES API
 *
 * PURPOSE:
 * Provides football fixtures for a requested competition and/or date range.
 *
 * FLOW:
 * 1. Accepts GET requests with league, dateFrom, and dateTo query parameters.
 * 2. Validates the requested league against the endpoint's allowed league codes.
 * 3. Checks that FOOTBALL_API_KEY is configured.
 * 4. Calls the shared football service to retrieve fixtures.
 * 5. Normalizes the returned fixtures into KickPredict's expected format.
 * 6. Returns the fixtures and their count as JSON.
 *
 * DEPENDENCIES:
 * - src/lib/football/service.js
 * - src/lib/football/normalise.js
 *
 * IMPORTANT:
 * The league allowlist in this file applies to this endpoint.
 * It does not automatically define which competitions other endpoints
 * or the global tips engine can discover.
 */

import { getFixtures } from "../src/lib/football/service.js";
import { normalizeFixture } from "../src/lib/football/normalise.js";

const allowedLeagues = ["PL", "PD", "BL1", "SA", "FL1", "CL"];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { league, dateFrom, dateTo } = req.query;

  if (league && !allowedLeagues.includes(league)) {
    return res.status(400).json({
      error: "Invalid league",
    });
  }

  if (!process.env.FOOTBALL_API_KEY) {
    return res.status(500).json({
      error: "FOOTBALL_API_KEY is not configured on the server.",
    });
  }

  try {
    const data = await getFixtures({
      league,
      dateFrom,
      dateTo,
    });

    const matches = Array.isArray(data?.matches)
      ? data.matches.map(normalizeFixture)
      : [];

    return res.status(200).json({
      matches,
      count: matches.length,
    });
  } catch (error) {
    console.error("Fixtures request failed:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch fixtures",
    });
  }
}
