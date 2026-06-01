import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

const SERVER = 'http://localhost:8000';
const SBAR = {
  CRITICAL: '#ff3333',
  HIGH: '#ff6600',
  MODERATE: '#ffc800',
  LOW: '#00cc44',
};

export default function Analytics() {
  const [range, setRange] = useState(60);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [snapsRes, alertsRes] = await Promise.all([
        fetch(
          `${SERVER}/api/v1/venues/college_main/history/css?minutes=${range}`
        ),
        fetch(`${SERVER}/api/v1/venues/college_main/history/alerts?limit=50`),
      ]);

      const snapsJson = await snapsRes.json();
      const alertsJson = await alertsRes.json();

      setData({
        snapshots: snapsJson.data || [],
        alerts: alertsJson.data || [],
      });
    } catch (e) {
      setData({
        snapshots: [],
        alerts: [],
        error: 'Backend offline — run: uvicorn server.main_server:app --reload',
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [range]);

  const snaps = data?.snapshots || [];
  const alerts = data?.alerts || [];
  const cssVals = snaps.map(s => parseFloat(s.css || 0));
  const cntVals = snaps.map(s => parseInt(s.total_count || 0));

  const peakCss = cssVals.length ? Math.max(...cssVals).toFixed(1) : '—';
  const avgCss = cssVals.length
    ? (cssVals.reduce((a, b) => a + b, 0) / cssVals.length).toFixed(1)
    : '—';
  const minCss = cssVals.length ? Math.min(...cssVals).toFixed(1) : '—';
  const peakCnt = cntVals.length ? Math.max(...cntVals) : '—';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <div
        style={{
          maxWidth: 1200,
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
              ANALYTICS
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: '30m', val: 30 },
              { label: '1h', val: 60 },
              { label: '2h', val: 120 },
              { label: '6h', val: 360 },
              { label: '24h', val: 1440 },
            ].map(({ label, val }) => (
              <button
                key={val}
                onClick={() => setRange(val)}
                style={{
                  padding: '7px 14px',
                  fontFamily: 'var(--font-m)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: range === val ? 'var(--accent)' : 'transparent',
                  color: range === val ? '#141414' : 'var(--text2)',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={fetchData}
              style={{
                padding: '7px 14px',
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                letterSpacing: '0.1em',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text2)',
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {data?.error && (
          <div
            style={{
              background: 'rgba(255,51,51,0.1)',
              border: '1px solid rgba(255,51,51,0.3)',
              borderRadius: 'var(--radius)',
              padding: '12px 16px',
              marginBottom: 20,
              fontFamily: 'var(--font-m)',
              fontSize: 11,
              color: 'var(--red)',
            }}
          >
            ⚠ {data.error}
          </div>
        )}

        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: 'PEAK CSS',
              value: loading ? '...' : peakCss,
              color: '#ff3333',
            },
            {
              label: 'AVG CSS',
              value: loading ? '...' : avgCss,
              color: 'var(--accent)',
            },
            {
              label: 'MIN CSS',
              value: loading ? '...' : minCss,
              color: 'var(--green)',
            },
            {
              label: 'PEAK COUNT',
              value: loading ? '...' : peakCnt,
              color: '#0088ff',
            },
            {
              label: 'DATA POINTS',
              value: loading ? '...' : snaps.length,
              color: 'var(--text2)',
            },
            {
              label: 'TOTAL ALERTS',
              value: loading ? '...' : alerts.length,
              color: '#ff6600',
            },
          ].map(c => (
            <div
              key={c.label}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '16px 14px',
                borderTop: `2px solid ${c.color}`,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 8,
                  letterSpacing: '0.2em',
                  color: 'var(--text3)',
                  marginBottom: 8,
                }}
              >
                {c.icon} {c.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: 36,
                  color: c.color,
                  lineHeight: 1,
                }}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* CSS Timeline */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
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
              CSS TIMELINE — LAST {range >= 60 ? `${range / 60}h` : `${range}m`}
            </span>
            <div
              style={{
                display: 'flex',
                gap: 16,
                fontFamily: 'var(--font-m)',
                fontSize: 9,
                color: 'var(--text3)',
              }}
            >
              <span style={{ color: '#ff3333' }}>— CRITICAL (75)</span>
              <span style={{ color: '#ffc800' }}>— HIGH (60)</span>
            </div>
          </div>
          <svg
            width="100%"
            height="100"
            viewBox="0 0 800 100"
            preserveAspectRatio="none"
            style={{ display: 'block' }}
          >
            <line
              x1="0"
              y1={100 - 75}
              x2="800"
              y2={100 - 75}
              stroke="#ff3333"
              strokeWidth="0.8"
              strokeDasharray="4,3"
              opacity="0.5"
            />
            <line
              x1="0"
              y1={100 - 60}
              x2="800"
              y2={100 - 60}
              stroke="#ffc800"
              strokeWidth="0.8"
              strokeDasharray="4,3"
              opacity="0.4"
            />
            {cssVals.length > 1 &&
              (() => {
                const pts = cssVals
                  .map(
                    (v, i) =>
                      `${(i / (cssVals.length - 1)) * 800},${100 - (v / 100) * 100}`
                  )
                  .join(' ');
                return (
                  <>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#CCFF00"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="#CCFF00"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <polygon points={`0,100 ${pts} 800,100`} fill="url(#g1)" />
                    <polyline
                      points={pts}
                      fill="none"
                      stroke="#CCFF00"
                      strokeWidth="1.5"
                    />
                  </>
                );
              })()}
          </svg>
          {!loading && snaps.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: 13,
                paddingTop: 12,
              }}
            >
              No data yet. Make sure the Python backend is running.
            </p>
          )}
        </div>

        {/* Crowd Count bars */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 10,
              letterSpacing: '0.15em',
              color: 'var(--text2)',
              marginBottom: 14,
            }}
          >
            CROWD COUNT TIMELINE
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 2,
              height: 80,
            }}
          >
            {cntVals.slice(-120).map((v, i) => {
              const maxV = Math.max(...cntVals, 1);
              const h = Math.max(2, (v / maxV) * 100);
              const col =
                v > maxV * 0.8
                  ? '#ff3333'
                  : v > maxV * 0.5
                    ? '#ff6600'
                    : 'var(--accent)';
              return (
                <div
                  key={i}
                  title={`Count: ${v}`}
                  style={{
                    flex: 1,
                    borderRadius: '2px 2px 0 0',
                    minWidth: 0,
                    height: `${h}%`,
                    background: col,
                    opacity: 0.7 + (i / 120) * 0.3,
                  }}
                />
              );
            })}
          </div>
          {cntVals.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: 13,
                paddingTop: 8,
              }}
            >
              No count data available
            </p>
          )}
        </div>

        {/* Alert History */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 10,
              letterSpacing: '0.15em',
              color: 'var(--text2)',
              marginBottom: 16,
            }}
          >
            ALERT HISTORY ({alerts.length})
          </div>
          {alerts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--text3)',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
              No alerts in this time range
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      'TIME',
                      'ZONE',
                      'ALERT TYPE',
                      'SEVERITY',
                      'CSS',
                      'VENUE',
                    ].map(h => (
                      <th
                        key={h}
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 9,
                          letterSpacing: '0.15em',
                          color: 'var(--text3)',
                          textAlign: 'left',
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 50).map((a, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.background = 'var(--bg2)')
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.background = 'transparent')
                      }
                    >
                      <td
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 10,
                          color: 'var(--text3)',
                          padding: '10px 12px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(a.timestamp).toLocaleTimeString()}
                        <br />
                        <span style={{ fontSize: 8, opacity: 0.5 }}>
                          {new Date(a.timestamp).toLocaleDateString()}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 10,
                          color: 'var(--text)',
                          padding: '10px 12px',
                        }}
                      >
                        {a.tile || '—'}
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 10,
                          color: 'var(--text)',
                          padding: '10px 12px',
                        }}
                      >
                        {a.type || a.alert_type || '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-m)',
                            fontSize: 9,
                            padding: '3px 10px',
                            borderRadius: 20,
                            background:
                              a.severity === 'CRITICAL'
                                ? 'rgba(255,51,51,0.15)'
                                : a.severity === 'HIGH'
                                  ? 'rgba(255,102,0,0.15)'
                                  : 'rgba(255,200,0,0.15)',
                            color:
                              a.severity === 'CRITICAL'
                                ? '#ff3333'
                                : a.severity === 'HIGH'
                                  ? '#ff6600'
                                  : '#ffc800',
                          }}
                        >
                          {a.severity || 'INFO'}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 11,
                          color: 'var(--accent)',
                          padding: '10px 12px',
                          fontWeight: 600,
                        }}
                      >
                        {parseFloat(a.css || a.css_at_alert || 0).toFixed(1)}
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 9,
                          color: 'var(--text3)',
                          padding: '10px 12px',
                        }}
                      >
                        {a.venue_id || 'college_main'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Session summary */}
        {snaps.length > 0 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 10,
                letterSpacing: '0.15em',
                color: 'var(--text2)',
                marginBottom: 16,
              }}
            >
              SESSION SUMMARY
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 24,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 9,
                    color: 'var(--text3)',
                    marginBottom: 10,
                    letterSpacing: '0.12em',
                  }}
                >
                  CSS DISTRIBUTION
                </div>
                {[
                  {
                    label: 'CRITICAL (≥75)',
                    count: cssVals.filter(v => v >= 75).length,
                    color: '#ff3333',
                  },
                  {
                    label: 'HIGH (60–74)',
                    count: cssVals.filter(v => v >= 60 && v < 75).length,
                    color: '#ff6600',
                  },
                  {
                    label: 'MEDIUM (30–59)',
                    count: cssVals.filter(v => v >= 30 && v < 60).length,
                    color: '#ffc800',
                  },
                  {
                    label: 'SAFE (< 30)',
                    count: cssVals.filter(v => v < 30).length,
                    color: '#00cc44',
                  },
                ].map(d => (
                  <div
                    key={d.label}
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
                        background: d.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 9,
                        color: 'var(--text2)',
                        flex: 1,
                      }}
                    >
                      {d.label}
                    </span>
                    <div
                      style={{
                        width: 80,
                        height: 4,
                        background: 'var(--bg)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 2,
                          background: d.color,
                          width: `${snaps.length > 0 ? (d.count / snaps.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 9,
                        color: d.color,
                        minWidth: 28,
                        textAlign: 'right',
                      }}
                    >
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 9,
                    color: 'var(--text3)',
                    marginBottom: 10,
                    letterSpacing: '0.12em',
                  }}
                >
                  ALERT BREAKDOWN
                </div>
                {['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map(sev => {
                  const count = alerts.filter(a => a.severity === sev).length;
                  return (
                    <div
                      key={sev}
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
                          background: SBAR[sev],
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 9,
                          color: 'var(--text2)',
                          flex: 1,
                        }}
                      >
                        {sev}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 10,
                          color: SBAR[sev],
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
