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
