import aboutImg from "../assets/about.jpg";
import { useNavigate } from "react-router-dom";
export default function AboutUs() {
  const navigate = useNavigate();
  return (
    <section className="kp-about">
      <div className="kp-about-container">
        {/* LEFT CONTENT */}
        <div className="kp-about-text">
          <h2 className="kp-about-title">
            About <span>KickPredict</span>
          </h2>

          <p className="kp-about-paragraph">
            Founded in Germany, KickPredict has grown into a trusted destination
            for football enthusiasts seeking reliable and data-driven match
            predictions. For over three years, we have dedicated ourselves to
            analyzing games with precision, combining statistical insights, team
            performance trends, and expert knowledge to deliver consistent
            results.
            <br />
            <br />
            Our journey began with a simple mission — to bring transparency and
            confidence to football predictions. Today, we proudly stand behind a
            strong track record of successful predictions and a growing
            community of users who rely on our platform daily.
            <br />
            <br />
            At KickPredict, we don’t just predict matches — we build trust.
            Every prediction is crafted with discipline and backed by analysis,
            ensuring our users receive insights they can depend on. As we
            continue to grow, our commitment remains the same: delivering
            accuracy, consistency, and value to every football fan who chooses
            us.
          </p>

          <div className="about-button-wrapper">
            <button className="about-button" onClick={() => navigate("/about")}>
              Learn More
            </button>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="kp-about-image">
          <img src={aboutImg} alt="KickPredict About" />
        </div>
      </div>
    </section>
  );
}
