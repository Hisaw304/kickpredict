import React from "react";
import eplImg from "../assets/epl.jpg";
import laligaImg from "../assets/laliga.jpg";
import bundesligaImg from "../assets/bundesliga.jpg";
import serieaImg from "../assets/seriea.jpg";

export default function AboutSEO() {
  return (
    <section className="kp-pseo">
      <div className="kp-pseo-container">
        <div className="kp-pseo-content">
          <span className="kp-pseo-tag">
            About KickPredict – Football Prediction Experts
          </span>

          <h2 className="kp-pseo-title">
            Data-Driven Football Predictions & Expert Match Analysis
          </h2>

          <p className="kp-pseo-text">
            KickPredict is a football prediction platform focused on delivering
            accurate, data-driven match insights across the world’s top leagues.
            Our goal is to help users make smarter decisions using reliable
            analysis, real match data, and consistent performance tracking.
          </p>

          <p className="kp-pseo-text">
            We analyze team form, historical results, and key statistical
            indicators to generate predictions across multiple betting markets,
            including match outcomes, goals, BTTS, corners, and more. Our
            coverage includes major competitions such as the English Premier
            League, La Liga, Bundesliga, Serie A, and other European leagues.
          </p>

          <p className="kp-pseo-sub">
            Discover how our predictions are generated and why thousands of
            users rely on KickPredict for daily football insights and analysis
          </p>

          <div className="kp-pseo-buttons">
            <a href="#about" className="kp-pseo-btn">
              Learn About Our Process
            </a>
            <a href="/contact" className="kp-pseo-btn kp-pseo-btn-secondary">
              Get In Touch
            </a>
          </div>
        </div>

        {/* RIGHT */}

        <div className="kp-pseo-grid">
          <div className="kp-pseo-card">
            <img src={bundesligaImg} alt="Bundesliga match predictions" />
            <span>Bundesliga</span>
          </div>

          <div className="kp-pseo-card">
            <img src={laligaImg} alt="La Liga football tips" />
            <span>La Liga</span>
          </div>

          <div className="kp-pseo-card">
            <img src={eplImg} alt="Premier League football predictions" />
            <span>Premier League</span>
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
