import PickCard from "./PickCard";

export default function PicksResults({ response }) {
  const picks = response?.picks || [];
  const dataset = response?.dataset || {};

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
        <div className="kp-picks-grid">
          {picks.map((pick) => (
            <PickCard key={`${pick.fixture}-${pick.market}`} pick={pick} />
          ))}
        </div>
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
