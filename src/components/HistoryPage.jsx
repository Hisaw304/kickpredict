import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function HistoryPage({ pageSize = 3 }) {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalDates, setTotalDates] = useState(0);
  const [overallStats, setOverallStats] = useState({
    wins: 0,
    losses: 0,
    accuracy: 0,
  });

  useEffect(() => {
    fetchHistory();
  }, [page]);

  async function fetchHistory() {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .lt("match_date", today)
      .order("match_date", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const wins = data.filter((f) => f.status === "win").length;
    const losses = data.filter((f) => f.status === "lose").length;
    const total = wins + losses;
    const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    setOverallStats({
      wins,
      losses,
      accuracy,
    });

    // Group by date
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.match_date]) acc[item.match_date] = [];
      acc[item.match_date].push(item);
      return acc;
    }, {});

    const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));
    setTotalDates(dates.length);

    // Pagination: slice dates
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedDates = dates.slice(start, end);

    const paginatedHistory = paginatedDates.map((date) => ({
      date,
      fixtures: grouped[date],
    }));

    setHistory(paginatedHistory);
  }

  const nextPage = () => {
    if (page * pageSize < totalDates) setPage(page + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  return (
    <section id="history" className="history-page">
      <div className="history-container">
        {history.length === 0 ? (
          <p className="empty">No past fixtures available.</p>
        ) : (
          <>
            {/* Heading */}
            <h2 className="history-heading">Past Fixtures History</h2>

            {/* Accuracy paragraph */}
            <p className="history-accuracy">
              Record: {overallStats.wins} Wins / {overallStats.losses} Losses |
              Accuracy: {overallStats.accuracy}%
            </p>

            {/* Fixtures grouped by date */}
            {history.map((day) => (
              <div key={day.date} className="history-day">
                <h3 className="history-date">{day.date}</h3>
                <div className="fixtures-list">
                  {day.fixtures.map((f) => (
                    <div key={f.id} className="fixture-item">
                      <span
                        className={`fixture-status ${f.status}`}
                        title={f.status}
                      >
                        {f.status === "win"
                          ? "✅"
                          : f.status === "lose"
                          ? "❌"
                          : "⏳"}
                      </span>{" "}
                      {f.match} | Prediction: {f.prediction} | Result:{" "}
                      {f.result || "-"}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalDates > pageSize && (
              <div className="history-pagination">
                <button onClick={prevPage} disabled={page === 1}>
                  Previous
                </button>
                <span>
                  Page {page} of {Math.ceil(totalDates / pageSize)}
                </span>
                <button
                  onClick={nextPage}
                  disabled={page * pageSize >= totalDates}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
