import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function History() {
  const [history, setHistory] = useState([]);
  const [historyLabel, setHistoryLabel] = useState("Yesterday's Results");
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayString = yesterday.toISOString().split("T")[0];

    // First: try yesterday
    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_date", yesterdayString)
      .order("created_at", { ascending: false });

    if (yesterdayError) {
      console.error(yesterdayError);
      return;
    }

    if (yesterdayData && yesterdayData.length > 0) {
      setHistory(yesterdayData);
      setHistoryLabel("Yesterday's Results");
      return;
    }

    // Fallback: get the most recent prediction date before today
    const { data: latestData, error: latestError } = await supabase
      .from("predictions")
      .select("*")
      .lt("match_date", todayString)
      .order("match_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (latestError) {
      console.error(latestError);
      return;
    }

    if (!latestData || latestData.length === 0) {
      setHistory([]);
      return;
    }

    const latestDate = latestData[0].match_date;

    // Fetch all predictions from that most recent date
    const { data: recentHistory, error: recentError } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_date", latestDate)
      .order("created_at", { ascending: false });

    if (recentError) {
      console.error(recentError);
      return;
    }

    setHistory(recentHistory || []);
    setHistoryLabel("Recent Results");
  }

  const wins = history.filter((item) => item.status === "win").length;
  const losses = history.filter((item) => item.status === "lose").length;

  const total = wins + losses;

  const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

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

  return (
    <section className="kp-history">
      <div className="kp-history-container">
        <h2 className="kp-history-title">{historyLabel}</h2>

        {history.length === 0 ? (
          <>
            <p className="kp-history-empty">
              No prediction results available yet.
            </p>

            <div className="kp-history-button-wrapper">
              <button
                className="kp-history-button"
                onClick={() => navigate("/predictions")}
              >
                View Today's Predictions
              </button>
            </div>
          </>
        ) : (
          <>
            {/* RESULTS PANEL */}
            <div className="kp-history-panel">
              {/* PANEL HEADER */}
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
                  <div key={item.id} className="kp-history-row">
                    {/* LEAGUE */}
                    <span className="kp-history-league">{item.league}</span>

                    {/* MATCH */}
                    <h3 className="kp-history-match">{item.match}</h3>

                    {/* PREDICTION */}
                    <p className="kp-history-prediction">
                      <span>Prediction</span>
                      <strong>{item.prediction}</strong>
                    </p>

                    {/* CONFIDENCE */}
                    <div className="kp-history-confidence">
                      <div className="kp-history-confidence-label">
                        {item.confidence}%
                      </div>

                      <div className="kp-history-progress">
                        <div
                          className="kp-history-progress-fill"
                          style={{
                            width: `${item.confidence}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* RESULT */}
                    <div className="kp-history-result-wrap">
                      <span className={`kp-history-status ${item.status}`}>
                        {item.status}
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
                View Today's Predictions
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
