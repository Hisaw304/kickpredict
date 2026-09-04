import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Plus,
  Pencil,
  Trash2,
  Trophy,
  Clock3,
  CheckCircle2,
  XCircle,
  CalendarDays,
  X,
  Save,
  Loader2,
} from "lucide-react";

const Dashboard = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("active");

  const [showModal, setShowModal] = useState(false);
  const [editingPrediction, setEditingPrediction] = useState(null);

  const [formData, setFormData] = useState({
    match: "",
    league: "",
    prediction: "",
    confidence: "",
    match_date: "",
    status: "pending",
    result: "",
  });

  /* =========================================
     NORMALIZE STATUS
  ========================================= */

  const normalizeStatus = (status) => {
    return String(status || "")
      .trim()
      .toLowerCase();
  };

  /* =========================================
     FETCH PREDICTIONS
  ========================================= */

  const fetchPredictions = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .order("match_date", { ascending: false })
        .order("created_at", { ascending: false });

      console.log("PREDICTIONS DATA:", data);
      console.log("PREDICTIONS ERROR:", error);

      if (error) {
        throw error;
      }

      setPredictions(data || []);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  /* =========================================
     FILTER PREDICTIONS
  ========================================= */

  const activePredictions = useMemo(() => {
    return predictions.filter((prediction) => {
      return normalizeStatus(prediction.status) === "pending";
    });
  }, [predictions]);

  const historyPredictions = useMemo(() => {
    return predictions.filter((prediction) => {
      const status = normalizeStatus(prediction.status);

      return status === "win" || status === "lose";
    });
  }, [predictions]);

  /* =========================================
     STATISTICS
  ========================================= */

  const totalPredictions = predictions.length;

  const pendingCount = activePredictions.length;

  const winCount = predictions.filter((prediction) => {
    return normalizeStatus(prediction.status) === "win";
  }).length;

  const loseCount = predictions.filter((prediction) => {
    return normalizeStatus(prediction.status) === "lose";
  }).length;

  /* =========================================
     GROUP BY DATE
  ========================================= */

  const groupByDate = (items) => {
    return items.reduce((groups, item) => {
      const date = item.match_date || "unknown";

      if (!groups[date]) {
        groups[date] = [];
      }

      groups[date].push(item);

      return groups;
    }, {});
  };

  const groupedActive = useMemo(() => {
    return groupByDate(activePredictions);
  }, [activePredictions]);

  const groupedHistory = useMemo(() => {
    return groupByDate(historyPredictions);
  }, [historyPredictions]);

  /* =========================================
     DATE FORMAT
  ========================================= */

  const formatDate = (date) => {
    if (!date || date === "unknown") return "Date unavailable";

    const parsedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  /* =========================================
     FORM HANDLERS
  ========================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      match: "",
      league: "",
      prediction: "",
      confidence: "",
      match_date: "",
      status: "pending",
      result: "",
    });

    setEditingPrediction(null);
  };

  /* =========================================
     OPEN ADD MODAL
  ========================================= */

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  /* =========================================
     OPEN EDIT MODAL
  ========================================= */

  const handleEdit = (prediction) => {
    setEditingPrediction(prediction);

    setFormData({
      match: prediction.match || "",
      league: prediction.league || "",
      prediction: prediction.prediction || "",
      confidence:
        prediction.confidence !== null && prediction.confidence !== undefined
          ? String(prediction.confidence)
          : "",
      match_date: prediction.match_date || "",
      status: normalizeStatus(prediction.status) || "pending",
      result: prediction.result || "",
    });

    setShowModal(true);
  };

  /* =========================================
     SAVE PREDICTION
  ========================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    setSaving(true);

    try {
      const normalizedStatus = normalizeStatus(formData.status);

      const payload = {
        match: formData.match.trim(),
        league: formData.league.trim(),
        prediction: formData.prediction.trim(),
        confidence: Number(formData.confidence),
        match_date: formData.match_date,
        status: normalizedStatus,
        result: formData.result.trim() || null,
      };

      console.log("SAVING PAYLOAD:", payload);

      if (editingPrediction) {
        const { data, error } = await supabase
          .from("predictions")
          .update(payload)
          .eq("id", editingPrediction.id)
          .select()
          .single();

        console.log("UPDATED PREDICTION:", data);
        console.log("UPDATE ERROR:", error);

        if (error) {
          throw error;
        }

        /*
          Update local state immediately.
          This means the prediction moves between
          Active and History without waiting for a
          page refresh.
        */

        setPredictions((prev) =>
          prev.map((item) =>
            item.id === editingPrediction.id
              ? {
                  ...item,
                  ...payload,
                  ...(data || {}),
                }
              : item
          )
        );
      } else {
        const { data, error } = await supabase
          .from("predictions")
          .insert([payload])
          .select()
          .single();

        console.log("INSERTED PREDICTION:", data);
        console.log("INSERT ERROR:", error);

        if (error) {
          throw error;
        }

        if (data) {
          setPredictions((prev) => [data, ...prev]);
        }
      }

      setShowModal(false);
      resetForm();

      /*
        Re-fetch from Supabase so the UI is always
        synchronized with the database.
      */
      await fetchPredictions();
    } catch (error) {
      console.error("Error saving prediction:", error);

      alert(error.message || "Unable to save prediction.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================
     DELETE
  ========================================= */

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this prediction?"
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("predictions")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setPredictions((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Delete error:", error);

      alert(error.message || "Unable to delete prediction.");
    }
  };

  /* =========================================
     PREDICTION CARD
  ========================================= */

  const PredictionCard = ({ prediction, history = false }) => {
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

            {history && prediction.result && (
              <div>
                <span>Result</span>
                <strong>{prediction.result}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="kp-prediction-actions">
          <button
            type="button"
            onClick={() => handleEdit(prediction)}
            title="Edit prediction"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleDelete(prediction.id)}
            title="Delete prediction"
            className="delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  };

  /* =========================================
     DATE GROUP
  ========================================= */

  const DateGroup = ({ date, items, history = false }) => {
    return (
      <div className="kp-date-group">
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
              history={history}
            />
          ))}
        </div>
      </div>
    );
  };

  /* =========================================
     RENDER
  ========================================= */

  return (
    <main className="kp-dashboard">
      <div className="kp-dashboard-container">
        {/* HEADER */}

        <header className="kp-dashboard-header">
          <div>
            <span className="kp-dashboard-label">ADMIN PANEL</span>

            <h1>
              Prediction <span>Dashboard</span>
            </h1>

            <p>
              Manage upcoming predictions, update match results, and keep track
              of your prediction history.
            </p>
          </div>

          <button
            type="button"
            className="kp-add-prediction"
            onClick={handleAdd}
          >
            <Plus size={18} />
            Add Prediction
          </button>
        </header>

        {/* STATS */}

        <section className="kp-dashboard-stats">
          <div className="kp-stat-card">
            <div className="kp-stat-icon">
              <Trophy size={20} />
            </div>

            <div>
              <span>Total Predictions</span>
              <strong>{totalPredictions}</strong>
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

        {/* TABS */}

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

        {/* CONTENT */}

        <section className="kp-dashboard-content">
          {loading ? (
            <div className="kp-dashboard-loading">
              <Loader2 className="spin" size={28} />
              <p>Loading predictions...</p>
            </div>
          ) : activeTab === "active" ? (
            Object.keys(groupedActive).length === 0 ? (
              <div className="kp-empty-state">
                <div>
                  <Clock3 size={25} />
                </div>

                <h3>No active predictions</h3>

                <p>Add your first upcoming prediction to get started.</p>

                <button type="button" onClick={handleAdd}>
                  <Plus size={17} />
                  Add Prediction
                </button>
              </div>
            ) : (
              Object.entries(groupedActive).map(([date, items]) => (
                <DateGroup key={date} date={date} items={items} />
              ))
            )
          ) : Object.keys(groupedHistory).length === 0 ? (
            <div className="kp-empty-state">
              <div>
                <Trophy size={25} />
              </div>

              <h3>No prediction history</h3>

              <p>Completed predictions will appear here.</p>
            </div>
          ) : (
            Object.entries(groupedHistory).map(([date, items]) => (
              <DateGroup key={date} date={date} items={items} history />
            ))
          )}
        </section>
      </div>

      {/* =========================================
          MODAL
      ========================================= */}

      {showModal && (
        <div className="kp-modal-backdrop">
          <div className="kp-modal">
            <div className="kp-modal-header">
              <div>
                <span>
                  {editingPrediction ? "UPDATE PREDICTION" : "NEW PREDICTION"}
                </span>

                <h2>{editingPrediction ? "Edit Match" : "Add Prediction"}</h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form className="kp-prediction-form" onSubmit={handleSubmit}>
              {/* MATCH */}

              <div className="kp-form-group">
                <label>Match</label>

                <input
                  type="text"
                  name="match"
                  placeholder="Palermo FC vs Juve Stabia"
                  value={formData.match}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* LEAGUE + DATE */}

              <div className="kp-form-row">
                <div className="kp-form-group">
                  <label>League</label>

                  <input
                    type="text"
                    name="league"
                    placeholder="Serie B"
                    value={formData.league}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="kp-form-group">
                  <label>Match Date</label>

                  <input
                    type="date"
                    name="match_date"
                    value={formData.match_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* PREDICTION */}

              <div className="kp-form-group">
                <label>Prediction</label>

                <input
                  type="text"
                  name="prediction"
                  placeholder="Over 1.5 Goals"
                  value={formData.prediction}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* CONFIDENCE + STATUS */}

              <div className="kp-form-row">
                <div className="kp-form-group">
                  <label>Confidence (%)</label>

                  <input
                    type="number"
                    name="confidence"
                    min="0"
                    max="100"
                    placeholder="85"
                    value={formData.confidence}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="kp-form-group">
                  <label>Status</label>

                  <select
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

              {/* RESULT */}

              <div className="kp-form-group">
                <label>
                  Result
                  <span>Optional until match finishes</span>
                </label>

                <input
                  type="text"
                  name="result"
                  placeholder="2 - 2"
                  value={formData.result}
                  onChange={handleChange}
                />
              </div>

              {/* ACTIONS */}

              <div className="kp-modal-actions">
                <button
                  type="button"
                  className="kp-cancel-btn"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
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
                      {editingPrediction
                        ? "Update Prediction"
                        : "Save Prediction"}
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
};

export default Dashboard;
