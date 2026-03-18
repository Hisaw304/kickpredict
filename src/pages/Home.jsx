import React from "react";
import Hero from "../components/Hero";
import Predictions from "../components/Prediction";
import History from "../components/History";
// import HistoryPage from "../components/HistoryPage";
import AboutUs from "../components/AboutUs";
import WhyChooseUs from "../components/WhyChooseUs";
import Testimonials from "../components/Testimonials";
import Faq from "../components/FAQ";
import FooterCta from "../components/FooterCta";

const Home = () => {
  return (
    <div>
      <Hero />
      <Predictions />
      <History />
      <AboutUs />
      <WhyChooseUs />
      <Testimonials />
      <Faq />
      <FooterCta />
      {/* <HistoryPage /> */}
    </div>
  );
};

export default Home;
