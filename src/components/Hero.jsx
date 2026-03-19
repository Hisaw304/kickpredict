import heroImg from "../assets/hero3.png";

export default function Hero() {
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
                <h3>87%</h3>
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
            <div className="kp-floating-card">
              <h4>Today's Top Pick</h4>
              <p>Sparta Prague Vs Alkmaar</p>
              <p>Prediction: Both Teams To Score</p>
              <p>Confidence 85%</p>
              <span>Overall Accuracy 87%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
