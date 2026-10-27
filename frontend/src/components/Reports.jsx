import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUI } from "../contexts/UIContext";
import api from "../services/api";
import { deleteAllSessions, loadSessions } from "../utils/storage";
import { setRolling } from "../utils/roll";
import { navigate } from "../utils/router";
import "../styles/reports.css";

/** Numbers roll in instead of popping (Plan 4.0 §7). */
function Rolling({ value, className }) {
  const ref = useRef(null);
  useEffect(() => {
    setRolling(ref.current, String(value));
  }, [value]);
  return <span ref={ref} className={`roll ${className || ""}`} />;
}

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "all", label: "All" },
];

const PAGE_SIZE = 20;

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function rangeCutoff(range) {
  if (range === "all") return 0;
  if (range === "7") return Date.now() - 7 * 86_400_000;
  if (range === "30") return Date.now() - 30 * 86_400_000;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function dayString(date) {
  return new Date(date).toDateString();
}

function activeDays(sessions) {
  return new Set(sessions.map((session) => dayString(session.startedAt))).size;
}

function streakDays(sessions) {
  const days = new Set(sessions.map((session) => dayString(session.startedAt)));
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(cursor.toDateString())) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function topProblemKeys(sessions) {
  const totals = new Map();
  for (const session of sessions) {
    const stats = session.keyStats || {};
    for (const [key, value] of Object.entries(stats)) {
      if (!Array.isArray(value)) continue;
      const [count = 0, errors = 0, totalMs = 0] = value;
      const current = totals.get(key) || { count: 0, errors: 0, ms: 0 };
      current.count += count;
      current.errors += errors;
      current.ms += totalMs;
      totals.set(key, current);
    }
  }
  return [...totals.entries()]
    .filter(([, value]) => value.count >= 3)
    .map(([key, value]) => ({
      key,
      count: value.count,
      errorRate: value.errors / Math.max(1, value.count),
      averageMs: value.ms / Math.max(1, value.count - value.errors),
    }));
}

function TrendChart({ sessions, metric }) {
  const [hover, setHover] = useState(null);
  const points = useMemo(
    () =>
      sessions
        .slice()
        .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)))
        .map((session) => ({
          date: session.startedAt,
          wpm: session.wpm,
          accuracy: session.accuracy,
          value: metric === "accuracy" ? session.accuracy : session.wpm,
        })),
    [metric, sessions]
  );

  if (!points.length) {
    return <p className="report-empty-inline">No sessions in this range yet.</p>;
  }

  const width = 720;
  const height = 220;
  const padX = 8;
  const padY = 18;
  const maxValue = Math.max(metric === "accuracy" ? 100 : 40, ...points.map((point) => point.value));
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const xAt = (index) => (points.length === 1 ? width / 2 : padX + (index / (points.length - 1)) * usableW);
  const yAt = (value) => padY + usableH - (value / maxValue) * usableH;

  const line = points.map((point, index) => `${xAt(index)},${yAt(point.value)}`).join(" ");
  const area = `${padX},${height - padY} ${line} ${xAt(points.length - 1)},${height - padY}`;
  const hovered = hover === null ? null : points[hover];

  return (
    <div className="chart-wrap">
      <div className="chart-head">
        <span className="chart-legend">
          {metric === "accuracy" ? "Accuracy %" : "WPM"} · last {points.length} sessions
        </span>
      </div>
      <div
        className="chart"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
          setHover(Math.round(ratio * (points.length - 1)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="chart-svg" role="img" aria-label={`${metric} over time`}>
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1={padX}
              x2={width - padX}
              y1={padY + usableH * fraction}
              y2={padY + usableH * fraction}
              className="chart-grid"
            />
          ))}
          <polygon points={area} className="chart-area" />
          <polyline points={line} className="chart-line" pathLength="1" />
          {points.map((point, index) => (
            <circle
              key={`${point.date}-${index}`}
              cx={xAt(index)}
              cy={yAt(point.value)}
              r={hover === index ? 4 : 2.5}
              className="chart-dot"
            />
          ))}
          {hover !== null && (
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={padY}
              y2={height - padY}
              className="chart-cursor"
            />
          )}
        </svg>
        {hovered && (
          <div
            className="chart-tooltip"
            style={{ left: `${(xAt(hover) / width) * 100}%` }}
          >
            <strong>{Math.round(hovered.value * 10) / 10}</strong>
            <span>{dateFormat.format(new Date(hovered.date))}</span>
            <span>
              {hovered.wpm} wpm · {hovered.accuracy}% acc
            </span>
          </div>
        )}
      </div>
      <div className="chart-axis">
        <span>{dateFormat.format(new Date(points[0].date))}</span>
        <span>{dateFormat.format(new Date(points[points.length - 1].date))}</span>
      </div>
    </div>
  );
}

function SessionChart({ samples }) {
  if (!samples?.length) return <p className="report-empty-inline">No samples for this session.</p>;
  const width = 600;
  const height = 90;
  const max = Math.max(20, ...samples);
  const step = samples.length > 1 ? width / (samples.length - 1) : width;
  const points = samples
    .map((value, index) => `${index * step},${height - (value / max) * (height - 6) - 3}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="session-chart" role="img" aria-label="Per-second WPM">
      <polyline points={points} className="chart-line" pathLength="1" />
    </svg>
  );
}

function Reports() {
  const { isAuthenticated } = useAuth();
  const { openPanel } = useUI();
  const [sessions, setSessions] = useState(null);
  const [range, setRange] = useState("7");
  const [metric, setMetric] = useState("wpm");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSessions().then((rows) => {
      if (!cancelled) setSessions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      navigate("/");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [range]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    const cutoff = rangeCutoff(range);
    return sessions.filter((session) => new Date(session.startedAt).getTime() >= cutoff);
  }, [range, sessions]);

  const summary = useMemo(() => {
    const wpms = filtered.map((session) => session.wpm);
    const accuracies = filtered.map((session) => session.accuracy);
    return {
      averageWpm: Math.round(mean(wpms) * 10) / 10,
      bestWpm: wpms.length ? Math.max(...wpms) : 0,
      averageAccuracy: Math.round(mean(accuracies) * 10) / 10,
      consistency: Math.round(mean(filtered.map((session) => session.consistency))),
      totalSeconds: filtered.reduce((sum, session) => sum + (session.activeSeconds || 0), 0),
      totalChars: filtered.reduce(
        (sum, session) =>
          sum + (session.correct || 0) + (session.incorrect || 0) + (session.extra || 0),
        0
      ),
      days: activeDays(filtered),
      streak: streakDays(filtered),
    };
  }, [filtered]);

  const problemKeys = useMemo(() => topProblemKeys(filtered), [filtered]);
  const mostErrors = useMemo(
    () => problemKeys.slice().sort((a, b) => b.errorRate - a.errorRate).slice(0, 5),
    [problemKeys]
  );
  const slowest = useMemo(
    () => problemKeys.slice().sort((a, b) => b.averageMs - a.averageMs).slice(0, 5),
    [problemKeys]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleExport = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), sessions: sessions || [] }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `keyflow-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sessions]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteAllSessions();
    if (isAuthenticated) api.deleteSessions().catch(() => {});
    setSessions([]);
    setConfirmDelete(false);
  }, [confirmDelete, isAuthenticated]);

  const loading = sessions === null;

  return (
    <main className="reports">
      <div className="reports-head">
        <button type="button" className="button button--ghost reports-back" onClick={() => navigate("/")}>
          ← Type
        </button>
        <h1 className="reports-title">Reports</h1>
        <div className="reports-actions">
          <button type="button" className="button button--ghost" onClick={handleExport} disabled={!sessions?.length}>
            Export JSON
          </button>
          <button
            type="button"
            className="button button--ghost reports-delete"
            onClick={handleDelete}
            disabled={!sessions?.length}
          >
            {confirmDelete ? "Click again to delete" : "Delete my data"}
          </button>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="reports-nudge">
          <p>Sign in to keep your reports on every device.</p>
          <button type="button" className="button" onClick={() => openPanel("account")}>
            Sign in
          </button>
        </div>
      )}

      <div className="range-tabs" role="tablist" aria-label="Date range">
        {RANGES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={range === option.value}
            className={`range-tab ${range === option.value ? "is-active" : ""}`}
            onClick={() => setRange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="report-empty-inline">Loading sessions…</p>
      ) : filtered.length === 0 ? (
        <div className="reports-empty">
          <p>Type for a few seconds and your sessions show up here.</p>
          <button type="button" className="button button--primary" onClick={() => navigate("/")}>
            Start typing
          </button>
        </div>
      ) : (
        <>
          <section className="stat-grid" aria-label="Summary">
            {[
              [summary.averageWpm, "avg wpm"],
              [summary.bestWpm, "best wpm"],
              [`${summary.averageAccuracy}%`, "accuracy"],
              [`${summary.consistency}%`, "consistency"],
              [formatDuration(summary.totalSeconds), "time typed"],
              [summary.totalChars.toLocaleString(), "characters"],
              [filtered.length, "sessions"],
              [summary.streak, "day streak"],
            ].map(([value, label], index) => (
              <div className="stat-card" style={{ "--i": index }} key={label}>
                <Rolling value={value} className="stat-value" />
                <span className="stat-label">{label}</span>
              </div>
            ))}
          </section>

          <section className="report-card" aria-label="Progress over time">
            <div className="report-card-head">
              <h2 className="report-card-title">Progress</h2>
              <div className="metric-toggle" role="group" aria-label="Chart metric">
                <button
                  type="button"
                  className={`metric-btn ${metric === "wpm" ? "is-active" : ""}`}
                  onClick={() => setMetric("wpm")}
                >
                  WPM
                </button>
                <button
                  type="button"
                  className={`metric-btn ${metric === "accuracy" ? "is-active" : ""}`}
                  onClick={() => setMetric("accuracy")}
                >
                  Accuracy
                </button>
              </div>
            </div>
            <TrendChart sessions={filtered} metric={metric} />
          </section>

          <section className="report-card" aria-label="Problem keys">
            <div className="report-card-head">
              <h2 className="report-card-title">Problem keys</h2>
              <span className="report-card-note">top 5 by errors and by speed</span>
            </div>
            <div className="problem-lists">
              <div>
                <h3 className="problem-title">Top 5 problem keys</h3>
                <ul className="problem-list">
                  {mostErrors.map((entry, index) => (
                    <li key={entry.key} style={{ "--i": index }}>
                      <kbd>{entry.key === " " ? "space" : entry.key.toUpperCase()}</kbd>
                      <span>{Math.round(entry.errorRate * 100)}% errors</span>
                    </li>
                  ))}
                  {!mostErrors.length && <li className="report-empty-inline">Not enough data yet.</li>}
                </ul>
              </div>
              <div>
                <h3 className="problem-title">Slowest keys</h3>
                <ul className="problem-list">
                  {slowest.map((entry, index) => (
                    <li key={entry.key} style={{ "--i": index }}>
                      <kbd>{entry.key === " " ? "space" : entry.key.toUpperCase()}</kbd>
                      <span>{Math.round(entry.averageMs)} ms</span>
                    </li>
                  ))}
                  {!slowest.length && <li className="report-empty-inline">Not enough data yet.</li>}
                </ul>
              </div>
            </div>
          </section>

          <section className="report-card" aria-label="Sessions">
            <div className="report-card-head">
              <h2 className="report-card-title">Sessions</h2>
              <span className="report-card-note">
                {filtered.length} in this range · {summary.days} active days
              </span>
            </div>
            <div className="table-scroll">
              <table className="report-table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Time</th>
                    <th scope="col">WPM</th>
                    <th scope="col">Raw</th>
                    <th scope="col">Acc</th>
                    <th scope="col">Words</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      expanded={expanded === session.id}
                      onToggle={() => setExpanded(expanded === session.id ? null : session.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && (
              <div className="pager">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  disabled={page === 0}
                >
                  Previous
                </button>
                <span>
                  {page + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                  disabled={page >= pageCount - 1}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function SessionRow({ session, expanded, onToggle }) {
  return (
    <>
      <tr
        className={`session-row ${expanded ? "is-open" : ""}`}
        onClick={onToggle}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={expanded}
      >
        <td>{dateFormat.format(new Date(session.startedAt))}</td>
        <td>{formatDuration(session.activeSeconds)}</td>
        <td className="is-strong">{session.wpm}</td>
        <td>{session.raw}</td>
        <td>{session.accuracy}%</td>
        <td>{session.dataset}</td>
      </tr>
      {expanded && (
        <tr className="session-detail">
          <td colSpan={6}>
            <div className="session-detail-grid">
              <div className="session-detail-chart">
                <span className="session-detail-label">WPM per second</span>
                <SessionChart samples={session.wpmSamples} />
              </div>
              <dl className="session-detail-stats">
                <div>
                  <dt>Correct</dt>
                  <dd>{session.correct}</dd>
                </div>
                <div>
                  <dt>Incorrect</dt>
                  <dd>{session.incorrect}</dd>
                </div>
                <div>
                  <dt>Extra</dt>
                  <dd>{session.extra}</dd>
                </div>
                <div>
                  <dt>Missed</dt>
                  <dd>{session.missed}</dd>
                </div>
                <div>
                  <dt>Consistency</dt>
                  <dd>{session.consistency}%</dd>
                </div>
              </dl>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default Reports;
