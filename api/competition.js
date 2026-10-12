/**
 * KICKPREDICT — COMPETITION API
 *
 * PURPOSE:
 * Provides competition-related information through a server-side endpoint.
 *
 * ARCHITECTURE ROLE:
 * Acts as an API boundary between the frontend and competition data.
 *
 * TRACE THIS FILE TO UNDERSTAND:
 * - Whether it retrieves, lists, or filters competitions.
 * - Which provider or internal service it uses.
 * - Whether its competition list is static or provider-generated.
 *
 * NOTE:
 * Its precise role must be confirmed from the implementation.
 */

import footballClient from "../src/lib/football/client.js";

export default async function handler(req, res) {
  const { league = "PL" } = req.query;

  try {
    const response = await footballClient.get(`/competitions/${league}`);

    return res.status(200).json({
      id: response.data?.id,
      name: response.data?.name,
      code: response.data?.code,
      currentSeason: response.data?.currentSeason,
      seasons: response.data?.seasons,
    });
  } catch (error) {
    console.error("Competition request failed:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return res.status(error.response?.status || 500).json({
      error:
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch competition",
    });
  }
}
