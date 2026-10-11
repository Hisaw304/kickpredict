import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import PickCard from "./PickCard";

export default function PicksResults({
  response,
  onPostPicks,
  posting = false,
  postedPickKeys = [],
  postError = "",
  postSuccess = "",
}) {
  const picks = response?.picks || [];
  const dataset = response?.dataset || {};

  const [selectedKeys, setSelectedKeys] = useState([]);

  const postedKeys = new Set(postedPickKeys);

  const selectedPicks = picks.filter((pick) =>
    selectedKeys.includes(`${pick.fixture}-${pick.market}`)
  );

  function togglePick(pick) {
    const key = `${pick.fixture}-${pick.market}`;

    if (postedKeys.has(key) || posting) return;

    setSelectedKeys((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key]
    );
  }

  function toggleAll() {
    const availablePicks = picks.filter(
      (pick) => !postedKeys.has(`${pick.fixture}-${pick.market}`)
    );

    const availableKeys = availablePicks.map(
      (pick) => `${pick.fixture}-${pick.market}`
    );

    const allSelected =
      availableKeys.length > 0 &&
      availableKeys.every((key) => selectedKeys.includes(key));

    setSelectedKeys((previous) =>
      allSelected
        ? previous.filter((key) => !availableKeys.includes(key))
        : [...new Set([...previous, ...availableKeys])]
    );
  }

  async function handlePost() {
    if (!selectedPicks.length || posting) return;

    await onPostPicks(selectedPicks);

    // Keep selections visible after posting so the posted status is clear.
  }

  const availableCount = picks.filter(
    (pick) => !postedKeys.has(`${pick.fixture}-${pick.market}`)
  ).length;

  const allAvailableSelected =
    availableCount > 0 &&
    picks
      .filter((pick) => !postedKeys.has(`${pick.fixture}-${pick.market}`))
      .every((pick) => selectedKeys.includes(`${pick.fixture}-${pick.market}`));

  return (
    <div className="kp-picks-results">
      <div className="kp-results-header">
        <div>
          <span className="kp-results-eyebrow">PREDICTION RESULTS</span>
          <h2>{response.message}</h2>
        </div>

        <div className="kp-results-meta">
          <span>{dataset.predictions || 0} matches analyzed</span>
          <span>{dataset.markets || 0} markets evaluated</span>
        </div>
      </div>

      {dataset.fallbackUsed && (
        <div className="kp-fallback-notice">
          <span>Next available fixtures</span>
          <strong>{dataset.fallbackDate}</strong>
        </div>
      )}

      {picks.length > 0 ? (
        <>
          <div className="kp-agent-post-toolbar">
            <label className="kp-agent-select-all">
              <input
                type="checkbox"
                checked={allAvailableSelected}
                onChange={toggleAll}
                disabled={posting || availableCount === 0}
              />

              <span>Select all available ({availableCount})</span>
            </label>

            <button
              type="button"
              className="kp-agent-post-button"
              onClick={handlePost}
              disabled={posting || selectedPicks.length === 0}
            >
              {posting ? (
                <>
                  <Loader2 className="spin" size={17} />
                  Posting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Post selected ({selectedPicks.length})
                </>
              )}
            </button>
          </div>

          {postError && (
            <div className="kp-agent-post-error" role="alert">
              {postError}
            </div>
          )}

          {postSuccess && (
            <div className="kp-agent-post-success" role="status">
              <Check size={17} />
              {postSuccess}
            </div>
          )}

          <div className="kp-picks-grid">
            {picks.map((pick) => {
              const key = `${pick.fixture}-${pick.market}`;
              const isPosted = postedKeys.has(key);
              const isSelected = selectedKeys.includes(key);

              return (
                <div
                  key={key}
                  className={`kp-agent-pick-wrapper ${
                    isSelected ? "is-selected" : ""
                  } ${isPosted ? "is-posted" : ""}`}
                >
                  <label className="kp-agent-pick-select">
                    <input
                      type="checkbox"
                      checked={isSelected || isPosted}
                      onChange={() => togglePick(pick)}
                      disabled={isPosted || posting}
                    />

                    <span>
                      {isPosted
                        ? "Posted"
                        : isSelected
                        ? "Selected"
                        : "Select pick"}
                    </span>
                  </label>

                  <PickCard pick={pick} />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="kp-empty-results">
          <h3>No qualifying picks</h3>
          <p>
            Try a wider time range, lower confidence level, or another market.
          </p>
        </div>
      )}
    </div>
  );
}
