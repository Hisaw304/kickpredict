import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";

function getProbabilityClass(probability) {
  if (probability >= 85) return "very-high";
  if (probability >= 75) return "high";
  if (probability >= 65) return "medium";

  return "low";
}

export default function PickCard({ pick }) {
  const probability = Number(pick.probability) || 0;

  const probabilityClass = getProbabilityClass(probability);

  return (
    <article className="kp-pick-card">
      <div className="kp-pick-top">
        <span className="kp-pick-rank">#{pick.rank}</span>

        <span className={`kp-pick-confidence ${probabilityClass}`}>
          <ShieldCheck size={14} />
          {pick.confidence}
        </span>
      </div>

      <div className="kp-pick-competition">{pick.competition}</div>

      <div className="kp-pick-teams">
        <span>{pick.homeTeam}</span>

        <span className="kp-vs">vs</span>

        <span>{pick.awayTeam}</span>
      </div>

      <div className="kp-pick-market">
        <span>Prediction</span>

        <strong>{pick.label}</strong>
      </div>

      <div className="kp-pick-bottom">
        <div className="kp-pick-probability">
          <strong>{pick.probabilityFormatted}</strong>

          <span>Model confidence</span>
        </div>

        <div className="kp-pick-details">
          <span>
            <CalendarDays size={14} />

            {pick.kickoff?.split(",").slice(0, 2).join(",")}
          </span>

          <span>
            <Clock3 size={14} />

            {pick.kickoff?.split(",").pop()?.trim()}
          </span>
        </div>
      </div>

      {pick.calibrationReliability !== "uncalibrated" && (
        <div className="kp-pick-calibration">
          <span>Calibrated</span>

          <span>{pick.calibrationSamples} historical samples</span>
        </div>
      )}
    </article>
  );
}
