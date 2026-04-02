import React from "react";
import heroBg from "../assets/about-hero.png";
import Faq from "../components/FAQ";
import PageHero from "../components/PageHero";
import Insights from "../components/Insights";
import FooterCta from "../components/FooterCta";
import AboutSEO from "../components/AboutSeo";
import aboutImg from "../assets/about.jpg";
const About = () => {
  return (
    <div>
      <PageHero
        bgImage={heroBg}
        line1="Learn More"
        line2="About"
        line3="Kick Predict"
      />
      <AboutSEO />
      <section id="about" className="kp-about">
        <div className="kp-about-container">
          {/* LEFT CONTENT */}
          <div className="kp-about-text">
            <h2 className="kp-about-title">
              About <span>KickPredict</span>
            </h2>

            <p className="kp-about-paragraph">
              KickPredict has grown into a trusted destination for football
              enthusiasts seeking reliable and data-driven match predictions.
              For over three years, we have dedicated ourselves to analyzing
              games with precision, combining statistical insights, team
              performance trends, and expert knowledge to deliver consistent
              results.
              <br />
              <br />
              Our journey began with a simple mission — to bring transparency
              and confidence to football predictions. Today, we proudly stand
              behind a strong track record of successful predictions and a
              growing community of users who rely on our platform daily.
              <br />
              <br />
              At KickPredict, we don’t just predict matches — we build trust.
              Every prediction is crafted with discipline and backed by
              analysis, ensuring our users receive insights they can depend on.
              As we continue to grow, our commitment remains the same:
              delivering accuracy, consistency, and value to every football fan
              who chooses us.
            </p>
          </div>

          {/* RIGHT IMAGE */}
          <div className="kp-about-image">
            <img src={aboutImg} alt="KickPredict About" />
          </div>
        </div>
      </section>
      <Insights />
      <Faq />
      <FooterCta />
    </div>
  );
};

export default About;
