import { useEffect, useState } from "react";
import footballApi from "../lib/footballApi";

const leagues = [
  {
    id: "PL",
    name: "Premier League",
  },
  {
    id: "PD",
    name: "La Liga",
  },
  {
    id: "BL1",
    name: "Bundesliga",
  },
  {
    id: "SA",
    name: "Serie A",
  },
  {
    id: "FL1",
    name: "Ligue 1",
  },
  {
    id: "CL",
    name: "Champions League",
  },
];

const LeagueTable = () => {
  const [league, setLeague] = useState("PL");
  const [table, setTable] = useState([]);
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getTable();
  }, [league]);

  const getTable = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await footballApi.get(`/football?league=${league}`);

      if (!res?.data) {
        throw new Error("The football API returned no response data.");
      }

      if (!Array.isArray(res.data.standings)) {
        console.error("Unexpected API structure:", res.data);

        throw new Error("Standings were not returned by the football API.");
      }

      if (!res.data.standings[0]?.table) {
        console.error("Standings exist, but table is missing:", res.data);

        throw new Error("The football API returned standings without a table.");
      }

      setCompetition(res.data.competition || null);
      setTable(res.data.standings[0].table || []);
    } catch (err) {
      console.error("Failed to load league table:", err);

      setCompetition(null);
      setTable([]);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Unable to load the league standings right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const getRowClass = (position) => {
    switch (league) {
      case "PL":
      case "PD":
      case "SA":
        if (position <= 4) return "ucl";
        if (position === 5) return "uel";
        if (position === 6) return "uecl";
        if (position >= 18) return "relegation";
        break;

      case "BL1":
        if (position <= 4) return "ucl";
        if (position === 5) return "uel";
        if (position === 6) return "uecl";
        if (position >= 17) return "relegation";
        break;

      case "FL1":
        if (position <= 4) return "ucl";
        if (position === 5) return "uel";
        if (position >= 17) return "relegation";
        break;

      default:
        return "";
    }

    return "";
  };

  return (
    <section className="kp-league-page">
      <div className="kp-league-container">
        {/* Heading */}
        <div className="kp-league-heading">
          <span className="kp-league-eyebrow">Football Standings</span>

          <h1>League Tables</h1>

          <p>
            Browse the latest standings from Europe's biggest football
            competitions.
          </p>
        </div>

        {/* Main Panel */}
        <div className="kp-league-panel">
          {/* Toolbar */}
          <div className="kp-league-toolbar">
            <div className="kp-league-selector">
              <label htmlFor="kp-league-select">Competition</label>

              <select
                id="kp-league-select"
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                className="kp-league-select"
              >
                {leagues.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {competition?.name && (
              <div className="kp-league-current">
                <span>Current Table</span>
                <strong>{competition.name}</strong>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="kp-league-loading">
              <div className="kp-league-loader" />
              <span>Loading standings...</span>
            </div>
          ) : error ? (
            /* Error */
            <div className="kp-league-error">
              <div className="kp-league-error-icon">!</div>

              <h3>Standings unavailable</h3>

              <p>{error}</p>

              <button
                type="button"
                onClick={getTable}
                className="kp-league-retry"
              >
                Try Again
              </button>
            </div>
          ) : table.length === 0 ? (
            /* Empty */
            <div className="kp-league-empty">
              No standings available for this competition.
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="kp-league-table-wrapper">
                <table className="kp-league-table">
                  <thead>
                    <tr>
                      <th className="kp-position-head">#</th>
                      <th>Club</th>
                      <th>P</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                      <th className="kp-points-head">Pts</th>
                    </tr>
                  </thead>

                  <tbody>
                    {table.map((club, index) => {
                      const position = index + 1;

                      return (
                        <tr
                          key={club.team?.id || index}
                          className={getRowClass(position)}
                        >
                          <td className="kp-position">
                            <span>{position}</span>
                          </td>

                          <td className="kp-club">
                            <div className="kp-club-info">
                              <div className="kp-club-crest">
                                {club.team?.crest ? (
                                  <img
                                    src={club.team.crest}
                                    alt={club.team.name || "Club crest"}
                                  />
                                ) : (
                                  <span className="kp-no-crest">—</span>
                                )}
                              </div>

                              <span>{club.team?.name || "Unknown Club"}</span>
                            </div>
                          </td>

                          <td>{club.playedGames ?? 0}</td>
                          <td>{club.won ?? 0}</td>
                          <td>{club.draw ?? 0}</td>
                          <td>{club.lost ?? 0}</td>
                          <td>{club.goalsFor ?? 0}</td>
                          <td>{club.goalsAgainst ?? 0}</td>

                          <td>
                            <span
                              className={
                                club.goalDifference > 0
                                  ? "kp-positive"
                                  : club.goalDifference < 0
                                  ? "kp-negative"
                                  : ""
                              }
                            >
                              {club.goalDifference > 0
                                ? `+${club.goalDifference}`
                                : club.goalDifference ?? 0}
                            </span>
                          </td>

                          <td className="kp-points">
                            {club.playedGames === 0 ? "-" : club.points ?? 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="kp-league-legend">
                <span className="kp-legend-title">Qualification</span>

                <div className="kp-legend-items">
                  <div className="kp-legend-item">
                    <span className="kp-legend-dot ucl" />
                    Champions League
                  </div>

                  <div className="kp-legend-item">
                    <span className="kp-legend-dot uel" />
                    Europa League
                  </div>

                  <div className="kp-legend-item">
                    <span className="kp-legend-dot uecl" />
                    Conference League
                  </div>

                  <div className="kp-legend-item">
                    <span className="kp-legend-dot relegation" />
                    Relegation
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default LeagueTable;
