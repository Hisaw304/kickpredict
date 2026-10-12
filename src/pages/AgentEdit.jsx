import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Pencil,
  Trash2,
  Clock3,
  CheckCircle2,
  XCircle,
  CalendarDays,
  X,
  Save,
  Loader2,
  RefreshCw,
  Bot,
} from "lucide-react";

const STANDARD_LEAGUES = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Serie B",
  "Bundesliga",
  "2. Bundesliga",
  "Belgian Pro League",
  "Ligue 1",
  "Ligue 2",
  "Romanian SuperLiga",
  "Switzerland SuperLeague",
  "Denmark Superliga",
  "Champions League",
  "Europa League",
  "Conference League",
  "Eredivisie",
  "Primeira Liga",
  "Championship",
];

const STANDARD_PREDICTIONS = [
  "Home or Over 2.5 Goals",
  "Away or Over 2.5 Goals",
  "Draw or Over 2.5 Goals",
  "Over 1.5 Goals",
  "Over 2.5 Goals",
  "Over 6.5 Corners",
  "Over 7.5 Corners",
  "Over 8.5 Corners",
  "Away 1up Goals",
  "Home 1up Goals",
  "Away 2up Goals",
  "Home 2up Goals",
  "Both Teams To Score",
  "Home Win",
  "Draw",
  "Away Win",
  "Home or Draw",
  "Home or Away",
  "Draw or Away",
];

const INITIAL_FORM = {
  match: "",
  league: "",
  custom_league: "",
  prediction: "",
  custom_prediction: "",
  confidence: "",
  match_date: "",
  status: "pending",
  result: "",
};

export default function AgentEdit() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPrediction, setEditingPrediction] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const normalizeStatus = (status) =>
    String(status || "pending")
      .trim()
      .toLowerCase();

  async function fetchPredictions(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("agent_predictions")
        .select("*")
        .order("match_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setPredictions(data || []);
    } catch (err) {
      console.error("Error fetching agent predictions:", err);
      setError(err.message || "Unable to load agent predictions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchPredictions();
  }, []);

  const pendingCount = useMemo(
    () =>
      predictions.filter((item) => normalizeStatus(item.status) === "pending")
        .length,
    [predictions]
  );

  const winCount = useMemo(
    () =>
      predictions.filter((item) => normalizeStatus(item.status) === "win")
        .length,
    [predictions]
  );

  const loseCount = useMemo(
    () =>
      predictions.filter((item) => normalizeStatus(item.status) === "lose")
        .length,
    [predictions]
  );

  const activePredictions = useMemo(
    () =>
      predictions.filter((item) => normalizeStatus(item.status) === "pending"),
    [predictions]
  );

  const historyPredictions = useMemo(
    () =>
      predictions.filter((item) =>
        ["win", "lose"].includes(normalizeStatus(item.status))
      ),
    [predictions]
  );

  const displayedPredictions =
    activeTab === "active" ? activePredictions : historyPredictions;

  const groupedPredictions = useMemo(
    () =>
      displayedPredictions.reduce((groups, prediction) => {
        const date = prediction.match_date || "unknown";

        if (!groups[date]) groups[date] = [];

        groups[date].push(prediction);
        return groups;
      }, {}),
    [displayedPredictions]
  );

  function formatDate(date) {
    if (!date || date === "unknown") return "Date unavailable";

    const parsedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleEdit(prediction) {
    const savedLeague = prediction.league || "";
    const savedPick = prediction.prediction || "";

    const customLeague = !STANDARD_LEAGUES.includes(savedLeague);
    const customPick = !STANDARD_PREDICTIONS.includes(savedPick);

    setEditingPrediction(prediction);

    setFormData({
      match: prediction.match || "",
      league: customLeague ? "Other" : savedLeague,
      custom_league: customLeague ? savedLeague : "",
      prediction: customPick ? "Other" : savedPick,
      custom_prediction: customPick ? savedPick : "",
      confidence:
        prediction.confidence !== null && prediction.confidence !== undefined
          ? String(prediction.confidence)
          : "",
      match_date: prediction.match_date || "",
      status: normalizeStatus(prediction.status),
      result: prediction.result || "",
    });

    setError("");
    setNotice("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingPrediction(null);
    setFormData(INITIAL_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!editingPrediction || saving) return;

    const league =
      formData.league === "Other"
        ? formData.custom_league.trim()
        : formData.league.trim();

    const prediction =
      formData.prediction === "Other"
        ? formData.custom_prediction.trim()
        : formData.prediction.trim();

    const confidence = Number(formData.confidence);

    if (!league || !prediction || !formData.match.trim()) {
      setError("Please complete the match, league and prediction fields.");
      return;
    }

    if (
      formData.confidence === "" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 100
    ) {
      setError("Confidence must be between 0 and 100.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        match: formData.match.trim(),
        league,
        prediction,
        confidence,
        match_date: formData.match_date,
        status: normalizeStatus(formData.status),
        result: formData.result.trim(),
      };

      const { data, error: updateError } = await supabase
        .from("agent_predictions")
        .update(payload)
        .eq("id", editingPrediction.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setPredictions((previous) =>
        previous.map((item) => (item.id === editingPrediction.id ? data : item))
      );

      setShowModal(false);
      setEditingPrediction(null);
      setFormData(INITIAL_FORM);
      setNotice("Prediction updated successfully.");
    } catch (err) {
      console.error("Error updating agent prediction:", err);
      setError(err.message || "Unable to save your changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this agent prediction? This cannot be undone."
    );

    if (!confirmed || deletingId !== null) return;

    setDeletingId(id);
    setError("");
    setNotice("");

    try {
      const { error: deleteError } = await supabase
        .from("agent_predictions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setPredictions((previous) => previous.filter((item) => item.id !== id));

      setNotice("Prediction deleted successfully.");
    } catch (err) {
      console.error("Error deleting agent prediction:", err);
      setError(err.message || "Unable to delete this prediction.");
    } finally {
      setDeletingId(null);
    }
  }

  function PredictionCard({ prediction }) {
    const status = normalizeStatus(prediction.status);

    return (
      <div className="kp-prediction-card">
        <div className="kp-prediction-main">
          <div className="kp-prediction-top">
            <span className="kp-prediction-league">{prediction.league}</span>

            <span
              className={`kp-prediction-status ${
                status === "pending"
                  ? "pending"
                  : status === "win"
                  ? "win"
                  : "lose"
              }`}
            >
              {status === "pending" && <Clock3 size={13} />}
              {status === "win" && <CheckCircle2 size={13} />}
              {status === "lose" && <XCircle size={13} />}
              {status}
            </span>
          </div>

          <h3>{prediction.match}</h3>

          <div className="kp-prediction-details">
            <div>
              <span>Prediction</span>
              <strong>{prediction.prediction}</strong>
            </div>

            <div>
              <span>Confidence</span>
              <strong>{prediction.confidence}%</strong>
            </div>

            <div>
              <span>Result</span>
              <strong>{prediction.result || "Not settled"}</strong>
            </div>
          </div>
        </div>

        <div className="kp-prediction-actions">
          <button
            type="button"
            onClick={() => handleEdit(prediction)}
            title="Edit prediction"
            aria-label={`Edit ${prediction.match}`}
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleDelete(prediction.id)}
            title="Delete prediction"
            aria-label={`Delete ${prediction.match}`}
            className="delete"
            disabled={deletingId === prediction.id}
          >
            {deletingId === prediction.id ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="kp-dashboard">
      <div className="kp-dashboard-container">
        <header className="kp-dashboard-header">
          <div>
            <span className="kp-dashboard-label">AI PREDICTIONS</span>

            <h1>
              Agent <span>Edit</span>
            </h1>

            <p>
              Review your agent-generated picks, update selections, and remove
              predictions you don't want to keep.
            </p>
          </div>

          <button
            type="button"
            className="kp-add-prediction"
            onClick={() => fetchPredictions(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            Refresh Picks
          </button>
        </header>

        <section className="kp-dashboard-stats">
          <div className="kp-stat-card">
            <div className="kp-stat-icon">
              <Bot size={20} />
            </div>
            <div>
              <span>Total Agent Picks</span>
              <strong>{predictions.length}</strong>
            </div>
          </div>

          <div className="kp-stat-card">
            <div className="kp-stat-icon pending">
              <Clock3 size={20} />
            </div>
            <div>
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div className="kp-stat-card">
            <div className="kp-stat-icon win">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span>Won</span>
              <strong>{winCount}</strong>
            </div>
          </div>

          <div className="kp-stat-card">
            <div className="kp-stat-icon lose">
              <XCircle size={20} />
            </div>
            <div>
              <span>Lost</span>
              <strong>{loseCount}</strong>
            </div>
          </div>
        </section>

        {error && !showModal && (
          <div className="kp-agent-error" role="alert">
            <strong>Something went wrong</strong>
            <span>{error}</span>
            <button type="button" onClick={() => fetchPredictions(true)}>
              Try again
            </button>
          </div>
        )}

        <div className="kp-dashboard-tabs">
          <button
            type="button"
            className={activeTab === "active" ? "active" : ""}
            onClick={() => setActiveTab("active")}
          >
            Active Predictions
            <span>{pendingCount}</span>
          </button>

          <button
            type="button"
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            History
            <span>{historyPredictions.length}</span>
          </button>
        </div>

        {notice && (
          <p className="kp-agent-notice" role="status">
            {notice}
          </p>
        )}

        <section className="kp-dashboard-content">
          {loading ? (
            <div className="kp-dashboard-loading">
              <Loader2 className="spin" size={28} />
              <p>Loading agent predictions...</p>
            </div>
          ) : Object.keys(groupedPredictions).length === 0 ? (
            <div className="kp-empty-state">
              <div>
                <Bot size={25} />
              </div>
              <h3>
                {activeTab === "active"
                  ? "No active predictions"
                  : "No prediction history yet"}
              </h3>

              <p>
                {activeTab === "active"
                  ? "New predictions with a pending status will appear here."
                  : "Predictions marked as won or lost will appear here."}
              </p>
              <p>
                Generate picks on the Agent page. They will appear here when
                they have been saved to the agent predictions table.
              </p>
            </div>
          ) : (
            Object.entries(groupedPredictions).map(([date, items]) => (
              <div className="kp-date-group" key={date}>
                <div className="kp-date-heading">
                  <div className="kp-date-icon">
                    <CalendarDays size={17} />
                  </div>

                  <div>
                    <h3>{formatDate(date)}</h3>
                    <span>
                      {items.length} {items.length === 1 ? "match" : "matches"}
                    </span>
                  </div>
                </div>

                <div className="kp-date-matches">
                  {items.map((prediction) => (
                    <PredictionCard
                      key={prediction.id}
                      prediction={prediction}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {showModal && (
        <div className="kp-modal-backdrop">
          <div
            className="kp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-edit-title"
          >
            <div className="kp-modal-header">
              <div>
                <span>AGENT PREDICTION</span>
                <h2 id="agent-edit-title">Edit Match</h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close edit form"
              >
                <X size={20} />
              </button>
            </div>

            <form className="kp-prediction-form" onSubmit={handleSubmit}>
              <div className="kp-form-group">
                <label htmlFor="agent-match">Match</label>
                <input
                  id="agent-match"
                  type="text"
                  name="match"
                  placeholder="Team A vs Team B"
                  value={formData.match}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="kp-form-row">
                <div className="kp-form-group">
                  <label htmlFor="agent-league">League</label>
                  <select
                    id="agent-league"
                    name="league"
                    value={formData.league}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select league</option>
                    {STANDARD_LEAGUES.map((league) => (
                      <option key={league} value={league}>
                        {league}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </select>

                  {formData.league === "Other" && (
                    <input
                      type="text"
                      name="custom_league"
                      placeholder="Enter league name"
                      value={formData.custom_league}
                      onChange={handleChange}
                      required
                    />
                  )}
                </div>

                <div className="kp-form-group">
                  <label htmlFor="agent-match-date">Match Date</label>
                  <input
                    id="agent-match-date"
                    type="date"
                    name="match_date"
                    value={formData.match_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="kp-form-group">
                <label htmlFor="agent-prediction">Prediction</label>
                <select
                  id="agent-prediction"
                  name="prediction"
                  value={formData.prediction}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select prediction</option>
                  {STANDARD_PREDICTIONS.map((pick) => (
                    <option key={pick} value={pick}>
                      {pick}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {formData.prediction === "Other" && (
                  <input
                    type="text"
                    name="custom_prediction"
                    placeholder="Enter prediction"
                    value={formData.custom_prediction}
                    onChange={handleChange}
                    required
                  />
                )}
              </div>

              <div className="kp-form-row">
                <div className="kp-form-group">
                  <label htmlFor="agent-confidence">Confidence (%)</label>
                  <input
                    id="agent-confidence"
                    type="number"
                    name="confidence"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="85"
                    value={formData.confidence}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="kp-form-group">
                  <label htmlFor="agent-status">Status</label>
                  <select
                    id="agent-status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="win">Win</option>
                    <option value="lose">Lose</option>
                  </select>
                </div>
              </div>

              <div className="kp-form-group">
                <label htmlFor="agent-result">Result</label>
                <input
                  id="agent-result"
                  type="text"
                  name="result"
                  placeholder="e.g. Won 2–1, Over 2.5 goals, or Lost"
                  value={formData.result}
                  onChange={handleChange}
                />
              </div>

              {error && showModal && (
                <p className="kp-agent-form-error" role="alert">
                  {error}
                </p>
              )}

              <div className="kp-modal-actions">
                <button
                  type="button"
                  className="kp-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button type="submit" className="kp-save-btn" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="spin" size={17} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
