import React from "react";
import Prediction from "../components/Prediction";
import HistoryPage from "../components/HistoryPage";
import PageHero from "../components/PageHero";
import heroBg from "../assets/why.jpg";
import PredictionSeo from "../components/PredictionSeo";

const Predictions = () => {
  return (
    <div>
      <PageHero
        bgImage={heroBg}
        line1="Predictions"
        line2="And"
        line3="Results"
      />
      <PredictionSeo />
      <Prediction />
      <HistoryPage />
      <section className="kp-footer-cta">
        <div className="kp-footer-cta-container">
          <div className="kp-footer-cta-content">
            <span className="kp-footer-cta-tag">KickPredict Community</span>

            <h2>Stay Ahead With Smarter Football Predictions</h2>

            <p>
              Join thousands of football fans who trust KickPredict for daily
              match insights, accurate tips, and consistent prediction updates.
            </p>

            <div className="kp-footer-cta-actions">
              <a href="#predictions" className="kp-footer-cta-btn primary">
                View Today’s Predictions
              </a>

              <a
                href="https://t.me/kickprediction"
                className="kp-footer-cta-btn secondary"
              >
                Join Telegram Channel
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Predictions;
