const API_URL = "https://api.sportmonks.com/v3/football";

function getApiKey() {
  const key = process.env.SPORT_FOOTBALL_KEY;

  if (!key) {
    throw new Error("SPORT_FOOTBALL_KEY is not configured.");
  }

  return key;
}

async function apiRequest(path, params = {}) {
  const url = new URL(`${API_URL}${path}`);

  // Sportmonks V3 authentication
  url.searchParams.set("api_token", getApiKey());

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Sportmonks request failed with status ${response.status}.`
    );
  }

  if (data?.message && data?.data === undefined) {
    throw new Error(data.message);
  }

  return data;
}

export async function getFixtureOdds(fixtureId, options = {}) {
  if (!fixtureId) {
    throw new Error("fixtureId is required.");
  }

  return apiRequest(`/odds/pre-match/fixtures/${fixtureId}`, {
    include: options.include || "market;bookmaker",
  });
}

export async function getFixture(fixtureId, options = {}) {
  if (!fixtureId) {
    throw new Error("fixtureId is required.");
  }

  return apiRequest(`/fixtures/${fixtureId}`, {
    include: options.include || "participants;league;state",
  });
}

export async function getFixturesByDate(date, options = {}) {
  if (!date) {
    throw new Error("date is required.");
  }

  return apiRequest(`/fixtures/date/${date}`, {
    timezone: options.timezone || "Africa/Lagos",

    include: options.include || "participants;league;state",
  });
}

export async function getFixturesBetween(startDate, endDate, options = {}) {
  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required.");
  }

  return apiRequest(`/fixtures/between/${startDate}/${endDate}`, {
    timezone: options.timezone || "Africa/Lagos",

    include: options.include || "participants;league;state",
  });
}

export async function searchFixtures(query, options = {}) {
  if (!query) {
    throw new Error("query is required.");
  }

  return apiRequest(`/fixtures/search/${encodeURIComponent(query)}`, {
    include: options.include || "participants;league;state",
  });
}
