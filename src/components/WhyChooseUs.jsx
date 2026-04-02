import bgImg from "../assets/why.jpg";
import { BarChart3, Users, Target, TrendingUp } from "lucide-react";

export default function WhyChooseUs() {
  return (
    <section className="kp-why" style={{ backgroundImage: `url(${bgImg})` }}>
      <div className="kp-why-overlay"></div>

      <div className="kp-why-container">
        {/* LEFT SIDE */}
        <div className="kp-why-text">
          <h2 className="kp-why-title">
            Why Choose <span>KickPredict</span> for Football Predictions?
          </h2>

          <p className="kp-why-paragraph">
            KickPredict provides accurate and data-driven football predictions,
            daily match tips, and expert betting insights for all types of bets.
            From home and away wins to goals, BTTS, corners, and accumulators,
            our platform helps you make smarter betting decisions with
            confidence.
          </p>

          <p className="kp-why-paragraph">
            Built for both beginners and experienced bettors, KickPredict
            combines advanced analysis, real match data, and consistent
            performance to deliver reliable football predictions every day
            across major leagues and competitions.
          </p>
        </div>

        {/* RIGHT SIDE CARDS */}
        <div className="kp-why-cards">
          <div className="kp-why-card">
            <BarChart3 size={28} />
            <h3>12K+</h3>
            <p>Data-driven football predictions analyzed</p>
          </div>

          <div className="kp-why-card">
            <Users size={28} />
            <h3>5K+</h3>
            <p>Users following our daily match tips</p>
          </div>

          <div className="kp-why-card">
            <Target size={28} />
            <h3>87%</h3>
            <p>Prediction accuracy across major leagues</p>
          </div>

          <div className="kp-why-card">
            <TrendingUp size={28} />
            <h3>3 Years</h3>
            <p>Consistent football betting insights and results</p>
          </div>
        </div>
      </div>
    </section>
  );
}
