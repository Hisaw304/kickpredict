function getFinishedMatches(matches = []) {
  return matches.filter(
    (match) =>
      match.status === "FINISHED" &&
      Number.isFinite(match.score?.fullTime?.home) &&
      Number.isFinite(match.score?.fullTime?.away)
  );
}

function getTeamCorners(match, teamId) {
  const homeId = match.homeTeam?.id;
  const awayId = match.awayTeam?.id;

  const homeCorners =
    match.statistics?.corners?.home ??
    match.statistics?.homeCorners ??
    match.homeCorners ??
    null;

  const awayCorners =
    match.statistics?.corners?.away ??
    match.statistics?.awayCorners ??
    match.awayCorners ??
    null;

  if (homeId === teamId && Number.isFinite(homeCorners)) {
    return {
      for: homeCorners,
      against: Number.isFinite(awayCorners) ? awayCorners : null,
      venue: "home",
    };
  }

  if (awayId === teamId && Number.isFinite(awayCorners)) {
    return {
      for: awayCorners,
      against: Number.isFinite(homeCorners) ? homeCorners : null,
      venue: "away",
    };
  }

  return null;
}

export function getCornerStats(matches = [], teamId, limit = 10, venue) {
  if (!teamId) {
    return {
      available: false,
      sampleSize: 0,
      averageFor: null,
      averageAgainst: null,
      averageTotal: null,
    };
  }

  const teamMatches = getFinishedMatches(matches)
    .map((match) => ({
      match,
      stats: getTeamCorners(match, teamId),
    }))
    .filter(({ stats }) => stats !== null)
    .filter(({ stats }) => !venue || stats.venue === venue)
    .sort(
      (a, b) =>
        new Date(b.match.utcDate).getTime() -
        new Date(a.match.utcDate).getTime()
    )
    .slice(0, limit);

  const withOpponentCorners = teamMatches.filter(({ stats }) =>
    Number.isFinite(stats.against)
  );

  if (!teamMatches.length) {
    return {
      available: false,
      sampleSize: 0,
      averageFor: null,
      averageAgainst: null,
      averageTotal: null,
    };
  }

  const average = (values) =>
    values.length
      ? Number(
          (
            values.reduce((sum, value) => sum + value, 0) / values.length
          ).toFixed(2)
        )
      : null;

  const cornersFor = teamMatches.map(({ stats }) => stats.for);

  const cornersAgainst = withOpponentCorners.map(({ stats }) => stats.against);

  const totalCorners = withOpponentCorners.map(
    ({ stats }) => stats.for + stats.against
  );

  return {
    available: true,
    sampleSize: teamMatches.length,
    averageFor: average(cornersFor),
    averageAgainst: average(cornersAgainst),
    averageTotal: average(totalCorners),
  };
}
