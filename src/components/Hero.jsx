import heroImg from "../assets/hero1.jpg";
import { supabase } from "../lib/supabase";
import React, { useEffect, useState } from "react";

export default function Hero() {
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [topPicks, setTopPicks] = useState([]);
  const [activePick, setActivePick] = useState(0);

  useEffect(() => {
    fetchOverallAccuracy();
    fetchTopPicks();
  }, []);

  /* =========================================
     OVERALL PREDICTION ACCURACY
  ========================================= */

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

    const wins = data.filter((item) => item.status === "win").length;
    const losses = data.filter((item) => item.status === "lose").length;

    const total = wins + losses;

    const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    setOverallAccuracy(accuracy);
  }

  /* =========================================
     TODAY'S TOP PICKS

     Gets the 2 highest-confidence
     pending predictions for today.

     If confidence is tied, the prediction
     created first comes first.
  ========================================= */

  async function fetchTopPicks() {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_date", today)
      .eq("status", "pending")
      .order("confidence", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      })
      .limit(2);

    if (error) {
      console.error("Error fetching top picks:", error);
      return;
    }

    setTopPicks(data || []);
    setActivePick(0);
  }

  /* =========================================
     AUTOMATIC TOP PICK SLIDER
  ========================================= */

  useEffect(() => {
    if (topPicks.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setActivePick((current) => {
        return (current + 1) % topPicks.length;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [topPicks.length]);

  /* =========================================
     MANUAL PICK SELECTION
  ========================================= */

  function changePick(index) {
    setActivePick(index);
  }

  return (
    <section className="kp-hero">
      <div className="kp-hero-con">
        {/* =========================================
            HERO LEFT CONTENT
        ========================================= */}

        <div className="kp-hero-container">
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

            {/* =========================================
                STATS
            ========================================= */}

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

        {/* =========================================
            RIGHT IMAGE
        ========================================= */}

        <div>
          <div className="kp-hero-image">
            <img src={heroImg} alt="football analytics" />

            {/* =========================================
                TOP PICKS SLIDER
            ========================================= */}

            {topPicks.length > 0 && (
              <div className="kp-floating-cards">
                <div
                  key={topPicks[activePick].id}
                  className="kp-floating-card kp-floating-card-slide"
                >
                  {/* CARD TOP */}
                  <div className="kp-floating-top">
                    <div className="kp-floating-badge">🔥 Top Pick</div>

                    {topPicks.length > 1 && (
                      <span className="kp-pick-number">
                        {activePick + 1}/{topPicks.length}
                      </span>
                    )}
                  </div>

                  <h4>Today's Top Pick</h4>

                  {/* PICK INFORMATION */}
                  <div className="kp-floating-info">
                    <p>
                      <strong>League:</strong> {topPicks[activePick].league}
                    </p>

                    <p>
                      <strong>Team:</strong> {topPicks[activePick].match}
                    </p>

                    <p>
                      <strong>Prediction:</strong>{" "}
                      {topPicks[activePick].prediction}
                    </p>

                    <p>
                      <strong>Confidence:</strong>{" "}
                      {topPicks[activePick].confidence}%
                    </p>
                  </div>

                  {/* OVERALL ACCURACY */}
                  <span className="kp-floating-accuracy">
                    Overall Prediction Accuracy {overallAccuracy}%
                  </span>

                  {/* SLIDER DOTS */}
                  {topPicks.length > 1 && (
                    <div className="kp-floating-dots">
                      {topPicks.map((pick, index) => (
                        <button
                          key={pick.id}
                          type="button"
                          className={index === activePick ? "active" : ""}
                          onClick={() => changePick(index)}
                          aria-label={`Show top pick ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
