import footballClient from "./client.js";

export async function getCompetition(league) {
  if (!league) {
    throw new Error("League is required");
  }

  const response = await footballClient.get(`/competitions/${league}`);

  return response.data;
}

/**
 * Get matches across all competitions available
 * to the current Football-Data API account.
 */
export async function getMatches({
  dateFrom,
  dateTo,
  status,
  competitions,
  limit = 500,
} = {}) {
  const params = {};

  if (dateFrom) {
    params.dateFrom = dateFrom;
  }

  if (dateTo) {
    params.dateTo = dateTo;
  }

  if (status) {
    params.status = status;
  }

  if (competitions) {
    params.competitions = Array.isArray(competitions)
      ? competitions.join(",")
      : competitions;
  }

  if (limit) {
    params.limit = limit;
  }

  const response = await footballClient.get("/matches", {
    params,
  });

  return response.data;
}

export async function getFixtures({ dateFrom, dateTo, league } = {}) {
  if (!league) {
    throw new Error("League is required");
  }

  const competition = await getCompetition(league);

  const seasonStart = competition?.currentSeason?.startDate;

  const season = seasonStart
    ? new Date(seasonStart).getUTCFullYear()
    : new Date().getUTCFullYear();

  const params = {
    season,
  };

  if (dateFrom) {
    params.dateFrom = dateFrom;
  }

  if (dateTo) {
    params.dateTo = dateTo;
  }

  const response = await footballClient.get(`/competitions/${league}/matches`, {
    params,
  });

  return response.data;
}

export async function getTeamMatches({
  teamId,
  dateFrom,
  dateTo,
  season,
  competitions,
  status,
  limit,
} = {}) {
  if (!teamId) {
    throw new Error("Team ID is required");
  }

  const params = {};

  if (dateFrom) {
    params.dateFrom = dateFrom;
  }

  if (dateTo) {
    params.dateTo = dateTo;
  }

  if (season) {
    params.season = season;
  }

  if (competitions) {
    params.competitions = Array.isArray(competitions)
      ? competitions.join(",")
      : competitions;
  }

  if (status) {
    params.status = status;
  }

  if (limit) {
    params.limit = limit;
  }

  const response = await footballClient.get(`/teams/${teamId}/matches`, {
    params,
  });

  return response.data;
}

export async function getStandings(league) {
  if (!league) {
    throw new Error("League is required");
  }

  const response = await footballClient.get(
    `/competitions/${league}/standings`
  );

  return response.data;
}
