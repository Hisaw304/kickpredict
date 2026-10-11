import { useState } from "react";
import { supabase } from "../lib/supabase";
import AgentInput from "../components/prediction/AgentInput";
import QuickPrompts from "../components/prediction/QuickPrompts";
import PicksResults from "../components/prediction/PicksResults";
// import "../styles/agent.css";

function getMatchDate(pick) {
  const kickoff = pick.utcDate || pick.kickoff;

  if (!kickoff) {
    throw new Error(
      `A kickoff date is missing for ${pick.homeTeam} vs ${pick.awayTeam}.`
    );
  }

  const date = new Date(kickoff);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid kickoff date for ${pick.homeTeam} vs ${pick.awayTeam}.`
    );
  }

  return date.toISOString().slice(0, 10);
}

function getConfidence(pick) {
  let value = Number(pick.confidence);

  if (!Number.isFinite(value)) {
    value = Number(pick.probability);
  }

  if (!Number.isFinite(value)) {
    throw new Error(
      `Confidence is missing for ${pick.homeTeam} vs ${pick.awayTeam}.`
    );
  }

  // Support probability values represented as either 0–1 or 0–100.
  if (value >= 0 && value <= 1) {
    value *= 100;
  }

  if (value < 0 || value > 100) {
    throw new Error(
      `Confidence must be between 0 and 100 for ${pick.homeTeam} vs ${pick.awayTeam}.`
    );
  }

  return Math.round(value * 100) / 100;
}

export default function Agent() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState("");
  const [postedPickKeys, setPostedPickKeys] = useState([]);

  async function handleSubmit(customQuery) {
    const finalQuery = (customQuery ?? query).trim();

    if (!finalQuery || loading || posting) return;

    setQuery(finalQuery);
    setLoading(true);
    setError("");
    setPostError("");
    setPostSuccess("");
    setResponse(null);
    setPostedPickKeys([]);

    try {
      const url = `/api/agent?q=${encodeURIComponent(finalQuery)}`;

      console.log("Agent request:", finalQuery);
      console.log("Agent URL:", url);

      const apiResponse = await fetch(url);
      const contentType = apiResponse.headers.get("content-type") || "";
      const rawResponse = await apiResponse.text();

      console.log("Agent status:", apiResponse.status);
      console.log("Agent content type:", contentType);
      console.log("Agent raw response:", rawResponse);

      let data;

      try {
        data = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error("Could not parse Agent API response:", parseError);

        throw new Error(
          `Agent API returned an invalid response (${apiResponse.status}).`
        );
      }

      if (!apiResponse.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Agent request failed with status ${apiResponse.status}.`
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            "The prediction agent could not generate picks."
        );
      }

      setResponse(data);
    } catch (err) {
      console.error("Agent request failed:", err);

      setError(
        err?.message || "Something went wrong while generating your picks."
      );

      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  async function handlePostPicks(selectedPicks) {
    if (!selectedPicks?.length || posting) return;

    setPosting(true);
    setPostError("");
    setPostSuccess("");

    try {
      const alreadyPosted = new Set(postedPickKeys);

      const newPicks = selectedPicks.filter(
        (pick) => !alreadyPosted.has(`${pick.fixture}-${pick.market}`)
      );

      if (!newPicks.length) {
        setPostError("These picks have already been posted.");
        return;
      }

      const rows = newPicks.map((pick) => {
        if (!pick.homeTeam || !pick.awayTeam) {
          throw new Error("A selected pick is missing its home or away team.");
        }

        const league = pick.competition || pick.competitionCode;
        const prediction = pick.label || pick.market;

        if (!league || !prediction) {
          throw new Error(
            `League or prediction is missing for ${pick.homeTeam} vs ${pick.awayTeam}.`
          );
        }

        return {
          match: `${pick.homeTeam} vs ${pick.awayTeam}`,
          league,
          prediction,
          confidence: getConfidence(pick),
          match_date: getMatchDate(pick),
          status: "pending",
        };
      });

      const { error: insertError } = await supabase
        .from("agent_predictions")
        .insert(rows);

      if (insertError) throw insertError;

      const newKeys = newPicks.map((pick) => `${pick.fixture}-${pick.market}`);

      setPostedPickKeys((previous) => [...previous, ...newKeys]);

      setPostSuccess(
        `${newPicks.length} ${
          newPicks.length === 1 ? "pick has" : "picks have"
        } been saved to Agent Predictions.`
      );
    } catch (err) {
      console.error("Error posting agent picks:", err);

      setPostError(err?.message || "Unable to post the selected picks.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="kp-agent-page">
      <section className="kp-agent-hero">
        <div className="kp-agent-container">
          <div className="kp-agent-intro">
            <span className="kp-agent-eyebrow">KICKPREDICT AI</span>

            <h1>
              Ask for your
              <span> picks.</span>
            </h1>

            <p>
              Tell KickPredict what you're looking for. We'll research the
              fixtures, analyze the numbers and return the strongest qualifying
              selections.
            </p>
          </div>

          <AgentInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            loading={loading || posting}
          />

          <QuickPrompts onSelect={handleSubmit} disabled={loading || posting} />
        </div>
      </section>

      <section className="kp-agent-results-section">
        <div className="kp-agent-container">
          {loading && (
            <div className="kp-agent-loading">
              <div className="kp-loading-spinner" />

              <div>
                <strong>Researching fixtures</strong>
                <span>Analyzing form, markets and historical data...</span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="kp-agent-error" role="alert">
              <strong>Unable to generate picks</strong>
              <span>{error}</span>
            </div>
          )}

          {!loading && response && (
            <PicksResults
              response={response}
              onPostPicks={handlePostPicks}
              posting={posting}
              postedPickKeys={postedPickKeys}
              postError={postError}
              postSuccess={postSuccess}
            />
          )}
        </div>
      </section>
    </main>
  );
}
