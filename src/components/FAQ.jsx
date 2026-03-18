import { useState } from "react";
import { MessageCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "How accurate are KickPredict predictions?",
    a: "KickPredict maintains a strong accuracy rate by combining data analysis, team form, and expert insights. While no prediction is guaranteed, our consistency sets us apart.",
  },
  {
    q: "How often are predictions updated?",
    a: "Predictions are updated daily based on scheduled matches, ensuring users always have access to the latest insights.",
  },
  {
    q: "Do you cover all football leagues?",
    a: "We focus on major leagues including the Premier League, La Liga, Serie A, Bundesliga, and more for reliable and consistent predictions.",
  },
  {
    q: "Is KickPredict free to use?",
    a: "Yes, KickPredict provides free access to daily football predictions for all users.",
  },
  {
    q: "Can I trust the predictions?",
    a: "Our predictions are based on deep analysis and historical data. Thousands of users rely on KickPredict daily for insights.",
  },
  {
    q: "How can I contact support?",
    a: "You can reach us directly via Telegram for quick support and updates.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="kp-faq">
      <div className="kp-faq-container">
        {/* HEADER */}
        <div className="kp-faq-header">
          <h2>Frequently Asked Questions</h2>
          <p>
            Everything you need to know about KickPredict and how our platform
            works.
          </p>
        </div>

        <div className="kp-faq-grid">
          {/* LEFT */}
          <div className="kp-faq-list">
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = openIndex === i;

              return (
                <div key={i} className={`kp-faq-item ${isOpen ? "open" : ""}`}>
                  <button className="kp-faq-question" onClick={() => toggle(i)}>
                    <span>{item.q}</span>
                    <span className="kp-faq-icon">{isOpen ? "−" : "+"}</span>
                  </button>

                  <div className="kp-faq-answer">
                    {isOpen && <p>{item.a}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT */}
          <div className="kp-faq-support">
            <div className="kp-support-card">
              <div className="kp-support-icon">
                <MessageCircle size={40} />
              </div>

              <h3>Still have questions?</h3>

              <p>
                Join our Telegram for instant updates, support, and daily
                predictions.
              </p>

              <a href="#" className="kp-support-btn">
                Join Telegram
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
