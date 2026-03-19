import React from "react";
import ContactCmp from "../components/ContactCmp";
import FooterCta from "../components/FooterCta";
import heroBg from "../assets/about.jpg";
import PageHero from "../components/PageHero";
const Contact = () => {
  return (
    <div>
      <PageHero bgImage={heroBg} line1="Get" line2="In" line3="Touch" />
      <ContactCmp />
      <FooterCta />
    </div>
  );
};

export default Contact;
