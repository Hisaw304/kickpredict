import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function History() {
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_date", dateString)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    }

    if (data) {
      setHistory(data);
    }
  }

  // Calculate record
  const wins = history.filter((h) => h.status === "win").length;
  const losses = history.filter((h) => h.status === "lose").length;
  const total = wins + losses;
  const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

  return (
    <section className="kp-history">
      <div className="kp-history-container">
        <h2 className="kp-history-title">Yesterday's Prediction Results</h2>

        {history.length === 0 ? (
          <p className="kp-history-empty">No predictions for yesterday.</p>
        ) : (
          <>
            <div className="kp-history-grid">
              {history.map((item) => (
                <div key={item.id} className="kp-history-card">
                  <div className="kp-history-top">
                    <span className="kp-history-league">{item.league}</span>
                    <span className={`kp-history-status ${item.status}`}>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="kp-history-match">{item.match}</h3>

                  <p className="kp-history-prediction">
                    Prediction: <strong>{item.prediction}</strong>
                  </p>

                  <div className="kp-history-confidence">
                    <div className="kp-history-label">
                      Confidence {item.confidence}%
                    </div>
                    <div className="kp-history-progress">
                      <div
                        className="kp-history-progress-fill"
                        style={{ width: `${item.confidence}%` }}
                      ></div>
                    </div>
                  </div>

                  {item.result && (
                    <div className="kp-history-result">
                      Result: {item.result}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Record & Accuracy */}
            <div className="kp-history-record">
              <p>
                <strong>Record:</strong> {wins} Wins / {losses} Losses
              </p>
              <p>
                <strong>Accuracy:</strong> {accuracy}%
              </p>
            </div>

            {/* Button to Predictions page */}
            <div className="kp-history-button-wrapper">
              <button
                className="kp-history-button"
                onClick={() => navigate("/predictions")}
              >
                Go to Predictions
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
