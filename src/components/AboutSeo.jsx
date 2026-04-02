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
            About KickPredict – Trusted Football Insights
          </span>

          <h2 className="kp-pseo-title">
            Data-Driven Football Predictions & Expert Match Analysis
          </h2>

          <p className="kp-pseo-text">
            KickPredict is a leading football prediction platform delivering
            accurate, data-driven match insights across top leagues worldwide.
            We combine historical results, team performance trends, and key
            statistical indicators to help football fans and analysts make
            smarter match decisions every day.
          </p>

          <p className="kp-pseo-text">
            Our coverage spans the Premier League, La Liga, Bundesliga, Serie A,
            Ligue 1, Eredivisie, Denmark Superliga, Romania Superliga, Portugal
            Liga, and Switzerland Super League. Whether you follow home wins,
            away wins, goals over/under, or corners predictions, KickPredict
            ensures every tip is backed by thorough analysis and real match
            data.
          </p>

          <p className="kp-pseo-sub">
            Explore our expert insights, learn how our predictions are
            generated, and see why thousands of users rely on KickPredict for
            daily football analysis.
          </p>
          <div className="kp-pseo-buttons">
            <a href="#predictions" className="kp-pseo-btn">
              Learn About Our Process
            </a>
            <a href="#history" className="kp-pseo-btn kp-pseo-btn-secondary">
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
