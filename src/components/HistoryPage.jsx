import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function HistoryPage({ pageSize = 3 }) {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("today");
  const [loading, setLoading] = useState(true);

  const [todayHistory, setTodayHistory] = useState([]);
  const [agentHistory, setAgentHistory] = useState([]);

  const [todayStats, setTodayStats] = useState({
    wins: 0,
    losses: 0,
    accuracy: "0.0",
  });

  const [agentStats, setAgentStats] = useState({
    wins: 0,
    losses: 0,
    accuracy: "0.0",
  });

  const [totalDates, setTotalDates] = useState(0);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const sourceHistory = activeTab === "today" ? todayHistory : agentHistory;

    const grouped = sourceHistory.reduce((acc, item) => {
      if (!acc[item.match_date]) {
        acc[item.match_date] = [];
      }

      acc[item.match_date].push(item);
      return acc;
    }, {});

    const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

    setTotalDates(dates.length);

    const start = (page - 1) * pageSize;
    const paginatedDates = dates.slice(start, start + pageSize);

    setHistory(
      paginatedDates.map((date) => ({
        date,
        fixtures: grouped[date],
      }))
    );
  }, [activeTab, page, pageSize, todayHistory, agentHistory]);

  async function fetchHistory() {
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    async function fetchTable(table) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .lt("match_date", today)
        .order("match_date", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        console.error(`Error fetching ${table} history:`, error);
        return [];
      }

      return data || [];
    }

    try {
      const [todayData, agentData] = await Promise.all([
        fetchTable("predictions"),
        fetchTable("agent_predictions"),
      ]);

      setTodayHistory(todayData);
      setAgentHistory(agentData);

      function calculateStats(data) {
        const wins = data.filter(
          (item) => item.status?.toLowerCase() === "win"
        ).length;

        const losses = data.filter(
          (item) => item.status?.toLowerCase() === "lose"
        ).length;

        const total = wins + losses;

        return {
          wins,
          losses,
          accuracy: total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0",
        };
      }

      setTodayStats(calculateStats(todayData));
      setAgentStats(calculateStats(agentData));

      // Use Agent Results automatically if Matchday Results is empty.
      // If both contain history, Matchday Results remains the default.
      if (todayData.length === 0 && agentData.length > 0) {
        setActiveTab("agent");
      } else {
        setActiveTab("today");
      }

      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  const activeStats = activeTab === "today" ? todayStats : agentStats;

  const activeSource = activeTab === "today" ? todayHistory : agentHistory;

  const getStatusLabel = (status) => {
    if (status?.toLowerCase() === "win") return "Won";
    if (status?.toLowerCase() === "lose") return "Lost";
    return "Pending";
  };

  const formatDate = (date) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <section id="history" className="history-page">
      <div className="history-container">
        {/* HISTORY TABS — SHARED CLASSES */}
        <div className="kp-history-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "today"}
            className={`kp-history-tab ${
              activeTab === "today" ? "is-active" : ""
            }`}
            onClick={() => handleTabChange("today")}
          >
            Matchday Results
            {todayHistory.length > 0 && (
              <span className="kp-history-tab-count">
                {todayHistory.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "agent"}
            className={`kp-history-tab ${
              activeTab === "agent" ? "is-active" : ""
            }`}
            onClick={() => handleTabChange("agent")}
          >
            Agent Results
            {agentHistory.length > 0 && (
              <span className="kp-history-tab-count">
                {agentHistory.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="history-empty">
            <p>Loading prediction history...</p>
          </div>
        ) : (
          <>
            {/* INTRO AND SOURCE-SPECIFIC ACCURACY */}
            <div className="history-intro">
              <div>
                <span className="history-eyebrow">
                  {activeTab === "today" ? "Matchday Archive" : "Agent Archive"}
                </span>

                <h2 className="history-heading">
                  {activeTab === "today"
                    ? "Matchday Results History"
                    : "Agent Results History"}
                </h2>

                <p className="history-subheading">
                  Review past predictions, match results, and performance for{" "}
                  {activeTab === "today" ? "matchday picks" : "agent picks"}.
                </p>
              </div>

              <div className="history-overview">
                <div className="history-overview-item">
                  <span>Record</span>
                  <strong>
                    {activeStats.wins}W / {activeStats.losses}L
                  </strong>
                </div>

                <div className="history-overview-divider" />

                <div className="history-overview-item">
                  <span>Accuracy</span>
                  <strong>{activeStats.accuracy}%</strong>
                </div>
              </div>
            </div>

            {/* ARCHIVE */}
            {history.length === 0 ? (
              <div className="history-empty">
                <p>
                  {activeSource.length === 0
                    ? "No past fixtures available for this category."
                    : "No more results on this page."}
                </p>
              </div>
            ) : (
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
                        <div
                          key={`${activeTab}-${fixture.id}`}
                          className="history-fixture"
                        >
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
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, Number(fixture.confidence) || 0)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="history-result">
                            <span
                              className={`history-status ${
                                fixture.status || "pending"
                              }`}
                            >
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
            )}

            {/* PAGINATION */}
            {totalDates > pageSize && (
              <div className="history-pagination">
                <button
                  type="button"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page === 1}
                >
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
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= Math.ceil(totalDates / pageSize)}
                >
                  Next
                </button>
              </div>
            )}

            <p className="history-subheading">
              Accuracy is calculated separately for each tab using predictions
              marked as wins or losses. Pending predictions are excluded.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
