const API_URL = "https://v3.football.api-sports.io";

function getApiKey() {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    throw new Error("API_FOOTBALL_KEY is not configured.");
  }

  return key;
}

async function apiRequest(path, params = {}) {
  const url = new URL(`${API_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-apisports-key": getApiKey(),
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `API-Football request failed with status ${response.status}.`
    );
  }

  if (data?.errors && Object.keys(data.errors).length) {
    throw new Error(Object.values(data.errors).join(", "));
  }

  return data;
}

export async function getFixtureOdds(fixtureId, options = {}) {
  if (!fixtureId) {
    throw new Error("fixtureId is required.");
  }

  return apiRequest("/odds", {
    fixture: fixtureId,
    bookmaker: options.bookmaker,
    bet: options.bet,
    page: options.page,
  });
}

export async function getBookmakers(options = {}) {
  return apiRequest("/odds/bookmakers", {
    id: options.id,
    search: options.search,
  });
}

export async function getBetTypes(options = {}) {
  return apiRequest("/odds/bets", {
    id: options.id,
    search: options.search,
  });
}
