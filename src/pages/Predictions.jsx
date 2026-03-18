import React from "react";
import Prediction from "../components/Prediction";
import HistoryPage from "../components/HistoryPage";
import PageHero from "../components/PageHero";
import heroBg from "../assets/why.jpg";

const Predictions = () => {
  return (
    <div>
      <PageHero
        bgImage={heroBg}
        line1="Predictions"
        line2="And"
        line3="Results"
      />
      <Prediction />
      <HistoryPage />
    </div>
  );
};

export default Predictions;
