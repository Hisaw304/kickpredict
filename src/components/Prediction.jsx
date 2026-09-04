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

        {/* NO PREDICTIONS */}
        {predictions.length === 0 && (
          <p className="football-pred-empty">
            No predictions available for today.
          </p>
        )}

        {/* PREDICTION GRID */}
        <div className="football-pred-grid" id="predictions">
          {predictions.map((item) => (
            <div key={item.id} className="football-pred-card">
              {/* HOT BADGE */}
              <div className="football-pred-hot">🔥 Hot</div>

              {/* CARD TOP */}
              <div className="football-pred-card-top">
                <span className="football-pred-league">{item.league}</span>

                <span className={`football-pred-status ${item.status}`}>
                  {item.status}
                </span>
              </div>

              {/* MATCH */}
              <h3 className="football-pred-match">{item.match}</h3>

              {/* PREDICTION */}
              <p className="football-pred-pick">
                Prediction: <strong>{item.prediction}</strong>
              </p>

              {/* CONFIDENCE */}
              <div className="football-pred-confidence">
                <div className="football-pred-confidence-label">
                  Confidence {item.confidence}%
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

              {/* CARD BOTTOM */}
              <div className="football-pred-card-bottom">
                <span className="football-pred-date">{item.match_date}</span>

                {item.result && (
                  <span className="football-pred-result">{item.result}</span>
                )}
              </div>
            </div>
          ))}
        </div>

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
