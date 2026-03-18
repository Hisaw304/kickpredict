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
            Why Choose <span>KickPredict</span>
          </h2>

          <p className="kp-why-paragraph">
            At KickPredict, we combine data, experience, and precision to
            deliver reliable football predictions. With a strong track record
            and a growing community of users, our platform is built to give you
            confidence in every match insight. We focus on accuracy,
            consistency, and real value — helping you stay ahead with smarter
            predictions.
          </p>
        </div>

        {/* RIGHT SIDE CARDS */}
        <div className="kp-why-cards">
          <div className="kp-why-card">
            <BarChart3 size={28} />
            <h3>12K+</h3>
            <p>Predictions analyzed with data-driven accuracy</p>
          </div>

          <div className="kp-why-card">
            <Users size={28} />
            <h3>5K+</h3>
            <p>Active users trusting our daily predictions</p>
          </div>

          <div className="kp-why-card">
            <Target size={28} />
            <h3>87%</h3>
            <p>Average prediction accuracy across major leagues</p>
          </div>

          <div className="kp-why-card">
            <TrendingUp size={28} />
            <h3>3 Years</h3>
            <p>Proven experience delivering consistent results</p>
          </div>
        </div>
      </div>
    </section>
  );
}
