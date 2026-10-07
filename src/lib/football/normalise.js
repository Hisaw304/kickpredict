export function normalizeFixture(match) {
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,

    competition: {
      id: match.competition?.id,
      name: match.competition?.name,
      code: match.competition?.code,
    },

    homeTeam: {
      id: match.homeTeam?.id,
      name: match.homeTeam?.name,
      shortName: match.homeTeam?.shortName,
      crest: match.homeTeam?.crest,
    },

    awayTeam: {
      id: match.awayTeam?.id,
      name: match.awayTeam?.name,
      shortName: match.awayTeam?.shortName,
      crest: match.awayTeam?.crest,
    },

    score: {
      home: match.score?.fullTime?.home,
      away: match.score?.fullTime?.away,
    },
  };
}
