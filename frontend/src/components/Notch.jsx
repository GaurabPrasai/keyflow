import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CARET_OPTIONS,
  DATASET_GROUPS,
  FONT_OPTIONS,
  SOUND_PACKS,
  useSettings,
} from "../contexts/SettingsContext";
import { useTheme } from "../contexts/ThemeContext";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../hooks/useAuth";
import { THEMES } from "../theme";
import { loadSessions } from "../utils/storage";
import { navigate } from "../utils/router";
import { ChartIcon, MusicIcon, PaletteIcon, TypeIcon, UserIcon } from "./Icons";

const AccountPanel = lazy(() => import("./AccountPanel"));

const PANELS = [
  { id: "text", label: "Text source", Icon: TypeIcon },
  { id: "theme", label: "Themes", Icon: PaletteIcon },
  { id: "sound", label: "Sound", Icon: MusicIcon },
  { id: "reports", label: "Reports", Icon: ChartIcon },
  { id: "account", label: "Account", Icon: UserIcon },
];

const CHIPS = "chip";

function Chip({ active, children, onClick }) {
  return (
    <button type="button" className={`${CHIPS} ${active ? "is-active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function TextPanel() {
  const { settings, update } = useSettings();

  return (
    <div className="panel">
      {DATASET_GROUPS.map((group) => (
        <div className="panel-group" key={group.label}>
          <p className="panel-title">{group.label}</p>
          <div className="panel-row">
            {group.options.map((option) => (
              <Chip
                key={option.value}
                active={settings.textDataset === option.value}
                onClick={() => update("textDataset", option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}

      <div className="panel-group">
        <p className="panel-title">Appearance</p>
        <div className="panel-row">
          <span className="panel-label">Text size</span>
          {FONT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={settings.fontSize === option.value}
              onClick={() => update("fontSize", option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <div className="panel-row">
          <span className="panel-label">Caret</span>
          {CARET_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={settings.caretStyle === option.value}
              onClick={() => update("caretStyle", option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.flowGlow}
            onChange={(event) => update("flowGlow", event.target.checked)}
          />
          <span>Flow glow</span>
        </label>
      </div>
    </div>
  );
}

function ThemePanel() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="panel">
      <div className="panel-group">
        <p className="panel-title">Theme</p>
        <div className="theme-grid">
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`theme-dot-btn ${theme === option.id ? "is-active" : ""}`}
              aria-pressed={theme === option.id}
              onClick={() => setTheme(option.id)}
            >
              <span
                className="theme-dot"
                style={{
                  "--dot-bg": option.bg,
                  "--dot-primary": option.primary,
                  "--dot-secondary": option.secondary,
                }}
              />
              {option.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SoundPanel() {
  const { settings, update } = useSettings();
  return (
    <div className="panel">
      <div className="panel-group">
        <p className="panel-title">Pack</p>
        <div className="panel-row">
          {SOUND_PACKS.map((option) => (
            <Chip
              key={option.value}
              active={settings.soundPack === option.value}
              onClick={() => update("soundPack", option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>
      <label className="range-row" htmlFor="keyflow-volume">
        <span>Volume</span>
        <input
          id="keyflow-volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.volume}
          disabled={settings.soundPack === "off"}
          onChange={(event) => update("volume", Number(event.target.value))}
        />
        <span className="range-value">{Math.round(settings.volume * 100)}%</span>
      </label>
    </div>
  );
}

const MINI_RANGE_MS = 7 * 86_400_000;

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ReportsPanel() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadSessions().then((sessions) => {
      if (cancelled) return;
      const cutoff = Date.now() - MINI_RANGE_MS;
      setRows(sessions.filter((row) => new Date(row.startedAt).getTime() >= cutoff));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const wpms = (rows || []).map((row) => row.wpm);
    return {
      average: Math.round(mean(wpms) * 10) / 10,
      best: wpms.length ? Math.max(...wpms) : 0,
      accuracy: Math.round(mean((rows || []).map((row) => row.accuracy)) * 10) / 10,
    };
  }, [rows]);

  const path = useMemo(() => {
    const points = (rows || [])
      .slice()
      .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)))
      .slice(-40);
    if (!points.length) return "";
    const max = Math.max(40, ...points.map((point) => point.wpm));
    const step = points.length > 1 ? 100 / (points.length - 1) : 0;
    return points
      .map((point, index) => `${index * step},${(1 - point.wpm / max) * 88 + 6}`)
      .join(" ");
  }, [rows]);

  if (rows && !rows.length) {
    return (
      <div className="panel">
        <p className="panel-note">No sessions in the last 7 days yet — start typing.</p>
        <div className="panel-row">
          <button type="button" className="button button--primary" onClick={() => navigate("/")}>
            Start typing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="mini-stats">
        <div className="mini-card" style={{ "--i": 0 }}>
          <strong>{rows ? summary.average : "—"}</strong>
          <span>avg wpm</span>
        </div>
        <div className="mini-card" style={{ "--i": 1 }}>
          <strong>{rows ? summary.best : "—"}</strong>
          <span>best wpm</span>
        </div>
        <div className="mini-card" style={{ "--i": 2 }}>
          <strong>{rows ? `${summary.accuracy}%` : "—"}</strong>
          <span>accuracy</span>
        </div>
      </div>
      <svg className="mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {path ? <polyline pathLength="1" points={path} /> : null}
      </svg>
      <div className="panel-row">
        <button type="button" className="button" onClick={() => navigate("/reports")}>
          Open full reports
        </button>
      </div>
    </div>
  );
}

const Notch = () => {
  const { panel, togglePanel, closePanel } = useUI();
  const { user } = useAuth();
  const notchRef = useRef(null);
  const barRef = useRef(null);

  // The closed width has to be a real number so the spring can animate it.
  useLayoutEffect(() => {
    const notch = notchRef.current;
    const bar = barRef.current;
    if (!notch || !bar) return undefined;
    const apply = () => notch.style.setProperty("--notch-w", `${bar.offsetWidth}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  // Close on outside click or Escape; Esc also hands keys back to typing.
  useEffect(() => {
    if (!panel) return undefined;
    const onPointerDown = (event) => {
      if (!notchRef.current?.contains(event.target)) closePanel();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closePanel();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closePanel, panel]);

  // Prefetch the account chunk on hover and while idle.
  useEffect(() => {
    const preload = () => import("./AccountPanel").catch(() => {});
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(preload, { timeout: 4_000 });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 2_500);
    return () => window.clearTimeout(id);
  }, []);

  const onAccountEnter = useCallback(() => {
    import("./AccountPanel").catch(() => {});
  }, []);

  const renderPanel = useCallback(() => {
    switch (panel) {
      case "text":
        return <TextPanel />;
      case "theme":
        return <ThemePanel />;
      case "sound":
        return <SoundPanel />;
      case "reports":
        return <ReportsPanel />;
      case "account":
        return (
          <Suspense fallback={<p className="panel-note">Loading…</p>}>
            <AccountPanel />
          </Suspense>
        );
      default:
        return null;
    }
  }, [panel]);

  return (
    <>
      <div className={`veil ${panel ? "is-open" : ""}`} onClick={closePanel} aria-hidden="true" />
      <div className={`notch ${panel ? "is-open" : ""}`} ref={notchRef}>
        <div className="notch-bar" ref={barRef}>
          <span className="wordmark">KEYFLOW</span>
          {PANELS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`notch-btn ${panel === id ? "is-active" : ""}`}
              aria-label={label}
              aria-pressed={panel === id}
              onMouseEnter={id === "account" ? onAccountEnter : undefined}
              onFocus={id === "account" ? onAccountEnter : undefined}
              onClick={() => togglePanel(id)}
            >
              {id === "account" && user ? (
                <span className="avatar">{user.username.charAt(0)}</span>
              ) : (
                <Icon size={20} strokeWidth={1.7} />
              )}
            </button>
          ))}
        </div>
        <div className="notch-panel">
          <div className="notch-panel-inner">
            <div className="notch-panel-content" key={panel || "none"}>
              {renderPanel()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Notch;
