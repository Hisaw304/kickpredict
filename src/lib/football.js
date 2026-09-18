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

  try {
    const response = await axios.get(
      `https://api.football-data.org/v4/competitions/${league}/standings`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY,
        },
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Football API error:",
      error.response?.status,
      error.response?.data || error.message
    );

    return res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to fetch football standings",
    });
  }
}
