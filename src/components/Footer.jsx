import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Mail, Twitter, Instagram, Facebook, Send } from "lucide-react";
import { FaTelegramPlane } from "react-icons/fa";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleNewsletterSubmit = async () => {
    if (!email.trim()) {
      setMessage("Please enter your email.");
      setMessageType("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setMessage("Please enter a valid email address.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error) {
        if (
          error.message.toLowerCase().includes("duplicate") ||
          error.message.toLowerCase().includes("unique")
        ) {
          setMessage("This email is already subscribed.");
          setMessageType("error");
        } else {
          setMessage("Something went wrong. Please try again.");
          setMessageType("error");
        }
        return;
      }

      setMessage("Subscribed successfully 🎉");
      setMessageType("success");
      setEmail("");
    } catch (err) {
      setMessage("Something went wrong. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };
  return (
    <footer className="kp-footer">
      <div className="kp-footer-container">
        {/* BRAND */}
        <div className="kp-footer-brand">
          <a href="/" className="kp-footer-logo">
            KickPredict
          </a>
          <p>
            Smart football predictions powered by data. Stay ahead with accurate
            match insights and daily tips.
          </p>

          <div className="kp-socials">
            <a href="#">
              <Twitter size={20} />
            </a>
            <a href="#">
              <Instagram size={20} />
            </a>
            <a href="#">
              <Facebook size={20} />
            </a>
            <a href="https://t.me/kickprediction">
              <FaTelegramPlane size={20} />
            </a>
          </div>
        </div>

        {/* LINKS */}
        <div className="kp-footer-links">
          <h4>Quick Links</h4>
          <a href="/">Home</a>
          <a href="/predictions">Predictions</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </div>

        {/* NEWSLETTER */}
        <div className="kp-footer-newsletter">
          <h4>Newsletter</h4>
          <h3 className="mb-3">Stay Updated</h3>
          <p>
            Get daily football prediction and results straight to your inbox
          </p>

          <div className="kp-newsletter-form">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewsletterSubmit();
              }}
            />
            <button onClick={handleNewsletterSubmit} disabled={loading}>
              {loading ? "..." : <Send size={18} />}
            </button>
          </div>

          {message && (
            <p className={`kp-newsletter-message ${messageType}`}>{message}</p>
          )}
        </div>
      </div>

      {/* BOTTOM */}
      <div className="kp-footer-bottom">
        © {new Date().getFullYear()} KickPredict. All rights reserved.
      </div>
    </footer>
  );
}
