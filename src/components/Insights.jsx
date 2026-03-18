import bgImage from "../assets/insights-bg.jpg";
import {
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Globe2,
  Target,
  BarChart3,
} from "lucide-react";

const insightCards = [
  {
    icon: <FlaskConical size={26} />,
    title: "Our Methodology",
    text: "At KickPredict, every prediction is built on careful analysis. We study team form, player trends, match history, motivation, and key statistics before publishing any insight.",
  },
  {
    icon: <ShieldCheck size={26} />,
    title: "Transparency",
    text: "We believe users deserve clear and honest football insights. Our goal is not to overpromise, but to provide thoughtful predictions backed by logic, consistency, and visible performance.",
  },
  {
    icon: <Sparkles size={26} />,
    title: "What Makes Us Different",
    text: "KickPredict focuses on quality over noise. Instead of pushing every possible match, we scan fixtures carefully and highlight games with stronger analytical value and better potential outcomes.",
  },
  {
    icon: <Globe2 size={26} />,
    title: "Supported Leagues",
    text: "We cover all leagues, but our attention stays on matches with the strongest opportunities. From top European competitions to wider global fixtures, we filter for better predictive value.",
  },
  {
    icon: <Target size={26} />,
    title: "Our Mission",
    text: "Our mission is simple: help football fans make smarter decisions through data-driven predictions, reliable insights, and a platform built on trust, clarity, and consistency.",
  },
  {
    icon: <BarChart3 size={26} />,
    title: "Performance & Stats",
    text: "We constantly monitor prediction outcomes, user engagement, and historical trends. That ongoing review helps us improve accuracy and maintain a standard users can keep relying on.",
  },
];

export default function Insights() {
  return (
    <section
      className="kp-insights"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="kp-insights-overlay"></div>

      <div className="kp-insights-container">
        <div className="kp-insights-header">
          <h2 className="kp-insights-title">Why KickPredict Stands Out</h2>
          <p className="kp-insights-subtitle">
            Discover the principles, process, and performance behind our
            football predictions — built to deliver clarity, trust, and smarter
            match insights every day.
          </p>
        </div>

        <div className="kp-insights-grid">
          {insightCards.map((card, index) => (
            <div key={index} className="kp-insight-card">
              <div className="kp-insight-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>

        <div className="kp-insights-cta">
          <a href="/predictions" className="kp-insights-btn primary">
            View Today’s Predictions
          </a>

          <a href="#" className="kp-insights-btn secondary">
            Join Our Telegram Channel
          </a>
        </div>
      </div>
    </section>
  );
}
