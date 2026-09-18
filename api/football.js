import axios from "axios";

export default async function handler(req, res) {
  const { league } = req.query;

  if (!league) {
    return res.status(400).json({
      error: "League is required",
    });
  }

  const allowedLeagues = ["PL", "PD", "BL1", "SA", "FL1", "CL"];

  if (!allowedLeagues.includes(league)) {
    return res.status(400).json({
      error: "Invalid league",
    });
  }

  if (!process.env.FOOTBALL_API_KEY) {
    console.error("FOOTBALL_API_KEY is missing");

    return res.status(500).json({
      error: "FOOTBALL_API_KEY is not configured on the server.",
    });
  }

  try {
    const response = await axios.get(
      `https://api.football-data.org/v4/competitions/${league}/standings`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY,
        },
        timeout: 15000,
      }
    );

    console.log("Football API success:", {
      league,
      status: response.status,
      hasStandings: Array.isArray(response.data?.standings),
      standingsLength: response.data?.standings?.length,
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Football API request failed:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    return res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch football standings",
    });
  }
}
