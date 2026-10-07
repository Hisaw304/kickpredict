import { getFixtures, getTeamMatches } from "../src/lib/football/service.js";
import { normalizeFixture } from "../src/lib/football/normalise.js";
import { predictFixture } from "../src/lib/prediction/engine.js";

const allowedLeagues = ["PL", "PD", "BL1", "SA", "FL1", "CL"];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { league, fixtureId } = req.query;

  if (!league) {
    return res.status(400).json({
      error: "league is required",
    });
  }

  if (!allowedLeagues.includes(league)) {
    return res.status(400).json({
      error: "Invalid league",
    });
  }

  if (!fixtureId) {
    return res.status(400).json({
      error: "fixtureId is required",
    });
  }

  if (!process.env.FOOTBALL_API_KEY) {
    return res.status(500).json({
      error: "FOOTBALL_API_KEY is not configured on the server.",
    });
  }

  try {
    // Fetch the league fixtures ONCE.
    const leagueData = await getFixtures({
      league,
    });

    const rawFixture = leagueData?.matches?.find(
      (match) => String(match.id) === String(fixtureId)
    );

    if (!rawFixture) {
      return res.status(404).json({
        error: "Fixture not found",
        fixtureId: Number(fixtureId),
        league,
      });
    }

    const fixture = normalizeFixture(rawFixture);

    // Only team histories need additional requests.
    const [homeHistory, awayHistory] = await Promise.all([
      getTeamMatches({
        teamId: fixture.homeTeam.id,
      }),

      getTeamMatches({
        teamId: fixture.awayTeam.id,
      }),
    ]);

    const prediction = predictFixture({
      fixture,

      homeMatches: homeHistory?.matches || [],

      awayMatches: awayHistory?.matches || [],

      // Reuse the league request we already made.
      leagueMatches: (leagueData?.matches || []).filter(
        (match) => match.status === "FINISHED"
      ),
    });

    return res.status(200).json({
      success: true,
      fixture,
      prediction,
    });
  } catch (error) {
    console.error("Prediction request failed:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack,
    });

    return res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to generate prediction",
    });
  }
}
