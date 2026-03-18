import React from "react";
import heroBg from "../assets/about-hero.png";
import Faq from "../components/FAQ";
import PageHero from "../components/PageHero";
import AboutUs from "../components/AboutUs";
import Insights from "../components/Insights";
import FooterCta from "../components/FooterCta";
const About = () => {
  return (
    <div>
      <PageHero
        bgImage={heroBg}
        line1="Learn More"
        line2="About"
        line3="Kick Predict"
      />
      <AboutUs />
      <Insights />
      <Faq />
      <FooterCta />
    </div>
  );
};

export default About;
