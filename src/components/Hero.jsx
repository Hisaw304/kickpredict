import heroImg from "../assets/hero3.png";
import { supabase } from "../lib/supabase";
import React, { useEffect, useState } from "react";

export default function Hero() {
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  useEffect(() => {
    fetchOverallAccuracy();
  }, []);

  async function fetchOverallAccuracy() {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("predictions")
      .select("status")
      .lt("match_date", today);

    if (error) {
      console.error("Error fetching accuracy:", error);
      return;
    }

    const wins = data.filter((f) => f.status === "win").length;
    const losses = data.filter((f) => f.status === "lose").length;
    const total = wins + losses;

    const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    setOverallAccuracy(accuracy);
  }
  return (
    <section className="kp-hero">
      <div className="kp-hero-con">
        <div className="kp-hero-container">
          {/* LEFT CONTENT */}
          <div className="kp-hero-content">
            <div className="kp-hero-tag">Smart Football Insights</div>

            <h1 className="kp-hero-title">
              <span>Accurate</span> Football Predictions <span>Today</span>
            </h1>

            <p className="kp-hero-desc">
              KickPredict delivers data-driven football predictions designed to
              help fans and analysts stay ahead with smarter match insights.
            </p>

            <a href="#predictions" className="kp-hero-btnn">
              View Predictions
            </a>

            {/* STATS */}
            <div className="kp-hero-stats">
              <div className="kp-stat">
                <h3>12K+</h3>
                <p>Predictions</p>
              </div>

              <div className="kp-stat">
                <h3>{overallAccuracy}%</h3>
                <p>Accuracy</p>
              </div>

              <div className="kp-stat">
                <h3>5K+</h3>
                <p>Users</p>
              </div>
            </div>
          </div>
        </div>
        <div>
          {/* RIGHT IMAGE */}
          <div className="kp-hero-image">
            <img src={heroImg} alt="football analytics" />

            {/* FLOATING CARD */}
            {/* FLOATING CARD */}
            <div className="kp-floating-card">
              <div className="kp-floating-badge">Top Pick</div>

              <h4>Today's Top Pick</h4>

              <div className="kp-floating-info">
                <p>
                  <strong>League:</strong> France Ligue 1
                </p>
                <p>
                  <strong>Team:</strong> Monaco vs Marseille
                </p>
                <p>
                  <strong>Prediction:</strong> Both Teams To Score
                </p>
                <p>
                  <strong>Confidence:</strong> 75%
                </p>
              </div>

              <span>Overall Prediction Accuracy {overallAccuracy}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
