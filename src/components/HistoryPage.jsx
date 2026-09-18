import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function HistoryPage({ pageSize = 3 }) {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalDates, setTotalDates] = useState(0);
  const [overallStats, setOverallStats] = useState({
    wins: 0,
    losses: 0,
    accuracy: 0,
  });

  useEffect(() => {
    fetchHistory();
  }, [page]);

  async function fetchHistory() {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .lt("match_date", today)
      .order("match_date", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const wins = data.filter((item) => item.status === "win").length;
    const losses = data.filter((item) => item.status === "lose").length;
    const total = wins + losses;
    const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    setOverallStats({
      wins,
      losses,
      accuracy,
    });

    const grouped = data.reduce((acc, item) => {
      if (!acc[item.match_date]) {
        acc[item.match_date] = [];
      }

      acc[item.match_date].push(item);

      return acc;
    }, {});

    const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

    setTotalDates(dates.length);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const paginatedDates = dates.slice(start, end);

    const paginatedHistory = paginatedDates.map((date) => ({
      date,
      fixtures: grouped[date],
    }));

    setHistory(paginatedHistory);
  }

  const nextPage = () => {
    if (page * pageSize < totalDates) {
      setPage((current) => current + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage((current) => current - 1);
    }
  };

  const formatDate = (date) => {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusLabel = (status) => {
    if (status === "win") return "Won";
    if (status === "lose") return "Lost";
    return "Pending";
  };

  return (
    <section id="history" className="history-page">
      <div className="history-container">
        {history.length === 0 ? (
          <div className="history-empty">
            <p>No past fixtures available.</p>
          </div>
        ) : (
          <>
            <div className="history-intro">
              <div>
                <span className="history-eyebrow">Prediction Archive</span>

                <h2 className="history-heading">Past Fixtures History</h2>

                <p className="history-subheading">
                  Review previous predictions, results, and overall performance
                  across completed fixtures.
                </p>
              </div>

              <div className="history-overview">
                <div className="history-overview-item">
                  <span>Record</span>
                  <strong>
                    {overallStats.wins}W / {overallStats.losses}L
                  </strong>
                </div>

                <div className="history-overview-divider" />

                <div className="history-overview-item">
                  <span>Accuracy</span>
                  <strong>{overallStats.accuracy}%</strong>
                </div>
              </div>
            </div>

            <div className="history-days">
              {history.map((day) => (
                <article key={day.date} className="history-day">
                  <div className="history-day-header">
                    <div className="history-date-wrap">
                      <span className="history-date-label">Matchday</span>

                      <h3 className="history-date">{formatDate(day.date)}</h3>
                    </div>

                    <span className="history-fixture-count">
                      {day.fixtures.length}{" "}
                      {day.fixtures.length === 1 ? "Fixture" : "Fixtures"}
                    </span>
                  </div>

                  <div className="history-fixtures">
                    <div className="history-fixtures-head">
                      <span>League</span>
                      <span>Match</span>
                      <span>Prediction</span>
                      <span>Confidence</span>
                      <span>Result</span>
                    </div>

                    {day.fixtures.map((fixture) => (
                      <div key={fixture.id} className="history-fixture">
                        <div className="history-league">
                          <span>{fixture.league}</span>
                        </div>

                        <div className="history-match">
                          <h4>{fixture.match}</h4>
                        </div>

                        <div className="history-prediction">
                          <span className="history-mobile-label">
                            Prediction
                          </span>

                          <strong>{fixture.prediction}</strong>
                        </div>

                        <div className="history-confidence">
                          <div className="history-confidence-top">
                            <span>Confidence</span>
                            <strong>{fixture.confidence}%</strong>
                          </div>

                          <div className="history-progress">
                            <span
                              style={{
                                width: `${fixture.confidence}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="history-result">
                          <span className={`history-status ${fixture.status}`}>
                            {getStatusLabel(fixture.status)}
                          </span>

                          {fixture.result && (
                            <span className="history-score">
                              {fixture.result}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {totalDates > pageSize && (
              <div className="history-pagination">
                <button type="button" onClick={prevPage} disabled={page === 1}>
                  Previous
                </button>

                <div className="history-page-info">
                  <span>Page</span>
                  <strong>{page}</strong>
                  <span>of</span>
                  <strong>{Math.ceil(totalDates / pageSize)}</strong>
                </div>

                <button
                  type="button"
                  onClick={nextPage}
                  disabled={page * pageSize >= totalDates}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
