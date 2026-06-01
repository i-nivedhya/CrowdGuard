import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, PERMISSIONS, ROLE_LABELS } from '../context/AuthContext';
import { useTheme, useAlerts } from '../context/OtherContexts';

const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard', page: 'dashboard' },
  { path: '/analytics', label: 'Analytics', page: 'analytics' },
  { path: '/settings', label: 'Settings', page: 'settings' },
  { path: '/recordings', label: 'Recordings', page: 'recordings' },
  { path: '/about', label: 'About', page: 'about' },
];

const RISK_COLORS = {
  critical: '#ff3333',
  high: '#ff6600',
  medium: '#ffc800',
  low: '#00cc44',
};

export default function Navbar({ liveCss = null, liveRisk = 'NORMAL' }) {
  const { user, logout, can } = useAuth();
  const { theme, toggle } = useTheme();
  const { alerts, unread, resolve, addNote, clearAll } = useAlerts();
  const location = useLocation();
  const navigate = useNavigate();

  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [noteId, setNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const bellRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (bellRef.current && !bellRef.current.contains(e.target))
        setBellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target))
        setUserOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const riskColor =
    liveRisk === 'CRITICAL'
      ? '#ff3333'
      : liveRisk === 'HIGH'
        ? '#ff6600'
        : liveRisk === 'MEDIUM'
          ? '#ffc800'
          : '#00cc44';

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--nav-h)',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 500,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* LEFT — Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: 18,
              letterSpacing: '0.15em',
              color: 'var(--text)',
            }}
          >
            CROWDGUARD
          </span>
        </Link>

        {/* CENTER — Nav links (desktop) */}
        {user && (
          <div style={{ display: 'flex', gap: 4 }}>
            {NAV_LINKS.filter(l => can(l.page)).map(l => (
              <Link
                key={l.path}
                to={l.path}
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius)',
                  color:
                    location.pathname === l.path ? '#141414' : 'var(--text2)',
                  background:
                    location.pathname === l.path
                      ? 'var(--accent)'
                      : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* RIGHT — Live CSS + Bell + Theme + User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live CSS badge (shown in header when on dashboard) */}
          {liveCss !== null && (
            <div
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${riskColor}`,
                color: riskColor,
              }}
            >
              CSS {liveCss.toFixed(1)} · {liveRisk}
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: 'var(--text2)',
            }}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Bell */}
          {user && (
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setBellOpen(p => !p);
                  setUserOpen(false);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  position: 'relative',
                }}
              >
                🔔
                {unread > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      background: 'var(--red)',
                      color: '#fff',
                      fontSize: 9,
                      fontFamily: 'var(--font-m)',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>

              {/* Bell dropdown */}
              {bellOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 360,
                    maxHeight: 480,
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                    zIndex: 600,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 11,
                        letterSpacing: '0.1em',
                      }}
                    >
                      ALERTS ({unread} unread)
                    </span>
                    <button
                      onClick={clearAll}
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 9,
                        color: 'var(--text3)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        letterSpacing: '0.1em',
                      }}
                    >
                      CLEAR ALL
                    </button>
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {alerts.length === 0 && (
                      <div
                        style={{
                          padding: 32,
                          textAlign: 'center',
                          color: 'var(--text3)',
                          fontSize: 13,
                        }}
                      >
                        No alerts yet
                      </div>
                    )}
                    {alerts.slice(0, 50).map(a => (
                      <div
                        key={a.id}
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--border)',
                          borderLeft: `3px solid ${a.severity === 'CRITICAL' ? '#ff3333' : a.severity === 'HIGH' ? '#ff6600' : '#ffc800'}`,
                          background: a.resolved
                            ? 'transparent'
                            : 'rgba(255,51,51,0.04)',
                          opacity: a.resolved ? 0.5 : 1,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-m)',
                              fontSize: 10,
                              color:
                                a.severity === 'CRITICAL'
                                  ? '#ff3333'
                                  : a.severity === 'HIGH'
                                    ? '#ff6600'
                                    : '#ffc800',
                            }}
                          >
                            {a.alert_type} · {a.tile || ''}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-m)',
                              fontSize: 9,
                              color: 'var(--text3)',
                            }}
                          >
                            {new Date(a.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text2)',
                            marginBottom: 6,
                          }}
                        >
                          CSS: {a.css?.toFixed(1)} · Venue:{' '}
                          {a.venue_id || 'college_main'}
                        </div>
                        {a.note && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--accent)',
                              marginBottom: 6,
                            }}
                          >
                            📝 {a.note}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            alignItems: 'center',
                          }}
                        >
                          {!a.resolved && (
                            <button
                              onClick={() => resolve(a.id)}
                              style={{
                                fontFamily: 'var(--font-m)',
                                fontSize: 9,
                                padding: '3px 8px',
                                background: 'rgba(0,204,68,0.15)',
                                border: '1px solid rgba(0,204,68,0.3)',
                                color: '#00cc44',
                                borderRadius: 2,
                                cursor: 'pointer',
                                letterSpacing: '0.1em',
                              }}
                            >
                              ✓ RESOLVE
                            </button>
                          )}
                          {noteId === a.id ? (
                            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                              <input
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Add note..."
                                style={{
                                  flex: 1,
                                  fontFamily: 'var(--font-m)',
                                  fontSize: 10,
                                  background: 'var(--bg3)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text)',
                                  padding: '3px 8px',
                                  borderRadius: 2,
                                }}
                              />
                              <button
                                onClick={() => {
                                  addNote(a.id, noteText);
                                  setNoteId(null);
                                  setNoteText('');
                                }}
                                style={{
                                  fontFamily: 'var(--font-m)',
                                  fontSize: 9,
                                  padding: '3px 8px',
                                  background: 'var(--accent)',
                                  border: 'none',
                                  color: '#141414',
                                  borderRadius: 2,
                                  cursor: 'pointer',
                                }}
                              >
                                SAVE
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setNoteId(a.id);
                                setNoteText(a.note || '');
                              }}
                              style={{
                                fontFamily: 'var(--font-m)',
                                fontSize: 9,
                                padding: '3px 8px',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                color: 'var(--text3)',
                                borderRadius: 2,
                                cursor: 'pointer',
                                letterSpacing: '0.1em',
                              }}
                            >
                              📝 NOTE
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User menu */}
          {user ? (
            <div ref={userRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setUserOpen(p => !p);
                  setBellOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '5px 10px',
                  color: 'var(--text)',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    background: 'var(--accent)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#141414',
                    fontWeight: 700,
                  }}
                >
                  {user.avatar}
                </div>
                <span style={{ fontFamily: 'var(--font-m)', fontSize: 11 }}>
                  {user.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>▾</span>
              </button>
              {userOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 200,
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow)',
                    zIndex: 600,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 11,
                        marginBottom: 2,
                      }}
                    >
                      {user.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-m)',
                        fontSize: 9,
                        color: 'var(--accent)',
                      }}
                    >
                      {ROLE_LABELS[user.role]}
                    </div>
                  </div>
                  {user.role === 'super_admin' && (
                    <Link
                      to="/settings"
                      onClick={() => setUserOpen(false)}
                      style={{
                        display: 'block',
                        padding: '10px 16px',
                        fontSize: 13,
                        color: 'var(--text2)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      Manage Users
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: 13,
                      color: 'var(--red)',
                      background: 'transparent',
                      border: 'none',
                    }}
                  >
                    ↩ Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                padding: '7px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                letterSpacing: '0.1em',
              }}
            >
              LOGIN
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
