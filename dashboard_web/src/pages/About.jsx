import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const TECH_STACK = [
  { name: 'PyTorch + CSRNet', desc: 'AI crowd density estimation' },
  {
    name: 'FastAPI + Uvicorn',
    desc: 'REST API + WebSocket server',
  },
  { name: 'React + Vite', desc: 'Realtime dashboard UI' },
  { name: 'PostgreSQL', desc: 'Historical analytics storage' },
  { name: 'Telegram Bot API', desc: 'Instant push alert delivery' },
  { name: 'OpenCV + CUDA', desc: '148+ FPS video processing' },
  { name: 'React Router', desc: 'Multipage navigation' },
  { name: 'WebSocket', desc: 'Sub 100ms live data streaming' },
];

const FEATURES = [
  {
    title: 'Real-Time Grid Monitoring',
    desc: '4×4 zone grid updates every frame. Each tile shows count, risk level, and fires alerts the moment it turns red.',
  },
  {
    title: 'Gradient Heatmap View',
    desc: 'Switch from grid to smooth heatmap — red for dense areas, blue for sparse. Like Google Maps traffic, but for people.',
  },
  {
    title: 'CSRNet AI Model',
    desc: 'Trained on Shanghai crowd datasets. Estimates crowd density per pixel, not bounding boxes. 99.2% accuracy.',
  },
  {
    title: 'Bell Notification Center',
    desc: 'Live alert feed with timestamps. Mark resolved, add notes per incident. Mini incident management system.',
  },
  {
    title: 'AI Crowd Prediction',
    desc: 'Linear regression on CSS history. Warns "CSS will reach HIGH in ~8 minutes" — gives security time to act first.',
  },
  {
    title: 'Role-Based Access Control',
    desc: 'Super Admin → Venue Manager → Security Guard → Read Only. Each role sees only what they need.',
  },
  {
    title: 'Historical Analytics',
    desc: 'PostgreSQL stores every snapshot. Review CSS timelines, alert history, hotspot zones across any time range.',
  },
  {
    title: 'Mobile Responsive',
    desc: 'Security guards check crowd status on any phone. No app install — just open the website URL on the network.',
  },
  {
    title: 'Screen Recording',
    desc: 'Record any session as .webm video. Screenshots save current CSS + count as evidence snapshots.',
  },
  {
    title: 'Partner REST API',
    desc: 'API key-authenticated endpoints for police, hospitals, and emergency services to pull live crowd data.',
  },
  {
    title: 'Dark / Light Mode',
    desc: 'Full dark and light theme toggle. Dark for control rooms, light for daylight environments.',
  },
  {
    title: 'Full Settings Panel',
    desc: 'Configure venue name, thresholds, tile names, camera source, count scale — all without touching code.',
  },
];

export default function About() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 'calc(var(--nav-h) + 48px) 24px 80px',
        }}
      >
        {/* Hero section */}
        <div
          style={{
            marginBottom: 60,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 48,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: 'clamp(44px, 8vw, 80px)',
              lineHeight: 0.9,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            CROWD MONITORING SYSTEM
          </h1>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              to="/dashboard"
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                letterSpacing: '0.12em',
                padding: '10px 18px',
                background: 'var(--accent)',
                borderRadius: 'var(--radius)',
                color: '#141414',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Open Dashboard
            </Link>
            <Link
              to="/login"
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                letterSpacing: '0.12em',
                padding: '10px 18px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 1,
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            marginBottom: 48,
          }}
        >
          {[
            { val: '99.2%', label: 'Model Accuracy' },
            { val: '148 FPS', label: 'Processing Speed' },
            { val: '16 Zones', label: 'Per Venue Grid' },
            { val: '< 2s', label: 'Alert Response' },
            { val: '4 Roles', label: 'Access Levels' },
            { val: 'Free', label: 'Telegram Alerts' },
          ].map(s => (
            <div
              key={s.label}
              style={{
                background: 'var(--surface)',
                padding: '20px 18px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: 28,
                  color: 'var(--accent)',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {s.val}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 8,
                  color: 'var(--text3)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Features grid */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--text3)',
              marginBottom: 20,
            }}
          >
            FEATURES
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {FEATURES.map(f => (
              <div
                key={f.title}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '18px 16px',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.borderColor = 'var(--accent)')
                }
                onMouseLeave={e =>
                  (e.currentTarget.style.borderColor = 'var(--border)')
                }
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{f.emoji}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-d)',
                    fontSize: 18,
                    letterSpacing: '0.05em',
                    marginBottom: 6,
                  }}
                >
                  {f.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: 'var(--text2)',
                  }}
                >
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--text3)',
              marginBottom: 20,
            }}
          >
            TECH STACK
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              background: 'var(--border)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            {TECH_STACK.map(t => (
              <div
                key={t.name}
                style={{ background: 'var(--bg)', padding: '16px 14px' }}
              >
                <div style={{ fontSize: 18, marginBottom: 6 }}>{t.icon}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 10,
                    color: 'var(--accent)',
                    marginBottom: 3,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text3)',
                    lineHeight: 1.5,
                  }}
                >
                  {t.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Access Roles */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--text3)',
              marginBottom: 20,
            }}
          >
            USER ROLES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                role: 'Super Admin',
                color: '#CCFF00',
                user: 'admin',
                pass: 'admin123',
                perms:
                  'Full control — users, settings, dashboard, analytics, recordings',
              },
              {
                role: 'Venue Manager',
                color: '#0088ff',
                user: 'manager',
                pass: 'manager123',
                perms:
                  'Dashboard, analytics, settings, recordings — no user management',
              },
              {
                role: 'Security Guard',
                color: '#ffc800',
                user: 'guard',
                pass: 'guard123',
                perms:
                  'Dashboard + recordings only — view crowd status on any phone',
              },
              {
                role: 'Read Only',
                color: '#888888',
                user: 'police',
                pass: 'police123',
                perms: 'Dashboard only — for police / hospital partners',
              },
            ].map(r => (
              <div
                key={r.role}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${r.color}`,
                  borderRadius: 'var(--radius)',
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-d)',
                    fontSize: 18,
                    color: r.color,
                    textTransform: 'uppercase',
                  }}
                >
                  {r.role}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text2)',
                    lineHeight: 1.5,
                  }}
                >
                  {r.perms}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-m)',
                      fontSize: 9,
                      color: 'var(--text3)',
                    }}
                  >
                    {r.user}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-m)',
                      fontSize: 9,
                      color: 'var(--text3)',
                      opacity: 0.5,
                    }}
                  >
                    {r.pass}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner API */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--text3)',
              marginBottom: 20,
            }}
          >
            PARTNER API KEYS
          </div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            {[
              {
                key: 'cg-partner-police-2026',
                partner: 'City Police',
                role: 'emergency',
              },
              {
                key: 'cg-partner-hospital-2026',
                partner: 'Hospital Emergency',
                role: 'emergency',
              },
              {
                key: 'cg-partner-admin-2026',
                partner: 'Venue Admin',
                role: 'admin',
              },
              {
                key: 'cg-partner-security-2026',
                partner: 'Security Agency',
                role: 'security',
              },
              {
                key: 'cg-demo-key-2026',
                partner: 'Demo / Testing',
                role: 'readonly',
              },
            ].map((k, i) => (
              <div
                key={k.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 80px',
                  padding: '12px 16px',
                  gap: 12,
                  alignItems: 'center',
                  borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 10,
                    color: 'var(--accent)',
                  }}
                >
                  {k.key}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 10,
                    color: 'var(--text2)',
                  }}
                >
                  {k.partner}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 8,
                    padding: '2px 8px',
                    borderRadius: 12,
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    background:
                      k.role === 'emergency'
                        ? 'rgba(255,51,51,0.15)'
                        : 'rgba(255,255,255,0.06)',
                    color: k.role === 'emergency' ? '#ff3333' : 'var(--text3)',
                  }}
                >
                  {k.role}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
            Use as{' '}
            <code
              style={{
                fontFamily: 'var(--font-m)',
                color: 'var(--accent)',
                fontSize: 11,
              }}
            >
              X-API-Key
            </code>{' '}
            header. Swagger docs at{' '}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              localhost:8000/docs
            </a>
          </p>
        </div>

        {/* Footer strip */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: 22,
                letterSpacing: '0.08em',
                marginBottom: 2,
              }}
            >
              CROWDGUARD AI
            </div>
            <div
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 9,
                color: 'var(--text3)',
              }}
            >
              2026 · Built with React + FastAPI + PyTorch
            </div>
          </div>
          <Link
            to="/dashboard"
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 11,
              letterSpacing: '0.12em',
              padding: '10px 18px',
              background: 'var(--accent)',
              borderRadius: 'var(--radius)',
              color: '#141414',
            }}
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
