import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, PERMISSIONS } from '../context/AuthContext';

export default function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          background: 'rgba(255,51,51,0.1)',
          border: '1px solid rgba(255,51,51,0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          marginBottom: 24,
        }}
      >
        🔒
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'var(--font-d)',
          fontSize: 'clamp(36px, 7vw, 64px)',
          letterSpacing: '0.08em',
          color: 'var(--red)',
          marginBottom: 12,
          lineHeight: 1,
        }}
      >
        ACCESS DENIED
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 14,
          color: 'var(--text2)',
          maxWidth: 400,
          lineHeight: 1.7,
          marginBottom: 8,
        }}
      >
        Your role does not have permission to view this page.
      </p>

      {/* Current role info */}
      {user && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 20px',
            marginBottom: 28,
            marginTop: 8,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 10,
              color: 'var(--text3)',
              marginBottom: 6,
              letterSpacing: '0.12em',
            }}
          >
            YOUR CURRENT ROLE
          </p>
          <p
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: 22,
              color: 'var(--accent)',
            }}
          >
            {ROLE_LABELS[user.role]}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 10,
              color: 'var(--text3)',
              marginTop: 6,
            }}
          >
            You can access: {PERMISSIONS[user.role]?.join(', ')}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            fontFamily: 'var(--font-m)',
            fontSize: 11,
            letterSpacing: '0.12em',
            padding: '10px 18px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text2)',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>

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
          Dashboard
        </Link>
      </div>

      {/* Admin hint */}
      {user?.role !== 'super_admin' && (
        <p
          style={{
            marginTop: 28,
            fontSize: 12,
            color: 'var(--text3)',
            maxWidth: 360,
          }}
        >
          Need access? Ask your{' '}
          <span style={{ color: 'var(--accent)' }}>Super Admin</span> to update
          your role in{' '}
          <Link to="/settings" style={{ color: 'var(--accent)' }}>
            Settings → Users
          </Link>
          .
        </p>
      )}

      {/* Back to home */}
      <Link
        to="/"
        style={{
          marginTop: 16,
          fontFamily: 'var(--font-m)',
          fontSize: 10,
          color: 'var(--text3)',
          letterSpacing: '0.1em',
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
