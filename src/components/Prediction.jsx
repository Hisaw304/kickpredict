import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FaTelegramPlane } from "react-icons/fa";

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    fetchPredictions();
  }, []);

  async function fetchPredictions() {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_date", today)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setPredictions(data);
    }
  }

  return (
    <section className="football-pred-section">
      <div className="football-pred-container">
        <h2 className="football-pred-heading">Today's Football Predictions</h2>

        {predictions.length === 0 ? (
          <div className="football-pred-empty-state">
            <div className="football-pred-empty-intro">
              <span className="football-pred-empty-label">
                <span className="football-pred-empty-pointer">↓</span>
                Predictions appear here when available
                <span className="football-pred-empty-pointer">↓</span>
              </span>

              <h3>We don't publish predictions just to fill the board.</h3>

              <p>
                We take time to analyze fixtures, team form, trends, and match
                data before selecting the strongest opportunities. The goal is
                to keep every prediction selective, data-driven, and meaningful.
              </p>
            </div>

            <div className="football-pred-process">
              <div className="football-pred-process-item">
                <span>01</span>

                <div>
                  <h4>We Analyze</h4>
                  <p>Team form, recent results, trends, and key match data.</p>
                </div>
              </div>

              <div className="football-pred-process-item">
                <span>02</span>

                <div>
                  <h4>We Filter</h4>
                  <p>
                    We focus on fixtures with stronger statistical signals and
                    higher-confidence setups.
                  </p>
                </div>
              </div>

              <div className="football-pred-process-item">
                <span>03</span>

                <div>
                  <h4>We Publish</h4>
                  <p>
                    Only selected predictions make it onto KickPredict when the
                    analysis meets our standards.
                  </p>
                </div>
              </div>
            </div>

            <div className="football-pred-empty-footer">
              <strong>Next predictions are coming soon.</strong>
              <span>Follow KickPredict on Telegram for the latest picks.</span>
            </div>
          </div>
        ) : (
          <div className="football-pred-panel">
            {/* PANEL HEADER */}
            <div className="football-pred-panel-header">
              <div className="football-pred-panel-date">
                <span className="football-pred-panel-label">
                  Prediction Date
                </span>

                <strong>
                  {new Date(
                    `${predictions[0].match_date}T00:00:00`
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </div>

              <div className="football-pred-hot">🔥 Hot Predictions</div>
            </div>

            {/* PREDICTION LIST */}
            <div className="football-pred-list">
              {/* DESKTOP COLUMN HEADER */}
              <div className="football-pred-list-head">
                <span>League</span>
                <span>Match</span>
                <span>Prediction</span>
                <span>Confidence</span>
                <span>Status</span>
              </div>

              {predictions.map((item) => (
                <div className="football-pred-row" key={item.id}>
                  {/* LEAGUE */}
                  <span className="football-pred-league">{item.league}</span>

                  {/* MATCH */}
                  <h3 className="football-pred-match">{item.match}</h3>

                  {/* PREDICTION */}
                  <p className="football-pred-pick">
                    <span>Prediction</span>
                    <strong>{item.prediction}</strong>
                  </p>

                  {/* CONFIDENCE */}
                  <div className="football-pred-confidence">
                    <div className="football-pred-confidence-label">
                      {item.confidence}%
                    </div>

                    <div className="football-pred-progress">
                      <div
                        className="football-pred-progress-fill"
                        style={{
                          width: `${item.confidence}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* STATUS */}
                  <span className={`football-pred-status ${item.status}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISCLAIMER */}
        <p className="football-pred-note">
          <strong>NB:</strong> These predictions are based on statistical
          analysis, team form, and historical data. While we aim for high
          accuracy, no prediction is guaranteed. Please gamble responsibly and
          use this information as guidance only.
        </p>

        {/* TELEGRAM CTA */}
        <div className="football-pred-telegram">
          <a
            href="https://t.me/kickprediction"
            target="_blank"
            rel="noopener noreferrer"
            className="football-pred-telegram-link"
          >
            <span className="football-pred-telegram-icon">
              <FaTelegramPlane />
            </span>

            <span>Join our Telegram channel</span>
          </a>
        </div>
      </div>
    </section>
  );
}
