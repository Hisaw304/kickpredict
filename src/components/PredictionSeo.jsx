import React from "react";
import eplImg from "../assets/epl.jpg";
import laligaImg from "../assets/laliga.jpg";
import bundesligaImg from "../assets/bundesliga.jpg";
import serieaImg from "../assets/seriea.jpg";

export default function PredictionSeo() {
  return (
    <section className="kp-pseo">
      <div className="kp-pseo-container">
        {/* LEFT */}
        <div className="kp-pseo-content">
          <span className="kp-pseo-tag">
            Today’s Football Predictions & League Picks
          </span>

          <h2 className="kp-pseo-title">
            Today’s Football Predictions, Match Tips & Betting Insights
          </h2>

          <p className="kp-pseo-text">
            KickPredict delivers today’s football predictions, expert match
            tips, and data-driven betting insights across all major betting
            markets. From home and away wins to goals, BTTS, corners, and
            accumulators, our platform helps you stay ahead with smarter daily
            picks.
          </p>

          <p className="kp-pseo-text">
            We cover top football leagues including the English Premier League,
            La Liga, Bundesliga, Serie A, Ligue 1, and many other European
            competitions. Every prediction is based on team form, head-to-head
            records, match trends, and key statistical analysis to ensure
            consistency and reliability.
          </p>

          <p className="kp-pseo-sub">
            Explore today’s football tips, track past results, and analyze
            performance with full match history and accuracy insights.
          </p>

          <div className="kp-pseo-buttons">
            <a href="#predictions" className="kp-pseo-btn">
              View Today’s Predictions
            </a>
            <a href="#history" className="kp-pseo-btn kp-pseo-btn-secondary">
              See Past Results
            </a>
          </div>
        </div>

        {/* RIGHT */}
        <div className="kp-pseo-grid">
          <div className="kp-pseo-card">
            <img src={eplImg} alt="Premier League football predictions" />
            <span>Premier League</span>
          </div>

          <div className="kp-pseo-card">
            <img src={laligaImg} alt="La Liga football tips" />
            <span>La Liga</span>
          </div>

          <div className="kp-pseo-card">
            <img src={bundesligaImg} alt="Bundesliga match predictions" />
            <span>Bundesliga</span>
          </div>

          <div className="kp-pseo-card">
            <img src={serieaImg} alt="Serie A football picks" />
            <span>Serie A</span>
          </div>
        </div>
      </div>
    </section>
  );
}
