import { Mail, Twitter, Instagram, Facebook, Send } from "lucide-react";

export default function Footer() {
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
          </div>
        </div>

        {/* LINKS */}
        <div className="kp-footer-links">
          <h4>Quick Links</h4>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/predictions">Predictions</a>
          <a href="/contact">Contact</a>
        </div>

        {/* NEWSLETTER */}
        <div className="kp-footer-newsletter">
          <h4>Newsletter</h4>
          <p>Get free weekly predictions and football insights.</p>

          <div className="kp-newsletter-form">
            <input type="email" placeholder="Enter your email" />
            <button>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="kp-footer-bottom">
        © {new Date().getFullYear()} KickPredict. All rights reserved.
      </div>
    </footer>
  );
}
