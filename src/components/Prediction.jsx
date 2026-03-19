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
    <section className="kp-predictions">
      <div className="kp-predictions-container">
        <h2 className="kp-predictions-title">Today's Football Predictions</h2>

        {/* SHOW MESSAGE IF NO PREDICTIONS */}
        {predictions.length === 0 && (
          <p className="kp-no-predictions">
            No predictions available for today.
          </p>
        )}

        <div className="kp-predictions-grid" id="predictions">
          {predictions.map((item) => (
            <div key={item.id} className="kp-prediction-card">
              {/* 🔥 HOT BADGE */}
              <div className="kp-hot-badge">🔥 Hot</div>

              <div className="kp-card-top">
                <span className="kp-league">{item.league}</span>
                <span className={`kp-status ${item.status}`}>
                  {item.status}
                </span>
              </div>

              <h3 className="kp-match">{item.match}</h3>

              <p className="kp-prediction">
                Prediction: <strong>{item.prediction}</strong>
              </p>

              <div className="kp-confidence">
                <div className="kp-confidence-label">
                  Confidence {item.confidence}%
                </div>

                <div className="kp-progress">
                  <div
                    className="kp-progress-fill"
                    style={{ width: `${item.confidence}%` }}
                  ></div>
                </div>
              </div>

              <div className="kp-card-bottom">
                <span className="kp-date">{item.match_date}</span>

                {item.result && (
                  <span className="kp-result">{item.result}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ✅ NB NOTE */}
        <p className="kp-note">
          <strong>NB:</strong> These predictions are based on statistical
          analysis, team form, and historical data. While we aim for high
          accuracy, no prediction is guaranteed. Please gamble responsibly and
          use this information as guidance only.
        </p>
        {/* TELEGRAM CTA */}
        <div className="kp-telegram">
          <a
            href="https://t.me/kickprediction"
            target="_blank"
            rel="noopener noreferrer"
            className="kp-telegram-link"
          >
            <span className="kp-telegram-icon">
              <FaTelegramPlane />
            </span>
            join our Telegram channel
          </a>
        </div>
      </div>
    </section>
  );
}
