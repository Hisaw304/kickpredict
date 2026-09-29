import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Send, ArrowUpRight, CheckCheck } from "lucide-react";

export default function Hero() {
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [topPicks, setTopPicks] = useState([]);

  useEffect(() => {
    fetchOverallAccuracy();
    fetchTopPicks();
  }, []);

  /* =========================================
     OVERALL PREDICTION ACCURACY
  ========================================= */

  async function fetchOverallAccuracy() {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("predictions")
      .select("status")
      .lt("match_date", today);

    if (error) {
      console.error("Error fetching accuracy:", error);
      return;
    }

    const wins = data.filter((item) => item.status === "win").length;
    const losses = data.filter((item) => item.status === "lose").length;

    const total = wins + losses;

    const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    setOverallAccuracy(accuracy);
  }

  /* =========================================
     TODAY'S PREDICTIONS
  ========================================= */

  async function fetchTopPicks() {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_date", today)
      .eq("status", "pending")
      .order("confidence", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      })
      .limit(8);

    if (error) {
      console.error("Error fetching predictions:", error);
      return;
    }

    setTopPicks(data || []);
  }

  /* =========================================
     TELEGRAM CONVERSATION
  ========================================= */

  const telegramMessages = [
    {
      name: "Michael",
      message: "Thank you KickPredict, I edited the prediction and won 🔥",
      time: "10:42",
    },
    {
      name: "David",
      message: "KickPredict came through again today. That pick was spot on.",
      time: "10:46",
    },
    {
      name: "Samuel",
      message: "Been following the predictions for weeks. Very solid results.",
      time: "10:51",
    },
    {
      name: "Daniel",
      message: "That Over 2.5 prediction was exactly what I needed today.",
      time: "11:03",
    },
    {
      name: "Chris",
      message: "Won my ticket today. Appreciate the analysis 🙌",
      time: "11:08",
    },
    {
      name: "Victor",
      message: "The confidence levels actually make it easier to choose.",
      time: "11:15",
    },
    {
      name: "James",
      message: "Another good day. Keep the picks coming.",
      time: "11:21",
    },
  ];

  /* Duplicate messages so the ticker loops seamlessly */

  const tickerPicks = topPicks.length > 0 ? [...topPicks, ...topPicks] : [];

  const tickerMessages =
    tickerPicks.length > 0
      ? tickerPicks
      : [
          {
            id: "telegram",
            match: "Join KickPredict",
            league: "Telegram",
            prediction: "@kickpredict",
            confidence: null,
          },
        ];

  return (
    <section className="kp-hero">
      {/* =========================================
          TOP LIVE TICKER
      ========================================= */}

      <div className="kp-hero-ticker">
        <div className="kp-ticker-track">
          {tickerMessages.map((pick, index) => (
            <div
              className="kp-ticker-item"
              key={`${pick.id || index}-${index}`}
            >
              {pick.confidence ? (
                <>
                  <span className="kp-ticker-status">Today</span>

                  <span className="kp-ticker-match">{pick.match}</span>

                  <span className="kp-ticker-prediction">
                    {pick.prediction}
                  </span>

                  <span className="kp-ticker-confidence">
                    {pick.confidence}%
                  </span>
                </>
              ) : (
                <>
                  <span className="kp-ticker-telegram-icon">
                    <Send size={12} />
                  </span>

                  <span className="kp-ticker-telegram">
                    Join KickPredict on Telegram
                  </span>

                  <span className="kp-ticker-handle">@kickpredict</span>
                </>
              )}

              <span className="kp-ticker-divider" />
            </div>
          ))}
        </div>
      </div>

      <div className="kp-hero-con">
        {/* =========================================
            LEFT CONTENT
        ========================================= */}

        <div className="kp-hero-container">
          <div className="kp-hero-content">
            <div className="kp-hero-tag">Smart Football Insights</div>

            <h1 className="kp-hero-title">
              <span>Accurate</span> Football Predictions <span>Today</span>
            </h1>

            <p className="kp-hero-desc">
              KickPredict delivers data-driven football predictions designed to
              help fans and analysts make more informed decisions before every
              match.
            </p>

            <div className="kp-hero-actions">
              <a href="#predictions" className="kp-hero-btnn">
                <span>View Predictions</span>
                <ArrowUpRight size={17} />
              </a>

              <a
                href="https://t.me/kickpredict"
                target="_blank"
                rel="noopener noreferrer"
                className="kp-telegram-btn"
              >
                <Send size={16} />
                <span>Join Telegram</span>
              </a>
            </div>

            {/* =========================================
                STATS
            ========================================= */}

            <div className="kp-hero-stats">
              <div className="kp-stat">
                <h3>12K+</h3>
                <p>Predictions</p>
              </div>

              <div className="kp-stat">
                <h3>{overallAccuracy}%</h3>
                <p>Accuracy</p>
              </div>

              <div className="kp-stat">
                <h3>5K+</h3>
                <p>Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            RIGHT — TELEGRAM PHONE
        ========================================= */}

        <div className="kp-hero-visual">
          <div className="kp-phone">
            {/* PHONE TOP BAR */}

            <div className="kp-phone-top">
              <div className="kp-phone-profile">
                <div className="kp-phone-avatar">KP</div>

                <div>
                  <strong>KickPredict</strong>
                  <span>online</span>
                </div>
              </div>

              <div className="kp-phone-menu">
                <span />
                <span />
                <span />
              </div>
            </div>

            {/* TELEGRAM CHAT */}

            <div className="kp-chat-window">
              <div className="kp-chat-date">
                <span>Today</span>
              </div>

              <div className="kp-chat-messages">
                {[...telegramMessages, ...telegramMessages].map(
                  (item, index) => (
                    <div
                      className="kp-chat-message"
                      key={`${item.name}-${index}`}
                    >
                      <div className="kp-message-avatar">
                        {item.name.charAt(0)}
                      </div>

                      <div className="kp-message-content">
                        <strong>{item.name}</strong>

                        <div className="kp-message-bubble">
                          <p>{item.message}</p>

                          <span className="kp-message-time">
                            {item.time}
                            <CheckCheck size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* PHONE BOTTOM */}

            <div className="kp-phone-input">
              <span>Message</span>
              <div className="kp-send-button">
                <Send size={14} />
              </div>
            </div>
          </div>

          {/* TELEGRAM LABEL */}

          <div className="kp-telegram-label">
            <div className="kp-telegram-label-icon">
              <Send size={17} />
            </div>

            <div>
              <span>Follow the community</span>
              <strong>@kickpredict</strong>
            </div>

            <ArrowUpRight size={17} />
          </div>
        </div>
      </div>
    </section>
  );
}
