import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function History() {
  const [history, setHistory] = useState([]);
  const [todayHistory, setTodayHistory] = useState([]);
  const [agentHistory, setAgentHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [historyLabel, setHistoryLabel] = useState("Matchday Results");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);

    const todayString = new Date().toISOString().split("T")[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];

    async function fetchLatestHistory(table) {
      // First, try yesterday's results.
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .from(table)
        .select("*")
        .eq("match_date", yesterdayString)
        .order("created_at", { ascending: false });

      if (yesterdayError) {
        console.error(`Error fetching ${table} yesterday:`, yesterdayError);
      }

      if (!yesterdayError && yesterdayData?.length > 0) {
        return yesterdayData;
      }

      // Otherwise, find the most recent date before today.
      const { data: latestData, error: latestError } = await supabase
        .from(table)
        .select("match_date")
        .lt("match_date", todayString)
        .order("match_date", { ascending: false })
        .limit(1);

      if (latestError) {
        console.error(`Error finding latest ${table} date:`, latestError);
        return [];
      }

      if (!latestData?.length) {
        return [];
      }

      const latestDate = latestData[0].match_date;

      const { data: recentData, error: recentError } = await supabase
        .from(table)
        .select("*")
        .eq("match_date", latestDate)
        .order("created_at", { ascending: false });

      if (recentError) {
        console.error(`Error fetching latest ${table} results:`, recentError);
        return [];
      }

      return recentData || [];
    }

    try {
      const [todayData, agentData] = await Promise.all([
        fetchLatestHistory("predictions"),
        fetchLatestHistory("agent_predictions"),
      ]);

      setTodayHistory(todayData);
      setAgentHistory(agentData);

      // Automatically activate the tab with results if only one has them.
      // If both have results, keep Matchday Results as the default.
      const nextTab =
        todayData.length === 0 && agentData.length > 0 ? "agent" : "today";

      setActiveTab(nextTab);

      const selectedHistory = nextTab === "agent" ? agentData : todayData;

      setHistory(selectedHistory);
      setHistoryLabel(
        nextTab === "agent" ? "Agent Results" : "Matchday Results"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);

    const selectedHistory = tab === "today" ? todayHistory : agentHistory;

    setHistory(selectedHistory);
    setHistoryLabel(tab === "today" ? "Matchday Results" : "Agent Results");
  }

  const wins = history.filter(
    (item) => item.status?.toLowerCase() === "win"
  ).length;

  const losses = history.filter(
    (item) => item.status?.toLowerCase() === "lose"
  ).length;

  const total = wins + losses;
  const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

  const historyDate =
    history.length > 0
      ? new Date(`${history[0].match_date}T00:00:00`).toLocaleDateString(
          "en-US",
          {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }
        )
      : null;

  const hasAnyHistory = todayHistory.length > 0 || agentHistory.length > 0;

  return (
    <section className="kp-history">
      <div className="kp-history-container">
        {/* HISTORY TABS */}
        {hasAnyHistory && (
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
        )}

        <h2 className="kp-history-title">
          {loading ? "Loading Results..." : historyLabel}
        </h2>

        <p className="kp-history-description">
          Review completed predictions, including their results, confidence
          levels, and overall accuracy.
        </p>

        {loading ? (
          <p className="kp-history-empty">Loading prediction results...</p>
        ) : history.length === 0 ? (
          <>
            <p className="kp-history-empty">
              {activeTab === "today"
                ? "No matchday results are available yet."
                : "No agent results are available yet."}
            </p>

            <div className="kp-history-button-wrapper">
              <button
                className="kp-history-button"
                onClick={() => navigate("/predictions")}
              >
                View Matchday Picks
              </button>
            </div>
          </>
        ) : (
          <>
            {/* RESULTS PANEL */}
            <div className="kp-history-panel">
              <div className="kp-history-panel-header">
                <div className="kp-history-date">
                  <span className="kp-history-date-label">Results Date</span>
                  <strong>{historyDate}</strong>
                </div>

                <div className="kp-history-results-badge">{historyLabel}</div>
              </div>

              {/* COLUMN HEADER */}
              <div className="kp-history-list-head">
                <span>League</span>
                <span>Match</span>
                <span>Prediction</span>
                <span>Confidence</span>
                <span>Result</span>
              </div>

              {/* RESULTS */}
              <div className="kp-history-list">
                {history.map((item) => (
                  <div
                    key={`${activeTab}-${item.id}`}
                    className="kp-history-row"
                  >
                    <span className="kp-history-league">{item.league}</span>

                    <h3 className="kp-history-match">{item.match}</h3>

                    <p className="kp-history-prediction">
                      <span>Prediction</span>
                      <strong>{item.prediction}</strong>
                    </p>

                    <div className="kp-history-confidence">
                      <div className="kp-history-confidence-label">
                        {item.confidence}%
                      </div>

                      <div className="kp-history-progress">
                        <div
                          className="kp-history-progress-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, Number(item.confidence) || 0)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="kp-history-result-wrap">
                      <span
                        className={`kp-history-status ${(
                          item.status || "pending"
                        ).toLowerCase()}`}
                      >
                        {item.status || "Pending"}
                      </span>

                      {item.result && (
                        <span className="kp-history-result">{item.result}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECORD SUMMARY */}
            <div className="kp-history-summary">
              <div className="kp-history-summary-item">
                <span>Record</span>
                <strong>
                  {wins} Wins / {losses} Losses
                </strong>
              </div>

              <div className="kp-history-summary-divider" />

              <div className="kp-history-summary-item">
                <span>Accuracy</span>
                <strong>{accuracy}%</strong>
              </div>
            </div>

            {/* BUTTON */}
            <div className="kp-history-button-wrapper">
              <button
                className="kp-history-button"
                onClick={() => navigate("/predictions")}
              >
                View Matchday Picks
              </button>
            </div>
          </>
        )}

        <p className="kp-history-note">
          <strong>Note:</strong> Accuracy is calculated from predictions marked
          as wins or losses. Pending predictions are excluded.
        </p>
      </div>
    </section>
  );
}
