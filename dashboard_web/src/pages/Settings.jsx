// Settings.jsx — CrowdGuard AI v3.0
// Changes are now saved to config.py via POST /api/v1/settings
// so Python backend actually sees them when restarted.

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

const SERVER = 'http://localhost:8000';
const VENUE_TYPES = ['college', 'stadium', 'temple', 'rally'];
const TG_LINK = 'https://t.me/+PKl9iz6rOxBiNjhl';

const DEFAULT_SETTINGS = {
  venueName: 'My Venue',
  venueType: 'college',
  cameraSource: '0',
  countScale: 1.0,
  redThreshold: 85,
  highThreshold: 30,
  lowThreshold: 30,
  totalCrowdMax: 500,
  alertCooldown: 120,
  telegramEnabled: true,
  tileNames: {},
  defaultVenue: 'college',
};

export default function Settings() {
  const { user, users, addUser, removeUser } = useAuth();

  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cg_settings') || '{}');
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [tab, setTab] = useState('venue');
  const [copyDone, setCopyDone] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'security_guard',
  });
  const [userMsg, setUserMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const canManageUsers = user?.role === 'super_admin';

  useEffect(() => {
    fetch(`${SERVER}/api/v1/settings`)
      .then(r => r.json())
      .then(data => {
        setSettings(prev => ({
          ...prev,
          cameraSource: data.cameraSource ?? prev.cameraSource,
          countScale: data.countScale ?? prev.countScale,
          telegramEnabled: data.telegramEnabled ?? prev.telegramEnabled,
          redThreshold: data.redThreshold ?? prev.redThreshold,
          highThreshold: data.highThreshold ?? prev.highThreshold,
          defaultVenue: data.defaultVenue ?? prev.defaultVenue,
          venueType: data.defaultVenue ?? prev.venueType,
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function update(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function updateTileName(tile, name) {
    setSettings(prev => ({
      ...prev,
      tileNames: { ...prev.tileNames, [tile]: name },
    }));
    setSaved(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(TG_LINK).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }

  async function save() {
    setSaving(true);
    setSaveMsg('');
    localStorage.setItem('cg_settings', JSON.stringify(settings));

    const payload = {
      cameraSource: settings.cameraSource,
      countScale: settings.countScale,
      telegramEnabled: settings.telegramEnabled,
      redThreshold: settings.redThreshold,
      highThreshold: settings.highThreshold,
      defaultVenue: settings.venueType,
    };

    try {
      const res = await fetch(`${SERVER}/api/v1/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        setSaveMsg('✓ Saved — update in ~2 seconds automatically');
      } else {
        setSaveMsg(`⚠ Server error: ${data.detail || 'unknown'}`);
      }
    } catch {
      setSaved(true);
      setSaveMsg(
        '⚠ Backend unreachable — saved locally only. Start server and try again.'
      );
    }

    setSaving(false);
    setTimeout(() => {
      setSaved(false);
      setSaveMsg('');
    }, 5000);
  }

  const tabs = [
    { id: 'venue', label: 'Venue' },
    { id: 'thresholds', label: 'Thresholds' },
    { id: 'tiles', label: 'Tile Names' },
    { id: 'camera', label: 'Camera' },
    ...(canManageUsers ? [{ id: 'users', label: 'Users' }] : []),
  ];

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--bg)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Navbar />
        <div
          style={{
            fontFamily: 'var(--font-m)',
            color: 'var(--text2)',
            fontSize: 13,
            paddingTop: 'var(--nav-h)',
          }}
        >
          Loading settings from config.py...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ paddingTop: 'var(--nav-h)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: 36,
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              SETTINGS
            </h1>
          </div>

          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '1px solid var(--border)',
              marginBottom: 28,
              overflowX: 'auto',
            }}
          >
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '10px 18px',
                  fontFamily: 'var(--font-m)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  background: tab === t.id ? 'var(--accent)' : 'transparent',
                  color: tab === t.id ? '#141414' : 'var(--text2)',
                  border: 'none',
                  borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── VENUE TAB ── */}
          {tab === 'venue' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
              }}
            >
              <div style={{ gridColumn: '1/-1' }}>
                <Label>VENUE NAME</Label>
                <Input
                  value={settings.venueName}
                  onChange={v => update('venueName', v)}
                  placeholder="e.g. College Main Ground"
                />
              </div>

              <div>
                <Label>VENUE TYPE</Label>
                <select
                  value={settings.venueType}
                  onChange={e => update('venueType', e.target.value)}
                  style={selectStyle}
                >
                  {VENUE_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>MAX CROWD CAPACITY</Label>
                <Input
                  type="number"
                  value={settings.totalCrowdMax}
                  onChange={v => update('totalCrowdMax', parseInt(v) || 500)}
                  placeholder="500"
                />
              </div>

              {/* ── Telegram alerts ── */}
              <div style={{ gridColumn: '1/-1' }}>
                <Label>TELEGRAM ALERTS</Label>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    margin: '8px 0 14px',
                  }}
                >
                  <Toggle
                    checked={settings.telegramEnabled}
                    onChange={v => update('telegramEnabled', v)}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-m)',
                      fontSize: 11,
                      color: settings.telegramEnabled
                        ? 'var(--accent)'
                        : 'var(--text3)',
                    }}
                  >
                    {settings.telegramEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Telegram channel card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 14px',
                  }}
                >
                  {/* QR code */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&margin=0&data=${encodeURIComponent(TG_LINK)}`}
                    alt="QR code to join Telegram alerts channel"
                    style={{
                      width: 64,
                      height: 64,
                      background: '#fff',
                      padding: 4,
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  />

                  {/* Link + copy */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <a
                      href={TG_LINK}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#229ED9',
                        color: '#fff',
                        borderRadius: 'var(--radius)',
                        padding: '7px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        textDecoration: 'none',
                        width: 'fit-content',
                      }}
                    >
                      Join alerts channel
                    </a>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 10,
                          color: 'var(--text2)',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        t.me/+PKl9iz6rOxBiNjhl
                      </span>
                      <button
                        onClick={copyLink}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontFamily: 'var(--font-m)',
                          fontSize: 10,
                          color: copyDone ? 'var(--accent)' : 'var(--text2)',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'color 0.2s',
                        }}
                      >
                        {copyDone ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 10,
                    color: 'var(--text3)',
                    marginTop: 6,
                  }}
                >
                  Share with safety staff to receive live crowd alerts.
                </div>
              </div>
            </div>
          )}

          {/* ── THRESHOLDS TAB ── */}
          {tab === 'thresholds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 20,
                }}
              >
                <Label>CSS THRESHOLD PREVIEW</Label>
                <div
                  style={{
                    position: 'relative',
                    height: 32,
                    background:
                      'linear-gradient(to right, #00cc44, #ffc800 40%, #ff6600 70%, #ff3333)',
                    borderRadius: 4,
                    marginBottom: 24,
                  }}
                >
                  <ThresholdMarker
                    pct={settings.highThreshold}
                    color="#ffc800"
                    label={`HIGH ${settings.highThreshold}`}
                  />
                  <ThresholdMarker
                    pct={settings.redThreshold}
                    color="#ff3333"
                    label={`CRITICAL ${settings.redThreshold}`}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-m)',
                    fontSize: 9,
                    color: 'var(--text3)',
                  }}
                >
                  <span>0 SAFE</span>
                  <span>50</span>
                  <span>100 CRITICAL</span>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 20,
                }}
              >
                <div>
                  <Label>🟡 HIGH THRESHOLD</Label>
                  <Slider
                    value={settings.highThreshold}
                    min={1}
                    max={settings.redThreshold - 1}
                    onChange={v => update('highThreshold', parseInt(v))}
                  />
                  <div style={sliderVal}>{settings.highThreshold}</div>
                  <Hint>CSS above this triggers Telegram HIGH alert</Hint>
                </div>
                <div>
                  <Label>🔴 CRITICAL THRESHOLD</Label>
                  <Slider
                    value={settings.redThreshold}
                    min={settings.highThreshold + 1}
                    max={100}
                    onChange={v => update('redThreshold', parseInt(v))}
                  />
                  <div style={sliderVal}>{settings.redThreshold}</div>
                  <Hint>CSS above this triggers CRITICAL + PA alert</Hint>
                </div>
              </div>
            </div>
          )}

          {/* ── TILE NAMES TAB ── */}
          {tab === 'tiles' && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text3)',
                  marginBottom: 20,
                  fontFamily: 'var(--font-m)',
                }}
              >
                These names appear in the grid UI
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4,1fr)',
                  gap: 8,
                  maxWidth: 500,
                }}
              >
                {Array.from({ length: 16 }, (_, i) => {
                  const r = Math.floor(i / 4),
                    c = i % 4;
                  const key = `(${r},${c})`;
                  return (
                    <div key={key}>
                      <div
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 8,
                          color: 'var(--text3)',
                          marginBottom: 4,
                          letterSpacing: '0.1em',
                        }}
                      >
                        ZONE {key}
                      </div>
                      <input
                        value={settings.tileNames[key] || ''}
                        onChange={e => updateTileName(key, e.target.value)}
                        placeholder={key}
                        style={{
                          width: '100%',
                          padding: '7px 8px',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--text)',
                          fontFamily: 'var(--font-m)',
                          fontSize: 10,
                          outline: 'none',
                        }}
                        onFocus={e =>
                          (e.target.style.borderColor = 'var(--accent)')
                        }
                        onBlur={e =>
                          (e.target.style.borderColor = 'var(--border)')
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CAMERA TAB ── */}
          {tab === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <Label>CAMERA / VIDEO SOURCE</Label>
                <Input
                  value={settings.cameraSource}
                  onChange={v => update('cameraSource', v)}
                  placeholder="0 or rtsp://... or /path/to/video.mp4"
                />
                <Hint>0 = default webcam · IP/RTSP URL · Or file path</Hint>
              </div>

              <div>
                <Label>EXAMPLE DEMO VIDEOS AND IP WEBCAM URLS</Label>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  {[
                    'test_video/dense.mp4',
                    'test_video/sparse_college.mp4',
                    'http://192.168.1.10:8080/video',
                  ].map(url => (
                    <button
                      key={url}
                      onClick={() => update('cameraSource', url)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text2)',
                        fontFamily: 'var(--font-m)',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.borderColor = 'var(--accent)')
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.borderColor = 'var(--border)')
                      }
                    >
                      {url}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>CROWD COUNT SCALE</Label>
                <Slider
                  value={settings.countScale}
                  min={0.1}
                  max={100.0}
                  step={0.1}
                  onChange={v => update('countScale', parseFloat(v))}
                />
                <div style={sliderVal}>
                  {Number(settings.countScale).toFixed(1)}×
                </div>
                <Hint>
                  Multiply the AI's raw density sum by this factor to find the
                  right value.
                </Hint>
              </div>

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
                    fontSize: 9,
                    letterSpacing: '0.15em',
                    color: 'var(--text3)',
                    marginBottom: 8,
                  }}
                >
                  WHAT WILL BE WRITTEN TO config.py ON SAVE:
                </div>
                <pre
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 11,
                    color: 'var(--accent)',
                    lineHeight: 1.8,
                  }}
                >
                  {`CAMERA_SOURCES          = ['${settings.cameraSource}']
COUNT_SCALE             = ${Number(settings.countScale).toFixed(1)}
DEFAULT_VENUE           = '${settings.venueType}'
ALERT_THRESHOLD_HIGH    = ${settings.highThreshold}
ALERT_THRESHOLD_CRITICAL= ${settings.redThreshold}
TELEGRAM_BOT_TOKEN      = ${settings.telegramEnabled ? '"<your token>"' : '""  ← blanked (Telegram OFF)'}`}
                </pre>
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && canManageUsers && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-d)',
                    fontSize: 20,
                    marginBottom: 14,
                  }}
                >
                  CURRENT USERS
                </h3>
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr auto',
                      padding: '8px 16px',
                      background: 'var(--surface)',
                      fontFamily: 'var(--font-m)',
                      fontSize: 9,
                      letterSpacing: '0.15em',
                      color: 'var(--text3)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span>NAME</span>
                    <span>USERNAME</span>
                    <span>ROLE</span>
                    <span />
                  </div>
                  {users.map(u => (
                    <div
                      key={u.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr auto',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            background: 'var(--accent)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            color: '#141414',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {u.avatar}
                        </div>
                        <span style={{ fontSize: 13 }}>{u.name}</span>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 11,
                          color: 'var(--text2)',
                        }}
                      >
                        {u.username}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-m)',
                          fontSize: 9,
                          padding: '3px 8px',
                          borderRadius: 20,
                          background:
                            u.role === 'super_admin'
                              ? 'rgba(204,255,0,0.15)'
                              : 'rgba(255,255,255,0.06)',
                          color:
                            u.role === 'super_admin'
                              ? 'var(--accent)'
                              : 'var(--text2)',
                          display: 'inline-block',
                        }}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                      {u.id !== 1 && (
                        <button
                          onClick={() => removeUser(u.id)}
                          style={{
                            background: 'rgba(255,51,51,0.1)',
                            border: '1px solid rgba(255,51,51,0.3)',
                            color: 'var(--red)',
                            padding: '4px 10px',
                            borderRadius: 2,
                            fontFamily: 'var(--font-m)',
                            fontSize: 9,
                            cursor: 'pointer',
                          }}
                        >
                          REMOVE
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-d)',
                    fontSize: 20,
                    marginBottom: 16,
                  }}
                >
                  ADD USER
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14,
                  }}
                >
                  <div>
                    <Label>FULL NAME</Label>
                    <Input
                      value={newUser.name}
                      onChange={v => setNewUser(p => ({ ...p, name: v }))}
                      placeholder="e.g. John Smith"
                    />
                  </div>
                  <div>
                    <Label>USERNAME</Label>
                    <Input
                      value={newUser.username}
                      onChange={v => setNewUser(p => ({ ...p, username: v }))}
                      placeholder="e.g. jsmith"
                    />
                  </div>
                  <div>
                    <Label>PASSWORD</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={v => setNewUser(p => ({ ...p, password: v }))}
                      placeholder="Set password"
                    />
                  </div>
                  <div>
                    <Label>ROLE</Label>
                    <select
                      value={newUser.role}
                      onChange={e =>
                        setNewUser(p => ({ ...p, role: e.target.value }))
                      }
                      style={selectStyle}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="venue_manager">Venue Manager</option>
                      <option value="security_guard">Security Guard</option>
                      <option value="read_only">Read Only</option>
                    </select>
                  </div>
                </div>
                {userMsg && (
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: 'var(--font-m)',
                      fontSize: 11,
                      color: 'var(--accent)',
                    }}
                  >
                    {userMsg}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (
                      !newUser.username ||
                      !newUser.password ||
                      !newUser.name
                    ) {
                      setUserMsg('⚠ Fill all fields');
                      return;
                    }
                    addUser(newUser);
                    setNewUser({
                      username: '',
                      password: '',
                      name: '',
                      role: 'security_guard',
                    });
                    setUserMsg('✓ User added successfully');
                    setTimeout(() => setUserMsg(''), 3000);
                  }}
                  className="btn btn-accent"
                  style={{ marginTop: 16 }}
                >
                  + Add User
                </button>
              </div>
            </div>
          )}

          {/* Save button */}
          {tab !== 'users' && (
            <div
              style={{
                marginTop: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  onClick={save}
                  className="btn btn-accent"
                  style={{ minWidth: 180 }}
                  disabled={saving}
                >
                  {saving ? 'SAVING...' : saved ? '✓ SAVED!' : 'SAVE SETTINGS'}
                </button>
              </div>
              {saveMsg && (
                <div
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 11,
                    color: saveMsg.startsWith('✓')
                      ? 'var(--accent)'
                      : '#ff9900',
                    padding: '8px 12px',
                    background: saveMsg.startsWith('✓')
                      ? 'rgba(204,255,0,0.07)'
                      : 'rgba(255,153,0,0.08)',
                    border: `1px solid ${saveMsg.startsWith('✓') ? 'rgba(204,255,0,0.2)' : 'rgba(255,153,0,0.2)'}`,
                    borderRadius: 'var(--radius)',
                    maxWidth: 600,
                  }}
                >
                  {saveMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────
function Label({ children, style }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-m)',
        fontSize: 9,
        letterSpacing: '0.18em',
        color: 'var(--text3)',
        marginBottom: 6,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Hint({ children }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-m)',
        fontSize: 9,
        color: 'var(--text3)',
        marginTop: 5,
      }}
    >
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '10px 12px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        color: 'var(--text)',
        fontFamily: 'var(--font-m)',
        fontSize: 12,
        outline: 'none',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

function Slider({ value, min, max, step = 1, onChange }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
    />
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'var(--accent)' : 'var(--border)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: checked ? '#141414' : 'var(--text3)',
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          transition: 'left 0.2s',
        }}
      />
    </div>
  );
}

function ThresholdMarker({ pct, color, label }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${pct}%`,
        top: 0,
        bottom: 0,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        style={{
          width: 2,
          height: '100%',
          background: 'rgba(255,255,255,0.8)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 4,
          fontFamily: 'var(--font-m)',
          fontSize: 8,
          color,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );
}

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text)',
  fontFamily: 'var(--font-m)',
  fontSize: 12,
  outline: 'none',
};

const sliderVal = {
  fontFamily: 'var(--font-m)',
  fontSize: 18,
  color: 'var(--accent)',
  marginTop: 4,
  marginBottom: 4,
};
