import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { useTheme } from '../context/OtherContexts';

const DEMO_USERS = [
  { u: 'admin', p: 'admin123', role: 'super_admin', color: '#c6e355' },
  { u: 'manager', p: 'manager123', role: 'venue_manager', color: '#0088ff' },
  { u: 'guard', p: 'guard123', role: 'security_guard', color: '#ffc800' },
  { u: 'police', p: 'police123', role: 'read_only', color: '#ff3333' },
];

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400)); // small delay for feel
    const result = login(username, password);
    setLoading(false);
    if (result.ok) navigate(from, { replace: true });
    else setError(result.error);
  }

  function quickLogin(u, p) {
    setUsername(u);
    setPassword(p);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggle}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <Link
        to="/"
        style={{
          position: 'absolute',
          top: 22,
          left: 24,
          fontFamily: 'var(--font-d)',
          fontSize: 18,
          letterSpacing: '0.15em',
          color: 'var(--text)',
        }}
      >
        CROWDGUARD
      </Link>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: 50,
              letterSpacing: '0.12em',
              color: 'var(--text)',
              marginBottom: 4,
            }}
          >
            CROWDGUARD
          </h1>
        </div>

        {/* Form */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 28,
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'var(--text2)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                USERNAME
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-m)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e =>
                  (e.target.style.borderColor = error
                    ? 'var(--red)'
                    : 'var(--border)')
                }
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'var(--text2)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-m)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e =>
                  (e.target.style.borderColor = error
                    ? 'var(--red)'
                    : 'var(--border)')
                }
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(255,51,51,0.1)',
                  border: '1px solid rgba(255,51,51,0.3)',
                  borderRadius: 'var(--radius)',
                  padding: '8px 12px',
                  marginBottom: 16,
                  fontFamily: 'var(--font-m)',
                  fontSize: 11,
                  color: 'var(--red)',
                }}
              >
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'var(--bg3)' : 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-m)',
                fontSize: 12,
                letterSpacing: '0.15em',
                color: '#141414',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? ' AUTHENTICATING... ' : ' SIGN IN '}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div
          style={{
            marginTop: 24,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 20,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 9,
              letterSpacing: '0.2em',
              color: 'var(--text3)',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            DEMO ACCOUNTS
          </p>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
          >
            {DEMO_USERS.map(du => (
              <button
                key={du.u}
                onClick={() => quickLogin(du.u, du.p)}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg)',
                  border: `1px solid ${du.color}22`,
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.borderColor = du.color)
                }
                onMouseLeave={e =>
                  (e.currentTarget.style.borderColor = `${du.color}22`)
                }
              >
                <div
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 11,
                    color: du.color,
                    marginBottom: 2,
                  }}
                >
                  {ROLE_LABELS[du.role]}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 9,
                    color: 'var(--text3)',
                  }}
                >
                  {du.u} / {du.p}
                </div>
              </button>
            ))}
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: 16,
            fontSize: 12,
            color: 'var(--text3)',
          }}
        >
          <Link to="/" style={{ color: 'var(--text2)' }}>
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
