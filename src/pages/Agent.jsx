import { useState } from "react";
import AgentInput from "../components/prediction/AgentInput";
import QuickPrompts from "../components/prediction/QuickPrompts";
import PicksResults from "../components/prediction/PicksResults";
// import "../styles/agent.css";

export default function Agent() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(customQuery) {
    const finalQuery = (customQuery ?? query).trim();

    if (!finalQuery || loading) return;

    setQuery(finalQuery);
    setLoading(true);
    setError("");
    setResponse(null);

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
            loading={loading}
          />

          <QuickPrompts onSelect={handleSubmit} disabled={loading} />
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
            <div className="kp-agent-error">
              <strong>Unable to generate picks</strong>

              <span>{error}</span>
            </div>
          )}

          {!loading && response && <PicksResults response={response} />}
        </div>
      </section>
    </main>
  );
}
