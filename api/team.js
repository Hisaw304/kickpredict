import { getTeamMatches } from "../src/lib/football/service.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { teamId } = req.query;

  if (!teamId) {
    return res.status(400).json({
      error: "teamId is required",
    });
  }

  try {
    const data = await getTeamMatches({
      teamId: Number(teamId),
    });

    return res.status(200).json({
      teamId: Number(teamId),
      matches: Array.isArray(data?.matches) ? data.matches : [],
      count: Array.isArray(data?.matches) ? data.matches.length : 0,
    });
  } catch (error) {
    console.error("Team matches request failed:", {
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
        "Failed to fetch team matches",
    });
  }
}
