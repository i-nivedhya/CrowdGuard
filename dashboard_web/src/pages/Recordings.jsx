// src/pages/Recordings.jsx — CrowdGuard AI v3.0 (clean, no fix-codec button)

import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8000';
const VENUE_ID = 'college_main';

const fmtTime = s =>
  `${String(Math.floor((s || 0) / 60)).padStart(2, '0')}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`;
const fmtDt = ts => (ts ? new Date(ts * 1000).toLocaleString() : '—');
const fmtDur = s => {
  if (!s) return '—';
  const m = Math.floor(s / 60),
    sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

// ── Video player ──────────────────────────────────────────────────────────────
// Uses native browser controls. Server's /stream/ handles byte-range so
// seek, pause, and play all work correctly.
function VideoPlayer({ rec, onClose }) {
  const src = `${API}/api/v1/recordings/stream/${rec.id}`;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius)',
        padding: 14,
        marginBottom: 14,
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
            color: 'var(--text2)',
            letterSpacing: '0.1em',
          }}
        >
          NOW PLAYING · {rec.filename || `${rec.id}.mp4`}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            borderRadius: 6,
            padding: '4px 12px',
            fontFamily: 'var(--font-m)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          ✕ Close
        </button>
      </div>

      <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden' }}>
        <video
          key={rec.id}
          src={src}
          controls
          autoPlay
          preload="auto"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            maxHeight: 480,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 8,
          fontFamily: 'var(--font-m)',
          fontSize: 9,
          color: 'var(--text3)',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {rec.duration_secs && (
          <span>Duration: {fmtDur(rec.duration_secs)}</span>
        )}
        {rec.frame_count && <span>Frames: {rec.frame_count}</span>}
        {rec.size_mb && <span>Size: {rec.size_mb} MB</span>}
        {rec.fps && <span>FPS: {rec.fps}</span>}
      </div>
    </div>
  );
}

export default function Recordings() {
  const { isAtLeast } = useAuth();

  const [screenshots, setScreenshots] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cg_screenshots') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedShot, setSelectedShot] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [tab, setTab] = useState('screenshots');
  const [isRec, setIsRec] = useState(false);
  const [recStatus, setRecStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [selectedRec, setSelectedRec] = useState(null);
  const pollRef = useRef(null);
  const canRecord = isAtLeast('security_guard');

  useEffect(() => {
    fetchList();
    fetchStatus();
    const onFocus = () => {
      try {
        setScreenshots(
          JSON.parse(localStorage.getItem('cg_screenshots') || '[]')
        );
      } catch {}
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    if (isRec) {
      pollRef.current = setInterval(fetchStatus, 2000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [isRec]);

  useEffect(() => {
    const fn = e => {
      if (e.key === 'Escape') setSelectedShot(null);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  async function fetchList() {
    try {
      const r = await fetch(`${API}/api/v1/recordings/list`);
      if (r.ok) setRecordings(await r.json());
    } catch {}
  }
  async function fetchStatus() {
    try {
      const r = await fetch(`${API}/api/v1/recordings/status/${VENUE_ID}`);
      if (!r.ok) {
        setIsRec(false);
        setRecStatus(null);
        return;
      }
      const d = await r.json();
      if (d.recording) {
        setIsRec(true);
        setRecStatus(d);
      } else {
        setIsRec(false);
        setRecStatus(null);
      }
    } catch {
      setIsRec(false);
      setRecStatus(null);
    }
  }

  async function handleStart() {
    setPageError(null);
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v1/recordings/start/${VENUE_ID}`, {
        method: 'POST',
      });
      if (!r.ok) {
        const d = await r.json();
        setPageError(d.detail || 'Failed to start');
      } else {
        setIsRec(true);
        await fetchStatus();
      }
    } catch {
      setPageError('Cannot reach server — is main.py + uvicorn running?');
    }
    setLoading(false);
  }

  async function handleStop() {
    setPageError(null);
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v1/recordings/stop/${VENUE_ID}`, {
        method: 'POST',
      });
      const d = await r.json();
      if (!r.ok) {
        setPageError(d.detail || d.message || 'Failed to stop');
      } else {
        setIsRec(false);
        setRecStatus(null);
        await fetchList();
        setTab('recordings');
      }
    } catch {
      setPageError('Cannot reach server');
    }
    setLoading(false);
  }

  function handlePlay(rec) {
    setSelectedRec(rec);
    setTab('recordings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(rec) {
    if (!confirm(`Delete recording ${rec.id}?`)) return;
    await fetch(`${API}/api/v1/recordings/${rec.id}`, { method: 'DELETE' });
    if (selectedRec?.id === rec.id) setSelectedRec(null);
    fetchList();
  }

  function deleteShot(id) {
    const u = screenshots.filter(s => s.id !== id);
    setScreenshots(u);
    localStorage.setItem('cg_screenshots', JSON.stringify(u));
    if (selectedShot?.id === id) setSelectedShot(null);
  }

  const pill = (extra = {}) => ({
    fontFamily: 'var(--font-m)',
    fontSize: 10,
    letterSpacing: '0.1em',
    padding: '6px 14px',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text3)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    ...extra,
  });

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'calc(var(--nav-h) + 28px) 24px 48px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 28,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: 44,
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              RECORDINGS
            </h1>
          </div>
          {canRecord && (
            <button
              onClick={isRec ? handleStop : handleStart}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                letterSpacing: '0.12em',
                padding: '10px 18px',
                borderRadius: 'var(--radius)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                background: isRec ? 'rgba(255,51,51,0.15)' : 'var(--accent)',
                border: isRec ? '1px solid var(--red)' : 'none',
                color: isRec ? 'var(--red)' : '#141414',
                animation: isRec
                  ? 'recpulse 1.2s ease-in-out infinite'
                  : 'none',
              }}
            >
              {loading
                ? '⏳ PLEASE WAIT...'
                : isRec
                  ? `⏹ STOP · ${fmtTime(recStatus?.elapsed_secs)}`
                  : '⏺ START RECORDING'}
            </button>
          )}
        </div>

        <style>{`@keyframes recpulse{0%,100%{box-shadow:0 0 0 0 rgba(255,51,51,.3)}50%{box-shadow:0 0 0 8px rgba(255,51,51,0)}}`}</style>

        {/* Live bar */}
        {isRec && recStatus && (
          <div
            style={{
              background: 'rgba(255,51,51,0.08)',
              border: '1px solid rgba(255,51,51,0.35)',
              borderRadius: 'var(--radius)',
              padding: '12px 18px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'var(--font-m)',
              fontSize: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ff3333',
                animation: 'recpulse 1s ease-in-out infinite',
              }}
            />
            <span style={{ color: 'var(--red)' }}>RECORDING IN PROGRESS</span>
            <span style={{ color: 'var(--text3)', fontSize: 10 }}>
              · ID: {recStatus.id} · {fmtTime(recStatus.elapsed_secs)} ·{' '}
              {recStatus.frame_count} frames
            </span>
          </div>
        )}

        {pageError && (
          <div
            style={{
              background: 'rgba(255,51,51,0.08)',
              border: '1px solid rgba(255,51,51,0.3)',
              borderRadius: 'var(--radius)',
              padding: '12px 18px',
              marginBottom: 16,
              color: 'var(--red)',
              fontSize: 13,
            }}
          >
            ⚠ {pageError}
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            marginBottom: 24,
          }}
        >
          {[
            {
              id: 'screenshots',
              label: `Screenshots (${screenshots.length})`,
            },
            { id: 'recordings', label: `Recordings (${recordings.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 20px',
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                letterSpacing: '0.1em',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#141414' : 'var(--text2)',
                border: 'none',
                cursor: 'pointer',
                borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Screenshots tab */}
        {tab === 'screenshots' && (
          <div>
            {screenshots.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: 16,
                }}
              >
                <button
                  onClick={() => {
                    setScreenshots([]);
                    localStorage.removeItem('cg_screenshots');
                    setSelectedShot(null);
                  }}
                  style={pill()}
                >
                  🗑 Clear All
                </button>
              </div>
            )}
            {screenshots.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: 'var(--text3)',
                }}
              >
                <div style={{ fontSize: 56, marginBottom: 16 }}>📸</div>
                <p style={{ fontSize: 15, marginBottom: 8 }}>
                  No screenshots yet
                </p>
                <p style={{ fontSize: 13, opacity: 0.6 }}>
                  Go to Dashboard and click the Screenshot button
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
                  gap: 14,
                }}
              >
                {screenshots.map(s => (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: 140,
                        background: 'var(--bg)',
                        position: 'relative',
                        overflow: 'hidden',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {s.thumb ? (
                        <img
                          src={s.thumb}
                          alt="shot"
                          onClick={() => setSelectedShot(s)}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            cursor: 'zoom-in',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 40 }}>📸</span>
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          fontFamily: 'var(--font-m)',
                          fontSize: 9,
                          background: 'rgba(0,0,0,0.6)',
                          padding: '2px 7px',
                          borderRadius: 2,
                          color: 'var(--accent)',
                        }}
                      >
                        CSS {parseFloat(s.css || 0).toFixed(1)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: 'var(--font-m)',
                            fontSize: 11,
                            color: 'var(--accent)',
                            marginBottom: 3,
                          }}
                        >
                          CSS {parseFloat(s.css || 0).toFixed(1)} ·{' '}
                          {s.count || 0} people
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-m)',
                            fontSize: 9,
                            color: 'var(--text3)',
                          }}
                        >
                          {new Date(s.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteShot(s.id)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 'var(--radius)',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          color: 'var(--text3)',
                          cursor: 'pointer',
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recordings tab */}
        {tab === 'recordings' && (
          <div>
            {recordings.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {recordings.length} recording
                  {recordings.length !== 1 ? 's' : ''} saved on server
                </span>
                <button onClick={fetchList} style={pill()}>
                  ↻ Refresh
                </button>
              </div>
            )}

            {selectedRec && (
              <VideoPlayer
                rec={selectedRec}
                onClose={() => setSelectedRec(null)}
              />
            )}

            {recordings.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: 'var(--text3)',
                }}
              >
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎥</div>
                <p style={{ fontSize: 15, marginBottom: 8 }}>
                  No recordings yet
                </p>
                <p
                  style={{
                    fontSize: 13,
                    opacity: 0.6,
                    maxWidth: 360,
                    margin: '0 auto',
                  }}
                >
                  Go to Dashboard and click the Screenshot button
                </p>
              </div>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {recordings.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      background: 'var(--surface)',
                      border: `1px solid ${selectedRec?.id === rec.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 'var(--radius)',
                          background: 'rgba(255,51,51,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        🎥
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: 'var(--font-m)',
                            fontSize: 11,
                            marginBottom: 3,
                          }}
                        >
                          {rec.filename || `${rec.id}.mp4`}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-m)',
                            fontSize: 9,
                            color: 'var(--text3)',
                            display: 'flex',
                            gap: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>{fmtDt(rec.start_time)}</span>
                          {rec.duration_secs && (
                            <span>· {fmtDur(rec.duration_secs)}</span>
                          )}
                          {rec.frame_count && (
                            <span>· {rec.frame_count} frames</span>
                          )}
                          {rec.size_mb && <span>· {rec.size_mb} MB</span>}
                          <span style={{ color: 'var(--green)' }}>✓ Saved</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handlePlay(rec)}
                        style={pill({
                          background: 'rgba(99,102,241,0.12)',
                          border: '1px solid #818cf8',
                          color: '#c7d2fe',
                        })}
                      >
                        ▶ Play
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `${API}/api/v1/recordings/download/${rec.id}`,
                            '_blank'
                          )
                        }
                        style={pill({
                          background: 'rgba(200,241,53,0.1)',
                          border: '1px solid var(--accent)',
                          color: 'var(--accent)',
                        })}
                      >
                        ⬇ Download
                      </button>
                      <button
                        onClick={() => handleDelete(rec)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius)',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          color: 'var(--text3)',
                          cursor: 'pointer',
                          fontSize: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedShot?.thumb && (
        <div
          onClick={() => setSelectedShot(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(1400px,96vw)',
              maxHeight: '92vh',
              background: '#0d0d0d',
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                height: 42,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.02)',
                fontFamily: 'var(--font-m)',
                fontSize: 10,
                color: 'var(--text2)',
              }}
            >
              <span>
                SCREENSHOT · CSS {parseFloat(selectedShot.css || 0).toFixed(1)}{' '}
                · {selectedShot.count || 0} PEOPLE ·{' '}
                {new Date(selectedShot.timestamp).toLocaleString()}
              </span>
              <button
                onClick={() => setSelectedShot(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text2)',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxHeight: 'calc(92vh - 42px)',
                overflow: 'auto',
                background: '#000',
              }}
            >
              <img
                src={selectedShot.thumb}
                alt="Full screenshot"
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(92vh - 70px)',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
