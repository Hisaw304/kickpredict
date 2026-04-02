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
            Today’s Football Tips & League Picks
          </span>

          <h2 className="kp-pseo-title">
            Accurate Football Predictions, Match Tips & Results
          </h2>

          <p className="kp-pseo-text">
            KickPredict provides today’s football predictions and expert match
            tips across multiple football betting markets including home win,
            away win, over 1.5 goals, over 2.5 goals, both teams to score, draw
            or over 2.5, home or over 2.5, away or over 2.5, home over 0.5, away
            over 0.5, and corners predictions. Our goal is to deliver smarter,
            data-driven football insights for users seeking reliable daily
            football picks.
          </p>

          <p className="kp-pseo-text">
            We cover a wide range of leagues including the Premier League, La
            Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Denmark Superliga,
            Portugal Liga, Romania Superliga, Switzerland Super League, and
            other competitive football leagues across Europe. Every pick is
            backed by form analysis, team performance trends, match patterns,
            and key statistical indicators.
          </p>

          <p className="kp-pseo-sub">
            Track today’s football predictions and past results with full match
            history, completed scores, and accuracy metrics. Click below to view
            today’s picks or past outcomes.
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
