import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FaTelegramPlane } from "react-icons/fa";

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [todayPredictions, setTodayPredictions] = useState([]);
  const [agentPredictions, setAgentPredictions] = useState([]);
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    fetchAllPredictions();
  }, []);

  async function fetchAllPredictions() {
    const today = new Date().toISOString().split("T")[0];

    const [todayResult, agentResult] = await Promise.all([
      supabase
        .from("predictions")
        .select("*")
        .eq("match_date", today)
        .order("created_at", { ascending: true }),

      supabase
        .from("agent_predictions")
        .select("*")
        .eq("match_date", today)
        .order("created_at", { ascending: true }),
    ]);

    if (todayResult.error) {
      console.error("Error fetching today's predictions:", todayResult.error);
    }

    if (agentResult.error) {
      console.error("Error fetching agent predictions:", agentResult.error);
    }

    const todayData = todayResult.data || [];
    const agentData = agentResult.data || [];

    setTodayPredictions(todayData);
    setAgentPredictions(agentData);

    // Automatically switch only when one source has no predictions.
    // If both have predictions, keep the normal default: Today's Predictions.
    const nextTab =
      todayData.length === 0 && agentData.length > 0 ? "agent" : "today";

    setActiveTab(nextTab);
    setPredictions(nextTab === "agent" ? agentData : todayData);
  }

  function handleTabChange(tab) {
    setActiveTab(tab);

    setPredictions(tab === "today" ? todayPredictions : agentPredictions);
  }

  const hasAnyPredictions =
    todayPredictions.length > 0 || agentPredictions.length > 0;

  return (
    <section className="football-pred-section">
      <div className="football-pred-container">
        {/* PREDICTION TABS — ONLY SHOW WHEN PREDICTIONS EXIST */}
        {hasAnyPredictions && (
          <div className="football-pred-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "today"}
              className={`football-pred-tab ${
                activeTab === "today" ? "is-active" : ""
              }`}
              onClick={() => handleTabChange("today")}
            >
              Matchday Picks
              {todayPredictions.length > 0 && (
                <span className="football-pred-tab-count">
                  {todayPredictions.length}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "agent"}
              className={`football-pred-tab ${
                activeTab === "agent" ? "is-active" : ""
              }`}
              onClick={() => handleTabChange("agent")}
            >
              Agent Predictions
              {agentPredictions.length > 0 && (
                <span className="football-pred-tab-count">
                  {agentPredictions.length}
                </span>
              )}
            </button>
          </div>
        )}

        <h2 className="football-pred-heading">
          {activeTab === "today" ? "Matchday Picks" : "Agent Predictions"}
        </h2>

        {predictions.length === 0 ? (
          <div className="football-pred-empty-state">
            <div className="football-pred-empty-intro">
              <span className="football-pred-empty-label">
                <span className="football-pred-empty-pointer">↓</span>
                {activeTab === "today"
                  ? "Matchday picks appear here when available"
                  : "Agent picks appear here when available"}
                <span className="football-pred-empty-pointer">↓</span>
              </span>

              <h3>
                {activeTab === "today"
                  ? "We don't publish matchday picks just to fill the board."
                  : "Our prediction agent takes a data-driven approach to every pick."}
              </h3>

              <p>
                {activeTab === "today"
                  ? "We analyze fixtures, team form, trends, and match data before selecting opportunities. Every pick is chosen to keep our predictions selective, data-driven, and meaningful."
                  : "The agent evaluates available match data, team performance, and statistical signals before producing predictions. Agent picks appear here whenever they are available."}
              </p>
            </div>

            <div className="football-pred-process">
              <div className="football-pred-process-item">
                <span>01</span>
                <div>
                  <h4>
                    {activeTab === "today" ? "We Analyze" : "Data Analysis"}
                  </h4>
                  <p>
                    {activeTab === "today"
                      ? "Team form, recent results, trends, and key match data."
                      : "The agent evaluates fixture data, team form, and relevant statistics."}
                  </p>
                </div>
              </div>

              <div className="football-pred-process-item">
                <span>02</span>
                <div>
                  <h4>
                    {activeTab === "today"
                      ? "We Filter"
                      : "Statistical Filtering"}
                  </h4>
                  <p>
                    {activeTab === "today"
                      ? "We focus on fixtures with stronger statistical signals and higher-confidence setups."
                      : "Available matches are assessed for meaningful statistical signals before picks are generated."}
                  </p>
                </div>
              </div>

              <div className="football-pred-process-item">
                <span>03</span>
                <div>
                  <h4>
                    {activeTab === "today" ? "We Publish" : "Agent Picks"}
                  </h4>
                  <p>
                    {activeTab === "today"
                      ? "Only selected predictions make it onto KickPredict when the analysis meets our standards."
                      : "Generated agent predictions appear here when they are ready to view."}
                  </p>
                </div>
              </div>
            </div>

            <div className="football-pred-empty-footer">
              <strong>
                {activeTab === "today"
                  ? "More matchday picks are coming soon."
                  : "More agent predictions are coming soon."}
              </strong>
              <span>Follow KickPredict on Telegram for the latest picks.</span>
            </div>
          </div>
        ) : (
          <div id="predictions" className="football-pred-panel">
            {/* PANEL HEADER */}
            <div className="football-pred-panel-header">
              <div className="football-pred-panel-date">
                <span className="football-pred-panel-label">
                  Prediction Date
                </span>

                <strong>
                  {new Date(
                    `${predictions[0].match_date}T00:00:00`
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </div>

              <div className="football-pred-hot">🔥 Hot Predictions</div>
            </div>

            {/* PREDICTION LIST */}
            <div className="football-pred-list">
              {/* DESKTOP COLUMN HEADER */}
              <div className="football-pred-list-head">
                <span>League</span>
                <span>Match</span>
                <span>Prediction</span>
                <span>Confidence</span>
                <span>Status</span>
              </div>

              {predictions.map((item) => (
                <div className="football-pred-row" key={item.id}>
                  {/* LEAGUE */}
                  <span className="football-pred-league">{item.league}</span>

                  {/* MATCH */}
                  <h3 className="football-pred-match">{item.match}</h3>

                  {/* PREDICTION */}
                  <p className="football-pred-pick">
                    <span>Prediction</span>
                    <strong>{item.prediction}</strong>
                  </p>

                  {/* CONFIDENCE */}
                  <div className="football-pred-confidence">
                    <div className="football-pred-confidence-label">
                      {item.confidence}%
                    </div>

                    <div className="football-pred-progress">
                      <div
                        className="football-pred-progress-fill"
                        style={{
                          width: `${item.confidence}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* STATUS */}
                  <span className={`football-pred-status ${item.status}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISCLAIMER */}
        <p className="football-pred-note">
          <strong>NB:</strong> These predictions are based on statistical
          analysis, team form, and historical data. While we aim for high
          accuracy, no prediction is guaranteed. Please gamble responsibly and
          use this information as guidance only.
        </p>

        {/* TELEGRAM CTA */}
        <div className="football-pred-telegram">
          <a
            href="https://t.me/kickprediction"
            target="_blank"
            rel="noopener noreferrer"
            className="football-pred-telegram-link"
          >
            <span className="football-pred-telegram-icon">
              <FaTelegramPlane />
            </span>

            <span>Join our Telegram channel</span>
          </a>
        </div>
      </div>
    </section>
  );
}
