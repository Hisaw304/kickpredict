import footballClient from "../src/lib/football/client.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const today = new Date();

    const from = today.toISOString().slice(0, 10);

    const future = new Date(today);
    future.setUTCDate(future.getUTCDate() + 7);

    const to = future.toISOString().slice(0, 10);

    const response = await footballClient.get("/matches", {
      params: {
        dateFrom: from,
        dateTo: to,
        limit: 500,
      },
    });

    const matches = Array.isArray(response.data?.matches)
      ? response.data.matches
      : [];

    return res.status(200).json({
      success: true,

      range: {
        dateFrom: from,
        dateTo: to,
      },

      filters: response.data?.filters,

      resultSet: response.data?.resultSet,

      count: matches.length,

      matches: matches.map((match) => ({
        id: match.id,
        utcDate: match.utcDate,
        status: match.status,

        competition: {
          id: match.competition?.id,
          name: match.competition?.name,
          code: match.competition?.code,
        },

        homeTeam: match.homeTeam?.name,
        awayTeam: match.awayTeam?.name,
      })),
    });
  } catch (error) {
    console.error("DEBUG FIXTURES FAILED:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message,
    });
  }
}
