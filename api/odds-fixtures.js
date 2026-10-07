import { searchFixtures } from "../src/lib/odds/client.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const query = req.query?.q || "Arsenal";

    const data = await searchFixtures(query);

    return res.status(200).json({
      ok: true,
      query,
      count: Array.isArray(data?.data) ? data.data.length : 0,
      message: data?.message ?? null,
      results: data?.data ?? [],
    });
  } catch (error) {
    console.error("Sportmonks search error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Sportmonks search failed.",
    });
  }
}
