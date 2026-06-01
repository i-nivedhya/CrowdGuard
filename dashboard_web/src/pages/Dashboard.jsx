import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import HeatmapGrid from '../components/HeatmapGrid';
import PredictionWidget from '../components/PredictionWidget';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/OtherContexts';

const SERVER = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/college_main';
const VENUE_ID = 'college_main';

const RISK_COLORS = {
  red: '#ff3333',
  orange: '#ff6600',
  yellow: '#ffc800',
  green: '#00cc44',
};
const RISK_LABELS = {
  red: 'RED',
  orange: 'ORANGE',
  yellow: 'YELLOW',
  green: 'GREEN',
};

function getRisk(r) {
  if (!r) return 'green';
  if (Array.isArray(r)) return r[0];
  return r;
}

// ── Grid view: same size container as the actual video frame ──────────────
function GridView({ tileCounts, tileRisks, tileNames, venueId }) {
  const [dims, setDims] = useState({ w: 640, h: 480 });

  useEffect(() => {
    const load = () =>
      fetch(`${SERVER}/frame_info/${venueId}`)
        .then(r => r.json())
        .then(d => {
          if (d.w && d.h) setDims({ w: d.w, h: d.h });
        })
        .catch(() => {});
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [venueId]);

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        @keyframes pulse-r {
          0%,100% { box-shadow: inset 0 0 0 0 rgba(255,51,51,.3); }
          50%      { box-shadow: inset 0 0 14px 3px rgba(255,51,51,.5); }
        }
      `}</style>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${dims.w} / ${dims.h}`,
          background: '#060a0f',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gridTemplateRows: 'repeat(4,1fr)',
            gap: 1,
          }}
        >
          {Array.from({ length: 16 }, (_, i) => {
            const r = Math.floor(i / 4),
              c = i % 4;
            const key = `(${r},${c})`;
            const count = tileCounts[key] || 0;
            const risk = getRisk(tileRisks[key]);
            const color = RISK_COLORS[risk] || '#00cc44';
            const name = (tileNames && tileNames[key]) || key;
            return (
              <div
                key={key}
                style={{
                  background: `${color}14`,
                  border: `1px solid ${color}30`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  animation:
                    risk === 'red' ? 'pulse-r 1s ease-in-out infinite' : 'none',
                  transition: 'background 0.3s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 5,
                    left: 6,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 5px ${color}`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 5,
                    fontFamily: 'monospace',
                    fontSize: 8,
                    color,
                    opacity: 0.8,
                    letterSpacing: '0.04em',
                  }}
                >
                  {RISK_LABELS[risk] || 'OK'}
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 'clamp(16px,2.5vw,30px)',
                    color,
                    lineHeight: 1,
                    textShadow: `0 0 14px ${color}55`,
                  }}
                >
                  {count}
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 'clamp(7px,0.9vw,10px)',
                    color: `${color}80`,
                    marginTop: 3,
                    maxWidth: '88%',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name.length > 8 ? name.slice(0, 8) + '…' : name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dimensions badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 8,
            background: 'rgba(0,0,0,0.5)',
            padding: '2px 7px',
            borderRadius: 3,
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          {dims.w}×{dims.h}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          marginTop: 7,
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#555',
          letterSpacing: '0.08em',
        }}
      >
        {[
          ['#00cc44', 'GREEN'],
          ['#ffc800', 'YELLOW'],
          ['#ff6600', 'ORANGE'],
          ['#ff3333', 'RED'],
        ].map(([color, label]) => (
          <span
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                background: color,
                borderRadius: 2,
                display: 'inline-block',
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isAtLeast } = useAuth();
  const { addAlert } = useAlerts();

  // ── Live data ──
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [cssHistory, setCssHistory] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'heatmap'

  // ── Settings from localStorage ──
  const [settings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cg_settings') || '{}');
    } catch {
      return {};
    }
  });
  const tileNames = settings.tileNames || {};
  const redThreshold = settings.redThreshold || 75;
  const highThreshold = settings.highThreshold || 60;

  // ── Screenshot / Recording ──
  const [screenshots, setScreenshots] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cg_screenshots') || '[]');
    } catch {
      return [];
    }
  });

  // server-side recording state
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef(null);

  // ── Live video frame — MJPEG stream (~15fps, no polling needed) ──
  const frameUrl = `${SERVER}/video_feed/${VENUE_ID}`;

  // ── Alerts tracking (to avoid duplicates) ──
  const alertedTilesRef = useRef(new Set());

  // ── WebSocket connection ──
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  function connect() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      clearTimeout(reconnectRef.current);
    };
    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };
    ws.onmessage = evt => {
      try {
        const d = JSON.parse(evt.data);
        processData(d);
      } catch {}
    };
  }

  function processData(d) {
    setData(d);
    const css = parseFloat(d.css || 0);
    const totalCount = d.total_count || 0;
    setCssHistory(prev => [...prev.slice(-59), css]);

    const maxCapacity = settings.totalCrowdMax || 500;
    if (totalCount >= maxCapacity) {
      if (!alertedTilesRef.current.has('capacity-exceeded')) {
        alertedTilesRef.current.add('capacity-exceeded');
        addAlert({
          alert_type: 'CAPACITY EXCEEDED',
          severity: 'CRITICAL',
          css,
          venue_id: VENUE_ID,
          message: `Total crowd ${totalCount} exceeds venue capacity of ${maxCapacity}`,
        });
        setTimeout(
          () => alertedTilesRef.current.delete('capacity-exceeded'),
          120000
        );
      }
    } else {
      alertedTilesRef.current.delete('capacity-exceeded'); // reset when crowd drops
    }

    // Fire alerts for red tiles
    const tileRisks = d.tile_risks || {};
    Object.entries(tileRisks).forEach(([tile, risk]) => {
      const riskStr = getRisk(risk);
      const key = `${tile}-${riskStr}`;
      if (riskStr === 'red' && !alertedTilesRef.current.has(key)) {
        alertedTilesRef.current.add(key);
        addAlert({
          alert_type: 'RED ZONE',
          severity: 'CRITICAL',
          tile,
          css,
          venue_id: VENUE_ID,
          message: `Zone ${tile} is RED. CSS: ${css.toFixed(1)}`,
        });
        setTimeout(() => alertedTilesRef.current.delete(key), 60000);
      } else if (riskStr !== 'red') {
        alertedTilesRef.current.delete(`${tile}-red`);
      }
    });

    // CSS threshold alert
    if (css >= redThreshold) {
      if (!alertedTilesRef.current.has('css-high')) {
        alertedTilesRef.current.add('css-high');
        addAlert({
          alert_type: 'HIGH CSS',
          severity: 'HIGH',
          css,
          venue_id: VENUE_ID,
        });
        setTimeout(() => alertedTilesRef.current.delete('css-high'), 120000);
      }
    } else {
      alertedTilesRef.current.delete('css-high');
    }
  }

  // sync recording state from backend on load
  async function syncRecordingStatus() {
    try {
      const r = await fetch(`${SERVER}/api/v1/recordings/status/${VENUE_ID}`);
      if (!r.ok) return;
      const s = await r.json();

      if (s.recording) {
        setRecording(true);
        setRecSeconds(Math.floor(s.elapsed_secs || 0));
        clearInterval(recTimerRef.current);
        recTimerRef.current = setInterval(
          () => setRecSeconds(p => p + 1),
          1000
        );
      } else {
        setRecording(false);
        setRecSeconds(0);
        clearInterval(recTimerRef.current);
      }
    } catch {}
  }

  useEffect(() => {
    connect();
    syncRecordingStatus();

    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      clearInterval(recTimerRef.current);
    };
  }, []);

  // ── Screenshot — capture actual video frame ──
  async function takeScreenshot() {
    try {
      // Fetch the current frame from the server
      const response = await fetch(`${SERVER}/frame/${VENUE_ID}`);
      if (!response.ok) {
        console.error('Failed to fetch frame');
        return;
      }

      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = e => {
        const base64 = e.target?.result;

        const snap = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          css: data?.css || 0,
          count: data?.total_count || 0,
          thumb: base64, // ← actual frame image, not grid
        };

        const updated = [snap, ...screenshots].slice(0, 20);
        setScreenshots(updated);
        localStorage.setItem('cg_screenshots', JSON.stringify(updated));
      };

      reader.readAsDataURL(blob);
    } catch (e) {
      console.error('Screenshot error:', e);
    }
  }

  // ── Server-side Recording (NO getDisplayMedia) ──
  async function startRecording() {
    try {
      const r = await fetch(`${SERVER}/api/v1/recordings/start/${VENUE_ID}`, {
        method: 'POST',
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        console.error('Start recording failed:', err);
        return;
      }

      setRecording(true);
      setRecSeconds(0);
      clearInterval(recTimerRef.current);
      recTimerRef.current = setInterval(() => setRecSeconds(p => p + 1), 1000);
    } catch (e) {
      console.error('Recording start error:', e);
    }
  }

  async function stopRecording() {
    try {
      const r = await fetch(`${SERVER}/api/v1/recordings/stop/${VENUE_ID}`, {
        method: 'POST',
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        console.error('Stop recording failed:', err);
      }
    } catch (e) {
      console.error('Recording stop error:', e);
    } finally {
      setRecording(false);
      clearInterval(recTimerRef.current);
      setRecSeconds(0);
    }
  }

  // ── Derived values ──
  const tileCounts = data?.tile_counts || {};
  const tileRisks = data?.tile_risks || {};
  const totalCount = data?.total_count || 0;
  const css = parseFloat(data?.css || 0);
  const redZones = Object.values(tileRisks).filter(
    r => getRisk(r) === 'red'
  ).length;
  const canControl = isAtLeast('venue_manager');

  // ── CHANGE 1: capacity color logic ──────────────────────────────────
  const maxCapacity = settings.totalCrowdMax || 500;
  const capacityColor = totalCount >= maxCapacity ? '#ff3333' : 'var(--accent)';
  // ────────────────────────────────────────────────────────────────────

  const overallRisk =
    css >= redThreshold
      ? 'CRITICAL'
      : css >= highThreshold
        ? 'HIGH'
        : css >= 30
          ? 'MEDIUM'
          : 'NORMAL';
  const cssColor =
    overallRisk === 'CRITICAL'
      ? '#ff3333'
      : overallRisk === 'HIGH'
        ? '#ff6600'
        : overallRisk === 'MEDIUM'
          ? '#ffc800'
          : '#00cc44';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar liveCss={data ? css : null} liveRisk={overallRisk} />

      <div
        style={{
          paddingTop: 'var(--nav-h)',
          minHeight: 'calc(100vh - var(--nav-h))',
        }}
      >
        {/* ── TOP BAR ── */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            background: 'var(--bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: connected ? '#00cc44' : '#ff3333',
                boxShadow: connected ? '0 0 6px #00cc44' : '0 0 6px #ff3333',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                color: 'var(--text2)',
              }}
            >
              {connected ? 'LIVE' : 'RECONNECTING...'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* View toggle */}
            <div
              style={{
                display: 'flex',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
              }}
            >
              {['grid', 'heatmap'].map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  style={{
                    padding: '6px 14px',
                    background:
                      viewMode === v ? 'var(--accent)' : 'transparent',
                    color: viewMode === v ? '#141414' : 'var(--text2)',
                    border: 'none',
                    fontFamily: 'var(--font-m)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {v === 'grid' ? 'GRID' : 'HEATMAP'}
                </button>
              ))}
            </div>

            <button
              onClick={takeScreenshot}
              className="btn"
              title="Take Screenshot of current frame"
            >
              ⏺ Screenshot
            </button>

            {canControl && (
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`btn ${recording ? 'btn-danger' : ''}`}
                style={{ minWidth: 110 }}
                title="Server-side recording of main.py video stream"
              >
                {recording
                  ? `⏹ ${String(Math.floor(recSeconds / 60)).padStart(2, '0')}:${String(recSeconds % 60).padStart(2, '0')}`
                  : '⏺ Record'}
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            padding: '12px 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* ── MAIN LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Status cards row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4,1fr)',
                gap: 8,
              }}
            >
              {[
                {
                  label: 'CROWD COUNT',
                  // ── CHANGE 2: use capacityColor + show max capacity ──
                  value: totalCount,
                  color: capacityColor,
                  suffix: ` / ${maxCapacity}`,
                  // ────────────────────────────────────────────────────
                },
                {
                  label: 'STRESS SCORE',
                  value: css.toFixed(1),
                  color: cssColor,
                  suffix: '',
                },
                {
                  label: 'RED ZONES',
                  value: redZones,
                  color: 'var(--red)',
                  suffix: '/16',
                },
                {
                  label: 'RISK LEVEL',
                  value: overallRisk,
                  color: cssColor,
                  suffix: '',
                },
              ].map(c => (
                <div
                  key={c.label}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid var(--border)`,
                    borderRadius: 'var(--radius)',
                    padding: '10px 12px',
                    borderTop: `2px solid ${c.color}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-m)',
                      fontSize: 7,
                      letterSpacing: '0.2em',
                      color: 'var(--text3)',
                      marginBottom: 4,
                    }}
                  >
                    {c.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-d)',
                      fontSize: 22,
                      color: c.color,
                      lineHeight: 1,
                    }}
                  >
                    {c.value}
                    {c.suffix}
                  </div>
                </div>
              ))}
            </div>

            {/* CSS Progress bar */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 9,
                    letterSpacing: '0.15em',
                    color: 'var(--text2)',
                  }}
                >
                  CROWD STRESS SCORE (CSS)
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 10,
                    color: cssColor,
                  }}
                >
                  {css.toFixed(1)} / 100
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: 'var(--bg)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    width: `${Math.min(css, 100)}%`,
                    background: `linear-gradient(to right, #00cc44, #ffc800 60%, #ff6600 80%, #ff3333)`,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 8,
                    color: '#00cc44',
                  }}
                >
                  0 SAFE
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 8,
                    color: '#ffc800',
                  }}
                >
                  |{highThreshold} HIGH
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 8,
                    color: '#ff3333',
                  }}
                >
                  {redThreshold} CRITICAL|
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 8,
                    color: 'var(--text3)',
                  }}
                >
                  100
                </span>
              </div>
            </div>

            {/* Grid OR Heatmap */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    color: 'var(--text2)',
                  }}
                >
                  {viewMode === 'grid' ? '4×4 ZONE GRID' : 'DENSITY HEATMAP'}
                </span>
                {data && (
                  <span
                    style={{
                      fontFamily: 'var(--font-m)',
                      fontSize: 9,
                      color: 'var(--text3)',
                    }}
                  >
                    UPDATED {new Date().toLocaleTimeString()}
                  </span>
                )}
              </div>

              {viewMode === 'grid' ? (
                <GridView
                  tileCounts={tileCounts}
                  tileRisks={tileRisks}
                  tileNames={tileNames}
                  venueId={VENUE_ID}
                />
              ) : (
                <HeatmapGrid
                  tileCounts={tileCounts}
                  tileRisks={tileRisks}
                  frameUrl={frameUrl}
                  venueId={VENUE_ID}
                />
              )}
            </div>

            {/* CSS History chart */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 9,
                  letterSpacing: '0.15em',
                  color: 'var(--text2)',
                  marginBottom: 8,
                }}
              >
                CSS HISTORY (LAST 60 UPDATES)
              </div>
              <svg
                width="100%"
                height="44"
                viewBox="0 0 600 44"
                preserveAspectRatio="none"
                style={{ display: 'block' }}
              >
                {/* Threshold lines */}
                <line
                  x1="0"
                  y1={44 - (redThreshold / 100) * 44}
                  x2="600"
                  y2={44 - (redThreshold / 100) * 44}
                  stroke="#ff3333"
                  strokeWidth="0.8"
                  strokeDasharray="4,3"
                  opacity="0.5"
                />
                <line
                  x1="0"
                  y1={44 - (highThreshold / 100) * 44}
                  x2="600"
                  y2={44 - (highThreshold / 100) * 44}
                  stroke="#ffc800"
                  strokeWidth="0.8"
                  strokeDasharray="4,3"
                  opacity="0.5"
                />
                {cssHistory.length > 1 && (
                  <>
                    <defs>
                      <linearGradient id="cssGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--accent)"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--accent)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`0,44 ${cssHistory.map((v, i) => `${(i / (cssHistory.length - 1)) * 600},${44 - (v / 100) * 44}`).join(' ')} 600,44`}
                      fill="url(#cssGrad)"
                    />
                    <polyline
                      points={cssHistory
                        .map(
                          (v, i) =>
                            `${(i / (cssHistory.length - 1)) * 600},${44 - (v / 100) * 44}`
                        )
                        .join(' ')}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                    />
                  </>
                )}
              </svg>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Prediction widget */}
            <PredictionWidget
              cssHistory={cssHistory}
              highThreshold={redThreshold}
              updateIntervalSecs={1}
            />

            {/* Zone breakdown */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 16,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'var(--text2)',
                  marginBottom: 12,
                }}
              >
                ZONE BREAKDOWN
              </div>
              {['red', 'orange', 'yellow', 'green'].map(risk => {
                const count = Object.values(tileRisks).filter(
                  r => getRisk(r) === risk
                ).length;
                return (
                  <div
                    key={risk}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: RISK_COLORS[risk],
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 9,
                        color: RISK_COLORS[risk],
                        flex: 1,
                        letterSpacing: '0.1em',
                      }}
                    >
                      {risk.toUpperCase()}
                    </span>
                    <div
                      style={{
                        flex: 2,
                        height: 4,
                        background: 'var(--bg)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(count / 16) * 100}%`,
                          background: RISK_COLORS[risk],
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 10,
                        color: 'var(--text2)',
                        minWidth: 16,
                        textAlign: 'right',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Top hotspots */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 16,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'var(--text2)',
                  marginBottom: 12,
                }}
              >
                TOP HOTSPOTS
              </div>
              {Object.entries(tileCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([tile, count]) => {
                  const risk = getRisk(tileRisks[tile]);
                  const color = RISK_COLORS[risk] || '#00cc44';
                  const name = tileNames[tile] || tile;
                  const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                  return (
                    <div key={tile} style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-m)',
                            fontSize: 9,
                            color: 'var(--text2)',
                          }}
                        >
                          {name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-m)',
                            fontSize: 9,
                            color,
                          }}
                        >
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 3,
                          background: 'var(--bg)',
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: color,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Quick system info */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 14,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {[
                  { k: 'VENUE', v: settings.venueName || 'College Main' },
                  { k: 'THRESHOLD', v: `CSS > ${redThreshold}` },
                  { k: 'SCALE', v: `${settings.countScale || 1.0}×` },
                  { k: 'CAMERA', v: settings.cameraSource || 'Default' },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <div
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 8,
                        color: 'var(--text3)',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {k}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 10,
                        color: 'var(--text)',
                        marginTop: 2,
                      }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
