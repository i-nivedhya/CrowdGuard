import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/OtherContexts';

/* ── Cursor crosshair (desktop only) ── */
function Cursor() {
  const hRef = useRef(null);
  const vRef = useRef(null);
  const plusRef = useRef(null);
  const lRef = useRef(null);
  const rRef = useRef(null);

  useEffect(() => {
    const move = e => {
      const x = e.clientX,
        y = e.clientY;
      if (hRef.current) hRef.current.style.transform = `translateY(${y}px)`;
      if (vRef.current) vRef.current.style.transform = `translateX(${x}px)`;
      if (plusRef.current)
        plusRef.current.style.transform = `translate(${x - 8}px,${y - 8}px)`;
      if (lRef.current)
        lRef.current.style.transform = `translate(${x - 13}px,${y}px) translateY(-50%)`;
      if (rRef.current)
        rRef.current.style.transform = `translate(${x + 7}px,${y}px) translateY(-50%)`;
      document.body.classList.add('cg-cur-on');
    };
    const leave = () => document.body.classList.remove('cg-cur-on');
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', leave);
      document.body.classList.remove('cg-cur-on');
    };
  }, []);

  const base = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 9999,
    opacity: 0,
    transition: 'opacity 0.3s',
  };
  return (
    <>
      <style>{`
        body.cg-cur-on .cg-cur{opacity:1!important}
        body.cg-cur-on{cursor:none}
        body.cg-cur-on a,body.cg-cur-on button{cursor:none}
        @media(max-width:900px){.cg-cur{display:none!important}}
      `}</style>
      <div
        ref={hRef}
        className="cg-cur"
        style={{
          ...base,
          width: '100vw',
          height: '1px',
          background: 'rgba(128,128,128,0.25)',
          top: 0,
          left: 0,
        }}
      />
      <div
        ref={vRef}
        className="cg-cur"
        style={{
          ...base,
          width: '1px',
          height: '100vh',
          background: 'rgba(128,128,128,0.25)',
          top: 0,
          left: 0,
        }}
      />
      <div
        ref={plusRef}
        className="cg-cur"
        style={{ ...base, width: 16, height: 16, top: 0, left: 0 }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: 1.5,
            height: 6,
            background: 'currentColor',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            width: 1.5,
            height: 6,
            background: 'currentColor',
          }}
        />
      </div>
      <div
        ref={lRef}
        className="cg-cur"
        style={{
          ...base,
          width: 6,
          height: 1.5,
          background: 'currentColor',
          top: 0,
          left: 0,
        }}
      />
      <div
        ref={rRef}
        className="cg-cur"
        style={{
          ...base,
          width: 6,
          height: 1.5,
          background: 'currentColor',
          top: 0,
          left: 0,
        }}
      />
    </>
  );
}

/* ── Animated live demo grid ── */
function LiveGrid({ fg2 }) {
  const [tiles, setTiles] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      c: i === 0 ? 'red' : i < 4 ? 'orange' : i < 8 ? 'yellow' : 'green',
      n: Math.floor(Math.random() * 15) + 1,
    }))
  );

  useEffect(() => {
    const cls = ['green', 'green', 'green', 'yellow', 'orange', 'red'];
    const iv = setInterval(() => {
      setTiles(prev => {
        const next = [...prev];
        const i = Math.floor(Math.random() * 16);
        next[i] = {
          c: cls[Math.floor(Math.random() * cls.length)],
          n: Math.floor(Math.random() * 15) + 1,
        };
        return next;
      });
    }, 700);
    return () => clearInterval(iv);
  }, []);

  const colors = {
    red: '#ff3333',
    orange: '#ff6600',
    yellow: '#ffc800',
    green: '#00cc44',
  };

  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = e => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const rotateX = ((mouseY - centerY) / rect.height) * 15;
      const rotateY = ((mouseX - centerX) / rect.width) * -15;

      containerRef.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.transform =
          'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 16,
        maxWidth: 600,
        margin: '0 auto',
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => document.body.classList.add('cg-cur-on')}
      onMouseLeave={() => document.body.classList.remove('cg-cur-on')}
    >
      {tiles.map((t, i) => (
        <div
          key={i}
          style={{
            aspectRatio: '1',
            borderRadius: 2,
            background: `${colors[t.c]}18`,
            border: `1px solid ${colors[t.c]}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-m)',
            fontSize: 24,
            color: colors[t.c],
            fontWeight: 700,
            transition: 'all 0.4s',
            animation: t.c === 'red' ? 'pls 1s ease-in-out infinite' : 'none',
          }}
        >
          {t.n}
        </div>
      ))}
      <style>{`@keyframes pls{0%,100%{box-shadow:0 0 0 0 rgba(255,51,51,.4)}50%{box-shadow:0 0 0 8px rgba(255,51,51,0)}}`}</style>
      <div
        style={{
          gridColumn: '1/-1',
          textAlign: 'center',
          fontFamily: 'var(--font-m)',
          fontSize: 10,
          color: '#888',
          marginTop: 12,
          letterSpacing: '0.1em',
        }}
      >
        LIVE 4×4 ZONE GRID
      </div>
    </div>
  );
}
/* ── Main Landing ── */
export default function Landing() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [preloading, setPreloading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 9 + 3;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setTimeout(() => setPreloading(false), 350);
      }
      setProgress(Math.floor(p));
    }, 55);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (preloading) return;
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.style.opacity = '1';
            e.target.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [preloading]);

  if (preloading)
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0a0a0a',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: 'clamp(28px,5vw,52px)',
            letterSpacing: '0.2em',
            color: '#e8e8e0',
            marginBottom: 14,
          }}
        >
          CROWDGUARD
        </div>
        <div
          style={{
            fontFamily: 'var(--font-m)',
            fontSize: 12,
            color: '#555',
            letterSpacing: '0.1em',
          }}
        >
          LOADING ... {progress}%
        </div>
        <div
          style={{
            width: 220,
            height: 1,
            background: '#1e1e1e',
            marginTop: 20,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: '#CCFF00',
              width: `${progress}%`,
              transition: 'width 0.08s',
            }}
          />
        </div>
      </div>
    );

  // ── Theme tokens — everything reads from these ──
  const isDark = theme === 'dark';
  const BG = isDark ? '#141414' : '#f5f5f0'; // page background
  const FG = isDark ? '#e8e8e0' : '#0f0f0f'; // primary text
  const FG2 = isDark ? 'rgba(232,232,224,0.5)' : 'rgba(15,15,15,0.5)'; // muted text
  const BORDER = isDark ? '#252525' : '#dcdcd4'; // borders
  const SURFACE = isDark ? '#1c1c1c' : '#ebebeb'; // card surfaces
  const SURFACE2 = isDark ? '#111111' : '#e3e3de'; // deeper card bg
  const A = '#b0dc00'; // accent — always

  // Contrast (flipped) sections — now theme-aware
  const CON_BG = isDark ? '#141414' : '#f5f5f0';
  const CON_FG = isDark ? '#e8e8e0' : '#0f0f0f';
  const CON_FG2 = isDark ? 'rgba(232,232,224,0.5)' : 'rgba(15,15,15,0.5)';
  const CON_BORDER = isDark ? '#252525' : '#dcdcd4';

  const sectionStyle = {
    background: BG,
    color: FG,
    borderBottom: `1px solid ${BORDER}`,
  };

  return (
    <div
      style={{
        background: BG,
        color: FG,
        fontFamily: 'var(--font-b)',
        overflow: 'hidden',
      }}
    >
      <Cursor />

      {/* ── TOP BAR ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
          background: isDark ? 'rgba(20,20,20,0.92)' : 'rgba(245,245,240,0.95)',
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: 'blur(14px)',
          zIndex: 1000,
        }}
      >
        <Link
          to="/"
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: 17,
            letterSpacing: '0.18em',
            color: FG,
          }}
        >
          CROWDGUARD
        </Link>
        <span />
        <button
          onClick={toggle}
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            color: FG2,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {isDark ? '🌙' : '☀️'}
        </button>
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            fontFamily: 'var(--font-m)',
            fontSize: 11,
            color: FG,
            border: `1px solid ${BORDER}`,
            background: 'transparent',
            padding: '7px 14px',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          MENU
        </button>
      </div>

      {/* ── MENU OVERLAY — always dark ── */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0a0a0a',
            zIndex: 5000,
            display: 'flex',
            flexDirection: 'column',
            padding: '72px 40px 40px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setMenuOpen(false);
          }}
        >
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'absolute',
              top: 14,
              right: 24,
              fontFamily: 'var(--font-m)',
              fontSize: 11,
              color: '#555',
              background: 'transparent',
              border: '1px solid #222',
              padding: '7px 14px',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
          <nav
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: 0,
            }}
          >
            {[
              { label: 'HOME', desc: 'LANDING PAGE', to: '/', pub: true },
              {
                label: 'DASHBOARD',
                desc: 'LIVE MONITORING · AI GRID',
                to: '/dashboard',
                pub: false,
              },
              {
                label: 'ANALYTICS',
                desc: 'CSS TIMELINE · ALERTS · HOTSPOTS',
                to: '/analytics',
                pub: false,
              },
              {
                label: 'SETTINGS',
                desc: 'THRESHOLDS · CAMERA · VENUE',
                to: '/settings',
                pub: false,
              },
              {
                label: 'RECORDINGS',
                desc: 'RECORDINGS · SCREENSHOTS',
                to: '/recordings',
                pub: false,
              },
              {
                label: 'API DOCS',
                desc: 'PARTNER REST API · SWAGGER',
                to: 'http://localhost:8000/docs',
                ext: true,
              },
              {
                label: 'ABOUT',
                desc: 'PROJECT · TECH STACK',
                to: '/about',
                pub: true,
              },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 20,
                  justifyContent: 'flex-end',
                  padding: '6px 0',
                  borderBottom: '1px solid #1e1e1e',
                  width: '100%',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-m)',
                    fontSize: 10,
                    color: '#444',
                    letterSpacing: '0.12em',
                    minWidth: 240,
                    textAlign: 'right',
                  }}
                >
                  {item.desc}
                  {!item.pub && !user ? ' 🔒' : ''}
                </span>
                {item.ext ? (
                  <a
                    href={item.to}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      fontFamily: 'var(--font-d)',
                      fontSize: 'clamp(36px,6vw,72px)',
                      color: 'rgba(255,255,255,0.22)',
                      lineHeight: 1.05,
                      textDecoration: 'none',
                      textTransform: 'uppercase',
                      transition: 'color 0.3s',
                    }}
                    onMouseEnter={e => (e.target.style.color = '#fff')}
                    onMouseLeave={e =>
                      (e.target.style.color = 'rgba(255,255,255,0.22)')
                    }
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      fontFamily: 'var(--font-d)',
                      fontSize: 'clamp(36px,6vw,72px)',
                      color: item.to === '/' ? A : 'rgba(255,255,255,0.22)',
                      lineHeight: 1.05,
                      textTransform: 'uppercase',
                      transition: 'color 0.3s',
                    }}
                    onMouseEnter={e => (e.target.style.color = '#fff')}
                    onMouseLeave={e =>
                      (e.target.style.color =
                        item.to === '/' ? A : 'rgba(255,255,255,0.22)')
                    }
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #1e1e1e',
              paddingTop: 16,
              fontFamily: 'var(--font-m)',
              fontSize: 10,
              color: '#444',
            }}
          >
            <span>CROWDGUARD AI</span>
            <span>CROWD MONITORING SYSTEM</span>
          </div>
        </div>
      )}

      {/* ── TICKER ── */}
      <div
        style={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          borderBottom: `1px solid ${BORDER}`,
          padding: '9px 0',
          marginTop: 56,
          background: BG,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            animation: 'ticker 26s linear infinite',
            fontFamily: 'var(--font-m)',
            fontSize: 10,
            color: FG2,
            letterSpacing: '0.14em',
          }}
        >
          {Array(4)
            .fill(
              'CROWD SAFETY AI  ·  REALTIME MONITORING  ·  AI POWERED  ·  TELEGRAM ALERTS  ·  PARTNER REST API  ·  99.2% ACCURACY  ·  148 FPS  ·  '
            )
            .join('')}
        </div>
        <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      </div>

      {/* ── HERO ── */}
      <section
        style={{
          ...sectionStyle,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px 40px 60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{ flex: 1, borderRight: `1px solid ${BORDER}` }}
            />
          ))}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 10,
              color: FG2,
              letterSpacing: '0.22em',
              marginBottom: 20,
            }}
          >
            AI POWERED CROWD SAFETY SYSTEM
          </p>
          {['CROWD', 'SAFETY', 'INTELLIGENCE'].map((w, i) => (
            <div key={w} style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: 'clamp(68px,12.5vw,190px)',
                  lineHeight: 0.88,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                  color: w === 'SAFETY' ? A : FG,
                  animation: `wordUp 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
                }}
              >
                {w}
              </div>
            </div>
          ))}
          <style>{`@keyframes wordUp{from{transform:translateY(110%)}to{transform:translateY(0)}}`}</style>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginTop: 56,
              gap: 32,
              flexWrap: 'wrap',
            }}
          >
            <p
              style={{
                maxWidth: 340,
                fontSize: 14,
                lineHeight: 1.75,
                color: FG2,
                fontWeight: 300,
              }}
            >
              Realtime AI crowd density monitoring with instant alerting.
              Protect thousands of lives with sub 2 second response times and
              99.2% model accuracy.
            </p>
            <Link
              to={user ? '/dashboard' : '/login'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: 'var(--font-m)',
                fontSize: 11,
                letterSpacing: '0.14em',
                color: FG,
                border: `1px solid ${BORDER}`,
                padding: '13px 22px',
                transition: 'all 0.28s',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = A;
                e.currentTarget.style.color = '#141414';
                e.currentTarget.style.borderColor = A;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = FG;
                e.currentTarget.style.borderColor = BORDER;
              }}
            >
              {user ? 'OPEN DASHBOARD' : 'SIGN IN'}
            </Link>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 7,
            fontFamily: 'var(--font-m)',
            fontSize: 9,
            color: FG2,
            letterSpacing: '0.2em',
          }}
        >
          <span>SCROLL</span>
          <div
            style={{
              width: 1,
              height: 36,
              background: BORDER,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-36px',
                left: 0,
                width: 1,
                height: 36,
                background: A,
                animation: 'sdrop 1.7s ease-in-out infinite',
              }}
            />
          </div>
          <style>{`@keyframes sdrop{0%{top:-36px}100%{top:72px}}`}</style>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          borderTop: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          background: BG,
        }}
      >
        {[
          ['99.2%', 'MODEL ACCURACY'],
          ['148 FPS', 'PROCESSING SPEED'],
          ['16 ZONES', 'PER VENUE'],
          ['<2s', 'ALERT RESPONSE'],
        ].map(([v, l], i) => (
          <div
            key={l}
            className="reveal"
            style={{
              padding: '36px 28px',
              borderRight: i < 3 ? `1px solid ${BORDER}` : 'none',
              opacity: 0,
              transform: 'translateY(16px)',
              transition: `opacity .55s .${i}s, transform .55s .${i}s`,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: 'clamp(28px,4vw,52px)',
                color: A,
                lineHeight: 1,
                display: 'block',
              }}
            >
              {v}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 9,
                color: FG2,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginTop: 7,
                display: 'block',
              }}
            >
              {l}
            </span>
          </div>
        ))}
      </div>

      {/* ── FEATURE SECTIONS — all theme-aware ── */}
      <FeatureSection
        bg={BG}
        fg={FG}
        fg2={FG2}
        border={BORDER}
        surface={SURFACE2}
        accent={A}
        reverse={false}
        eyebrow="01 / LIVE MONITORING"
        title={['REALTIME', 'GRID', 'MONITORING']}
        body="The venue is divided into a 4×4 grid of 16 intelligent zones. Each tile updates every frame ( green safe, yellow warning, red critical ). Deploy security to the exact zone that needs it, instantly."
        tags={[
          '4×4 ZONE GRID',
          'PER TILE COUNT',
          'RISK CLASSIFICATION',
          '148+ FPS',
        ]}
        visual={<LiveGrid fg2={FG2} />}
      />

      <FeatureSection
        bg={BG}
        fg={FG}
        fg2={FG2}
        border={BORDER}
        surface={SURFACE2}
        accent={A}
        reverse={true}
        eyebrow="02 / AI MODEL"
        title={['CSRNet', 'DENSITY', 'MODEL']}
        body="Powered by CSRNet trained on Shanghai crowd datasets. Runs on your GPU at 148+ FPS. Counts exact crowd density per pixel, not just bounding boxes. Privacy safe by design."
        tags={['CSRNet SHB', 'CUDA GPU', 'DENSITY MAP', 'PRIVACY SAFE']}
        visual={<HeatmapPreview fg2={FG2} />}
      />

      <FeatureSection
        bg={BG}
        fg={FG}
        fg2={FG2}
        border={BORDER}
        surface={SURFACE2}
        accent={A}
        reverse={false}
        eyebrow="03 / INSTANT ALERTS"
        title={['TELEGRAM', 'PUSH', 'ALERTS']}
        body="When a zone turns RED, your entire security team gets an instant Telegram notification on any phone, anywhere in the venue. 100% free, works globally."
        tags={['TELEGRAM BOT', 'INSTANT PUSH', 'COOLDOWN CONTROL', 'FREE']}
        visual={<TelegramPreview border={BORDER} fg={FG} />}
      />

      <FeatureSection
        bg={BG}
        fg={FG}
        fg2={FG2}
        border={BORDER}
        surface={SURFACE2}
        accent={A}
        reverse={true}
        eyebrow="04 / ANALYTICS"
        title={['HISTORICAL', 'ANALYTICS', 'ENGINE']}
        body="Every frame stored in PostgreSQL. Review CSS timelines, alert histories, hotspot zones, and incident replays. Know which zone is always dangerous before the next event."
        tags={['CSS TIMELINE', 'HOTSPOT ZONES', 'ALERT HISTORY', 'POSTGRESQL']}
        visual={<ChartPreview fg2={FG2} />}
      />

      <FeatureSection
        bg={BG}
        fg={FG}
        fg2={FG2}
        border={BORDER}
        surface={SURFACE2}
        accent={A}
        reverse={false}
        eyebrow="05 / ACCESS CONTROL"
        title={['ROLE BASED', 'ACCESS', 'CONTROL']}
        body="Super Admin sets up the system. Venue Manager configures thresholds. Security Guards view the live grid on any phone, no app needed, just open the website."
        tags={['SUPER ADMIN', 'VENUE MANAGER', 'SECURITY GUARD', 'READ ONLY']}
        visual={<RolesPreview surface={SURFACE} border={BORDER} />}
      />

      {/* ── DASHBOARD PREVIEW — contrast section (theme-aware) ── */}
      <section
        className="reveal"
        style={{
          background: CON_BG,
          color: CON_FG,
          padding: 'clamp(70px,9vw,130px) 40px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 72,
          alignItems: 'center',
          borderBottom: `1px solid ${CON_BORDER}`,
          opacity: 0,
          transform: 'translateY(32px)',
          transition: 'opacity .75s, transform .75s',
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 9,
              color: A,
              letterSpacing: '0.2em',
              marginBottom: 14,
            }}
          >
            LIVE PLATFORM
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: 'clamp(44px,7vw,90px)',
              lineHeight: 0.9,
              textTransform: 'uppercase',
              color: CON_FG,
              marginBottom: 24,
            }}
          >
            INTELLIGENT
            <br />
            CROWD
            <br />
            CONTROL
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.72,
              color: CON_FG2,
              marginBottom: 24,
            }}
          >
            One unified dashboard connects your camera feed, AI model, alert
            system, and analytics. Sub 100ms live updates via WebSocket. Access
            from any device on your network.
          </p>
          <Link
            to={user ? '/dashboard' : '/login'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              fontFamily: 'var(--font-m)',
              fontSize: 11,
              letterSpacing: '.12em',
              color: CON_FG,
              border: `1px solid ${CON_BORDER}`,
              padding: '11px 18px',
              textDecoration: 'none',
              transition: 'all 0.28s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = A;
              e.currentTarget.style.color = '#141414';
              e.currentTarget.style.borderColor = A;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = CON_FG;
              e.currentTarget.style.borderColor = CON_BORDER;
            }}
          >
            {user ? 'ACCESS DASHBOARD →' : 'SIGN IN TO ACCESS'}
          </Link>
        </div>
        <MockDashboard />
      </section>

      {/* ── PARTNER API — contrast section (theme-aware) ── */}
      <section
        style={{
          padding: 'clamp(70px,9vw,130px) 40px',
          background: CON_BG,
          color: CON_FG,
          borderBottom: `1px solid ${CON_BORDER}`,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-m)',
            fontSize: 9,
            color: A,
            letterSpacing: '0.2em',
            marginBottom: 14,
          }}
        >
          PARTNER INTEGRATION
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: 'clamp(44px,7vw,90px)',
            lineHeight: 0.9,
            textTransform: 'uppercase',
            color: CON_FG,
            marginBottom: 48,
          }}
        >
          WHO
          <br />
          CONNECTS
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 1,
            background: `${CON_BORDER}`,
            border: `1px solid ${CON_BORDER}`,
          }}
        >
          {[
            [
              'EMERGENCY',
              'City Police\nControl Room',
              'RED zone alerts & evacuation guidance direct to dispatch',
              'cg-partner-police-2026',
            ],
            [
              'EMERGENCY',
              'Hospital\nEmergency',
              'CSS threshold alerts trigger ambulance standby automatically',
              'cg-partner-hospital-2026',
            ],
            [
              'ADMIN',
              'Venue\nAdministration',
              'Full dashboard access, configure thresholds, incident reports',
              'cg-partner-admin-2026',
            ],
            [
              'SECURITY',
              'Security\nAgency',
              'Live grid on security tablets, deploy to the right zone',
              'cg-partner-security-2026',
            ],
            [
              'READONLY',
              'Media &\nPress',
              'Read only crowd counts for event reporting',
              'cg-demo-key-2026',
            ],
            [
              'SWAGGER',
              'API\nExplorer',
              'Interactive docs, test every endpoint in your browser',
              'localhost:8000/docs',
            ],
          ].map(([role, name, desc, key]) => (
            <div
              key={key}
              style={{
                background: CON_BG,
                padding: 28,
                transition: 'all 0.28s',
                borderRight: `1px solid ${CON_BORDER}`,
                borderBottom: `1px solid ${CON_BORDER}`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = A;
                Array.from(e.currentTarget.children).forEach(
                  c => (c.style.color = '#141414')
                );
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = CON_BG;
                Array.from(e.currentTarget.children).forEach(
                  c => (c.style.color = '')
                );
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 9,
                  color: CON_FG2,
                  letterSpacing: '0.15em',
                  display: 'block',
                  marginBottom: 7,
                }}
              >
                {role}
              </span>
              <div
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: 'clamp(16px,2.2vw,26px)',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  marginBottom: 10,
                  color: CON_FG,
                }}
              >
                {name.split('\n').map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: CON_FG2 }}>
                {desc}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 8,
                  border: `1px solid ${CON_BORDER}`,
                  padding: '3px 7px',
                  marginTop: 14,
                  display: 'inline-block',
                  color: CON_FG2,
                }}
              >
                {key}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER — always accent yellow ── */}
      <footer
        style={{
          background: A,
          color: '#141414',
          padding: '56px 40px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <a
          href="mailto:crowdguard@ai.com"
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: 'clamp(28px,6.5vw,72px)',
            lineHeight: 0.9,
            textTransform: 'uppercase',
            color: '#141414',
            display: 'block',
            marginBottom: 52,
            transition: 'opacity 0.25s',
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.target.style.opacity = 0.6)}
          onMouseLeave={e => (e.target.style.opacity = 1)}
        >
          CROWDGUARD@AI.COM
        </a>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 36,
            borderTop: '1px solid rgba(0,0,0,0.15)',
            paddingTop: 36,
            marginBottom: 36,
          }}
        >
          {[
            [
              'PLATFORM',
              [
                ['Dashboard', '/dashboard'],
                ['Analytics', '/analytics'],
                ['Settings', '/settings'],
                ['API Docs', 'http://localhost:8000/docs'],
              ],
            ],
            [
              'TECHNOLOGY',
              [
                ['CSRNet Model', '#'],
                ['FastAPI', '#'],
                ['PostgreSQL', '#'],
                ['WebSocket', '#'],
              ],
            ],
            [
              'PROJECT',
              [
                ['About', '/about'],
                ['Recordings', '/recordings'],
                ['Login', '/login'],
                ['GitHub', 'https://github.com/i-nivedhya', true],
              ],
            ],
          ].map(([title, links]) => (
            <div key={title}>
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 9,
                  color: 'rgba(20,20,20,0.45)',
                  letterSpacing: '0.2em',
                  marginBottom: 14,
                }}
              >
                {title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {links.map(([label, to, ext]) =>
                  ext ? (
                    <a
                      key={label}
                      href={to}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontFamily: 'var(--font-d)',
                        fontSize: 'clamp(14px,1.8vw,20px)',
                        color: '#141414',
                        textTransform: 'uppercase',
                        transition: 'opacity 0.2s',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={e => (e.target.style.opacity = 0.5)}
                      onMouseLeave={e => (e.target.style.opacity = 1)}
                    >
                      {label}
                    </a>
                  ) : (
                    <Link
                      key={label}
                      to={to}
                      style={{
                        fontFamily: 'var(--font-d)',
                        fontSize: 'clamp(14px,1.8vw,20px)',
                        color: '#141414',
                        textTransform: 'uppercase',
                        transition: 'opacity 0.2s',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={e => (e.target.style.opacity = 0.5)}
                      onMouseLeave={e => (e.target.style.opacity = 1)}
                    >
                      {label}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(0,0,0,0.15)',
            paddingTop: 18,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: 15,
              letterSpacing: '0.12em',
              color: '#141414',
            }}
          >
            CROWDGUARD
          </span>
          <span
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 9,
              color: 'rgba(20,20,20,0.45)',
              letterSpacing: '0.1em',
            }}
          >
            © 2026 CROWDGUARD AI
          </span>
        </div>
        <svg
          style={{
            position: 'absolute',
            bottom: 0,
            right: 60,
            opacity: 0.07,
            pointerEvents: 'none',
          }}
          width="180"
          height="260"
          viewBox="0 0 180 260"
          fill="none"
        >
          <ellipse cx="90" cy="52" rx="26" ry="30" fill="#141414" />
          <path
            d="M30 165 Q55 105 90 95 Q125 105 150 165 L158 255 H22 Z"
            fill="#141414"
          />
          <path d="M30 165 L12 250 H46 L52 165Z" fill="#141414" />
          <path d="M150 165 L168 250 H134 L128 165Z" fill="#141414" />
        </svg>
      </footer>
    </div>
  );
}

/* ── Feature Section — fully theme-aware ── */
function FeatureSection({
  bg,
  fg,
  fg2,
  border,
  surface,
  accent,
  reverse,
  eyebrow,
  title,
  body,
  tags,
  visual,
}) {
  return (
    <section
      className="reveal"
      style={{
        background: bg,
        color: fg,
        padding: 'clamp(70px,9vw,130px) 40px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 72,
        alignItems: 'center',
        borderBottom: `1px solid ${border}`,
        direction: reverse ? 'rtl' : 'ltr',
        opacity: 0,
        transform: 'translateY(32px)',
        transition: 'opacity .75s, transform .75s',
      }}
    >
      <div style={{ direction: 'ltr' }}>
        <p
          style={{
            fontFamily: 'var(--font-m)',
            fontSize: 9,
            color: accent,
            letterSpacing: '0.2em',
            marginBottom: 14,
          }}
        >
          {eyebrow}
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: 'clamp(36px,5.5vw,72px)',
            lineHeight: 0.95,
            textTransform: 'uppercase',
            marginBottom: 20,
            color: fg,
          }}
        >
          {title.map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </h2>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.72,
            color: fg2,
            maxWidth: 380,
            marginBottom: 20,
          }}
        >
          {body}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {tags.map(t => (
            <span
              key={t}
              style={{
                fontFamily: 'var(--font-m)',
                fontSize: 9,
                border: `1px solid ${border}`,
                padding: '5px 10px',
                color: fg2,
                letterSpacing: '0.1em',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div
        style={{
          background: '#141414',
          border: `1px solid ${border}`,
          borderRadius: 2,
          padding: 28,
          minHeight: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          direction: 'ltr',
        }}
      >
        {visual}
      </div>
    </section>
  );
}

/* ── Sub-components ── */
function HeatmapPreview({ fg2 }) {
  const [cells, setCells] = useState(() =>
    Array.from({ length: 64 }, () => Math.random())
  );

  useEffect(() => {
    const iv = setInterval(
      () => setCells(Array.from({ length: 64 }, () => Math.random())),
      1500
    );
    return () => clearInterval(iv);
  }, []);

  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = e => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const rotateX = ((mouseY - centerY) / rect.height) * 15;
      const rotateY = ((mouseX - centerX) / rect.width) * -15;

      containerRef.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.transform =
          'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      style={{ width: '100%', maxWidth: 250 }}
      ref={containerRef}
      onMouseEnter={() => document.body.classList.add('cg-cur-on')}
      onMouseLeave={() => document.body.classList.remove('cg-cur-on')}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8,1fr)',
          gap: 2,
          transition: 'transform 0.1s ease-out',
          transformStyle: 'preserve-3d',
        }}
      >
        {cells.map((v, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              borderRadius: 1,
              background: `rgb(${Math.floor(255 * v)},${Math.floor(80 * (1 - v))},${Math.floor(40 * (1 - v))})`,
              transition: 'background 1.2s ease',
            }}
          />
        ))}
      </div>
      <p
        style={{
          fontFamily: 'var(--font-m)',
          fontSize: 8,
          color: '#666',
          textAlign: 'center',
          marginTop: 10,
          letterSpacing: '0.1em',
        }}
      >
        CSRNet DENSITY HEATMAP
      </p>
    </div>
  );
}
function TelegramPreview({ border, fg }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = e => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const rotateX = ((mouseY - centerY) / rect.height) * 15;
      const rotateY = ((mouseX - centerX) / rect.width) * -15;

      containerRef.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.transform =
          'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 270,
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => document.body.classList.add('cg-cur-on')}
      onMouseLeave={() => document.body.classList.remove('cg-cur-on')}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          paddingBottom: 9,
          borderBottom: `1px solid #333`,
          marginBottom: 3,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: '#0088cc',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          🤖
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>
            CrowdGuard Alert Bot
          </div>
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 8,
              color: '#00cc44',
            }}
          >
            ● ACTIVE
          </div>
        </div>
      </div>
      {[
        {
          bg: 'rgba(139,0,0,0.3)',
          border: 'rgba(255,51,51,0.4)',
          r: '8px',
          content: (
            <>
              <span style={{ color: '#ff6666' }}>🚨 CRITICAL ALERT</span>
              <br />
              <span style={{ color: '#ccc' }}>Zone (0,0) — RED ZONE</span>
              <br />
              <span style={{ color: '#ccc' }}>CSS: 88.4 | Count: 47</span>
            </>
          ),
          time: '01:00:31',
          self: false,
        },
        {
          bg: 'rgba(0,50,100,0.3)',
          border: 'rgba(0,136,204,0.4)',
          r: '8px',
          content: (
            <>
              <span style={{ color: '#66b3ff' }}>
                📊 Master CSS: 76.2 → SEVERE
              </span>
              <br />
              <span style={{ color: '#ccc' }}>Red zones: 2 active</span>
            </>
          ),
          time: '01:00:33',
          self: false,
        },
        {
          bg: 'rgba(50,80,20,0.3)',
          border: 'rgba(204,255,0,0.4)',
          r: '8px',
          content: (
            <>
              <span style={{ color: '#ccff00' }}>
                ✅ Guard dispatched to Gate 2
              </span>
            </>
          ),
          time: '01:00:45',
          self: true,
        },
      ].map((m, i) => (
        <div
          key={i}
          style={{
            background: m.bg,
            border: `1px solid ${m.border}`,
            borderRadius: m.r,
            padding: '12px 14px',
            fontSize: 11,
            lineHeight: 1.6,
            color: '#ccc',
            alignSelf: m.self ? 'flex-end' : 'flex-start',
          }}
        >
          {m.content}
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 7,
              color: '#666',
              marginTop: 4,
            }}
          >
            {m.time}
          </div>
        </div>
      ))}
    </div>
  );
}
function ChartPreview({ fg2 }) {
  const [data] = useState([
    32, 45, 38, 55, 48, 62, 71, 58, 85, 76, 42, 38, 44, 51, 47, 39, 43, 58, 65,
    72, 68, 55, 49, 42, 38, 44, 52, 60, 56, 48,
  ]);

  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = e => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const rotateX = ((mouseY - centerY) / rect.height) * 15;
      const rotateY = ((mouseX - centerX) / rect.width) * -15;

      containerRef.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.transform =
          'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      style={{ width: '100%', maxWidth: 280 }}
      ref={containerRef}
      onMouseEnter={() => document.body.classList.add('cg-cur-on')}
      onMouseLeave={() => document.body.classList.remove('cg-cur-on')}
    >
      <div
        style={{
          transition: 'transform 0.1s ease-out',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 3,
            height: 100,
            marginBottom: 7,
          }}
        >
          {data.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: '2px 2px 0 0',
                minWidth: 0,
                height: `${v}%`,
                background:
                  v > 75
                    ? 'linear-gradient(to top,#ff2828,rgba(255,40,40,.3))'
                    : v > 60
                      ? 'linear-gradient(to top,#ff6400,rgba(255,100,0,.3))'
                      : 'linear-gradient(to top,#CCFF00,rgba(204,255,0,.28))',
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-m)',
            fontSize: 8,
            color: '#666',
            textAlign: 'center',
            letterSpacing: '0.1em',
          }}
        >
          CSS TIMELINE · LAST 60 MINUTES
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 16,
          }}
        >
          {[
            ['PEAK CSS', '88.8', '#ff2828'],
            ['AVG CSS', '42.3', '#CCFF00'],
            ['ALERTS', '47', '#ff6400'],
          ].map(([l, v, c]) => (
            <div key={l}>
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 8,
                  color: '#666',
                }}
              >
                {l}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: 24,
                  color: c,
                  fontWeight: 700,
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function RolesPreview({ surface, border }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = e => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const rotateX = ((mouseY - centerY) / rect.height) * 15;
      const rotateY = ((mouseX - centerX) / rect.width) * -15;

      containerRef.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.transform =
          'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        maxWidth: 280,
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => document.body.classList.add('cg-cur-on')}
      onMouseLeave={() => document.body.classList.remove('cg-cur-on')}
    >
      {[
        {
          role: 'SUPER ADMIN',
          color: '#CCFF00',
          desc: 'Full control + user management',
        },
        {
          role: 'VENUE MANAGER',
          color: '#0088ff',
          desc: 'Configure settings + analytics',
        },
        {
          role: 'SECURITY GUARD',
          color: '#ffc800',
          desc: 'View dashboard on any phone',
        },
        {
          role: 'READ ONLY',
          color: '#888888',
          desc: 'Police / hospital partners',
        },
      ].map(r => (
        <div
          key={r.role}
          style={{
            background: 'rgba(26,26,26,0.8)',
            border: `1px solid ${r.color}22`,
            borderLeft: `3px solid ${r.color}`,
            padding: '12px 16px',
            borderRadius: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 10,
              color: r.color,
              letterSpacing: '0.1em',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            {r.role}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#999',
              lineHeight: 1.4,
            }}
          >
            {r.desc}
          </div>
        </div>
      ))}
    </div>
  );
}
function MockDashboard() {
  return (
    <div
      style={{
        background: '#141414',
        borderRadius: 3,
        padding: 18,
        transform: 'perspective(900px) rotateY(-7deg) rotateX(2deg)',
        boxShadow: '36px 36px 72px rgba(0,0,0,0.25)',
        border: '1px solid #1e1e1e',
        transition: 'transform .55s',
      }}
      onMouseEnter={e =>
        (e.currentTarget.style.transform =
          'perspective(900px) rotateY(-2deg) rotateX(1deg)')
      }
      onMouseLeave={e =>
        (e.currentTarget.style.transform =
          'perspective(900px) rotateY(-7deg) rotateX(2deg)')
      }
    >
      <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
        {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => (
          <div
            key={c}
            style={{ width: 9, height: 9, borderRadius: '50%', background: c }}
          />
        ))}
        <span
          style={{
            fontFamily: 'var(--font-m)',
            fontSize: 8,
            color: '#333',
            marginLeft: 7,
          }}
        >
          localhost:5173
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 3,
          }}
        >
          {[
            ['#ff6400', 11],
            ['#ffc800', 9],
            ['#ff6400', 10],
            ['#ff6400', 10],
            ['#00cc44', 4],
            ['#00cc44', 6],
            ['#00cc44', 5],
            ['#00cc44', 5],
            ['#00cc44', 3],
            ['#00cc44', 3],
            ['#00cc44', 7],
            ['#00cc44', 7],
            ['#00cc44', 4],
            ['#00cc44', 4],
            ['#ff2828', 12],
            ['#00cc44', 5],
          ].map(([c, n], i) => (
            <div
              key={i}
              style={{
                aspectRatio: 1,
                borderRadius: 1,
                background: `${c}18`,
                border: `1px solid ${c}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-m)',
                fontSize: 8,
                color: c,
              }}
            >
              {n}
            </div>
          ))}
        </div>
        <div
          style={{
            flex: '0 0 76px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {[
            ['46.6', 'CSS'],
            ['1', 'RED'],
          ].map(([v, l]) => (
            <div
              key={l}
              style={{ background: '#1a1a1a', borderRadius: 2, padding: 7 }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: 24,
                  color: l === 'RED' ? '#ff2828' : '#CCFF00',
                }}
              >
                {v}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-m)',
                  fontSize: 6,
                  color: '#333',
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          background: '#1c1c1c',
          borderRadius: 2,
          padding: '7px 10px',
          borderLeft: '2px solid #ff2828',
        }}
      >
        <div
          style={{ fontFamily: 'var(--font-m)', fontSize: 7, color: '#ff2828' }}
        >
          🚨 RED ZONE ACTIVE — (3,2)
        </div>
        <div
          style={{
            fontFamily: 'var(--font-m)',
            fontSize: 6,
            color: '#333',
            marginTop: 2,
          }}
        >
          Dispatch security immediately
        </div>
      </div>
    </div>
  );
}
