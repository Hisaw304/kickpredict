import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

function getProbabilityClass(probability) {
  if (probability >= 85) return "very-high";
  if (probability >= 75) return "high";
  if (probability >= 65) return "medium";
  return "low";
}

function formatKickoff(kickoff) {
  if (!kickoff) {
    return {
      date: "Date unavailable",
      time: "Time unavailable",
    };
  }

  const value = new Date(kickoff);

  if (Number.isNaN(value.getTime())) {
    const parts = String(kickoff).split(",");

    return {
      date: parts.slice(0, 2).join(",").trim(),
      time: parts.slice(2).join(",").trim(),
    };
  }

  return {
    date: value.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: value.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function formatMarketLabel(label) {
  return String(label || "")
    .replace(/\bteam\b/gi, "Team")
    .toUpperCase();
}

function formatResearchDate(date) {
  if (!date) return "Date unavailable";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "Date unavailable";

  return value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ResearchMatchList({ title, matches = [] }) {
  return (
    <div className="kp-research-team">
      <div className="kp-research-team-heading">
        <strong>{title}</strong>
        <span>{matches.length} matches</span>
      </div>

      {matches.length ? (
        <div className="kp-research-matches">
          {matches.map((match, index) => (
            <div
              className="kp-research-match"
              key={match.id ?? `${match.date}-${index}`}
            >
              <div className="kp-research-match-top">
                <span>{formatResearchDate(match.date)}</span>

                <span className="kp-research-venue">
                  {match.venue === "home" ? "Home" : "Away"}
                </span>
              </div>

              <div className="kp-research-match-teams">
                <span>{match.homeTeam || "Unknown team"}</span>

                <strong>
                  {match.homeScore ?? "—"} : {match.awayScore ?? "—"}
                </strong>

                <span>{match.awayTeam || "Unknown team"}</span>
              </div>

              {match.competition && (
                <div className="kp-research-competition">
                  {match.competition}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="kp-research-empty">
          No historical match details available.
        </p>
      )}
    </div>
  );
}

export default function PickCard({ pick }) {
  const [expanded, setExpanded] = useState(false);
  const [showHistoricalMatches, setShowHistoricalMatches] = useState(false);
  const probability = Number(pick.probability) || 0;
  const probabilityClass = getProbabilityClass(probability);
  const kickoff = formatKickoff(pick.kickoff);

  const isCalibrated =
    pick.calibrationReliability &&
    pick.calibrationReliability !== "uncalibrated";

  return (
    <article className={`kp-pick-card ${expanded ? "is-expanded" : ""}`}>
      <div className="kp-pick-top">
        <span className="kp-pick-rank">
          #{String(pick.rank).padStart(2, "0")}
        </span>

        <span className={`kp-pick-confidence ${probabilityClass}`}>
          <ShieldCheck size={14} strokeWidth={2} />
          {pick.confidence}
        </span>
      </div>

      <div className="kp-pick-competition">{pick.competition}</div>

      <div className="kp-pick-match">
        <div className="kp-pick-team">
          <strong>{pick.homeTeam}</strong>
        </div>

        <span className="kp-pick-vs">VS</span>

        <div className="kp-pick-team">
          <strong>{pick.awayTeam}</strong>
        </div>
      </div>

      <div className="kp-pick-market">
        <span>Prediction</span>
        <strong>{formatMarketLabel(pick.label)}</strong>
      </div>

      <div className="kp-pick-score">
        <div className="kp-pick-probability">
          <strong>{pick.probabilityFormatted}</strong>
          <span>Probability</span>
        </div>

        <div className="kp-pick-confidence-icon">
          <TrendingUp size={18} />
        </div>
      </div>

      <div className="kp-pick-kickoff">
        <span>
          <CalendarDays size={14} />
          {kickoff.date}
        </span>

        <span>
          <Clock3 size={14} />
          {kickoff.time}
        </span>
      </div>

      <div className="kp-pick-footer">
        <div className="kp-pick-calibration">
          {isCalibrated ? (
            <>
              <span className="kp-calibrated-dot" />
              <span>Calibrated</span>
              <span className="kp-calibration-count">
                {pick.calibrationSamples} samples
              </span>
            </>
          ) : (
            <>
              <span className="kp-unverified-dot" />
              <span>Not yet calibrated</span>
            </>
          )}
        </div>

        <button
          type="button"
          className="kp-pick-why"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          Why this pick?
          <ChevronDown size={15} className={expanded ? "is-open" : ""} />
        </button>
      </div>

      {expanded && (
        <div className="kp-pick-analysis">
          <div className="kp-analysis-header">
            <div>
              <span>MODEL ANALYSIS</span>
              <strong>Why KickPredict selected this</strong>
            </div>
          </div>

          <div className="kp-analysis-grid">
            <div>
              <span>Expected goals</span>
              <strong>
                {pick.expectedGoals?.home ?? "—"} —{" "}
                {pick.expectedGoals?.away ?? "—"}
              </strong>
            </div>

            <div>
              <span>Total expected goals</span>
              <strong>{pick.expectedGoals?.total ?? "—"}</strong>
            </div>

            <div>
              <span>Historical samples</span>
              <strong>{pick.calibrationSamples || "—"}</strong>
            </div>

            <div>
              <span>Calibration</span>
              <strong>
                {isCalibrated
                  ? `${pick.observedRate ?? "—"}% observed`
                  : "Insufficient data"}
              </strong>
            </div>
          </div>

          {pick.calibrationGap !== null &&
            pick.calibrationGap !== undefined && (
              <div className="kp-analysis-calibration">
                <span>Calibration adjustment</span>
                <strong>
                  {pick.calibrationAdjustment > 0 ? "+" : ""}
                  {pick.calibrationAdjustment}%
                </strong>
              </div>
            )}

          <div className="kp-analysis-research">
            <div>
              <span>Research dataset</span>
              <strong>
                {pick.research?.homeMatches || 0} home-team matches
              </strong>
            </div>

            <div>
              <span>Research dataset</span>
              <strong>
                {pick.research?.awayMatches || 0} away-team matches
              </strong>
            </div>

            <div>
              <span>League research</span>
              <strong>{pick.research?.leagueMatches || 0} matches</strong>
            </div>
          </div>

          <div className="kp-research-section">
            <button
              type="button"
              className="kp-research-toggle"
              onClick={() => setShowHistoricalMatches((current) => !current)}
              aria-expanded={showHistoricalMatches}
            >
              <div className="kp-research-section-heading">
                <div>
                  <span>HISTORICAL EVIDENCE</span>
                  <strong>Matches behind this prediction</strong>
                </div>

                <span className="kp-research-total">
                  {(pick.research?.home?.length || 0) +
                    (pick.research?.away?.length || 0)}{" "}
                  records
                </span>
              </div>

              <ChevronDown
                size={18}
                className={showHistoricalMatches ? "is-open" : ""}
              />
            </button>

            {showHistoricalMatches && (
              <div className="kp-research-details">
                <ResearchMatchList
                  title={`${pick.homeTeam} — recent matches`}
                  matches={pick.research?.home || []}
                />

                <ResearchMatchList
                  title={`${pick.awayTeam} — recent matches`}
                  matches={pick.research?.away || []}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
