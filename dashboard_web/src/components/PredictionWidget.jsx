import { useMemo } from 'react';

// Simple linear regression
function linReg(vals) {
  const n = vals.length;
  if (n < 3) return null;
  const xs = vals.map((_, i) => i);
  const ys = vals;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const inter = (sumY - slope * sumX) / n;
  return { slope, inter };
}

export default function PredictionWidget({
  cssHistory = [],
  highThreshold = 75,
  updateIntervalSecs = 1,
}) {
  const pred = useMemo(() => {
    if (cssHistory.length < 5) return null;
    const recent = cssHistory.slice(-20);
    const reg = linReg(recent);
    if (!reg || reg.slope <= 0) return null;

    const currentVal = recent[recent.length - 1];
    if (currentVal >= highThreshold) return null;

    // Steps until threshold
    const stepsLeft =
      (highThreshold - reg.inter) / reg.slope - (recent.length - 1);
    if (stepsLeft <= 0 || stepsLeft > 300) return null;

    const secsLeft = Math.round(stepsLeft * updateIntervalSecs);
    const minsLeft = Math.round(secsLeft / 60);

    return { minsLeft, secsLeft, slope: reg.slope, currentVal, stepsLeft };
  }, [cssHistory, highThreshold]);

  const currentCss =
    cssHistory.length > 0 ? cssHistory[cssHistory.length - 1] : 0;
  const trend =
    cssHistory.length > 3
      ? cssHistory[cssHistory.length - 1] - cssHistory[cssHistory.length - 4]
      : 0;

  // Mini sparkline points
  const sparkPoints = useMemo(() => {
    const data = cssHistory.slice(-20);
    if (data.length < 2) return '';
    const w = 200,
      h = 40;
    const mn = Math.min(...data),
      mx = Math.max(...data, mn + 1);
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - mn) / (mx - mn)) * h;
        return `${x},${y}`;
      })
      .join(' ');
  }, [cssHistory]);

  // Prediction line
  const predPoints = useMemo(() => {
    if (!pred) return '';
    const data = cssHistory.slice(-20);
    if (data.length < 2) return '';
    const allVals = [...data];
    const mn = Math.min(...allVals),
      mx = Math.max(highThreshold, ...allVals);
    const w = 200,
      h = 40;
    const step = Math.min(pred.stepsLeft, 10);
    const reg = linReg(data);
    if (!reg) return '';
    return Array.from({ length: step + 1 }, (_, i) => {
      const idx = data.length - 1 + i;
      const v = Math.min(reg.inter + reg.slope * idx, 100);
      const x = ((data.length - 1 + i) / (data.length - 1 + step)) * w;
      const y = h - ((v - mn) / (mx - mn)) * h;
      return `${x},${y}`;
    }).join(' ');
  }, [cssHistory, pred, highThreshold]);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 16,
        borderLeft: pred ? '3px solid var(--orange)' : '3px solid var(--green)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-m)',
          fontSize: 9,
          letterSpacing: '0.2em',
          color: 'var(--text3)',
          marginBottom: 12,
        }}
      >
        AI PREDICTION
      </div>

      {/* Sparkline */}
      {sparkPoints && (
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <svg width="200" height="40" style={{ overflow: 'visible' }}>
            {/* Threshold line */}
            <line
              x1="0"
              y1={40 - (highThreshold / 100) * 40 - 1}
              x2="200"
              y2={40 - (highThreshold / 100) * 40 - 1}
              stroke="#ff6600"
              strokeWidth="0.8"
              strokeDasharray="3,3"
              opacity="0.5"
            />
            {/* Actual CSS history */}
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
            />
            {/* Prediction line */}
            {predPoints && (
              <polyline
                points={predPoints}
                fill="none"
                stroke="#ff6600"
                strokeWidth="1"
                strokeDasharray="4,2"
              />
            )}
          </svg>
          <span
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              fontFamily: 'var(--font-m)',
              fontSize: 8,
              color: '#ff6600',
            }}
          >
            HIGH {highThreshold}
          </span>
        </div>
      )}

      {/* Prediction message */}
      {pred ? (
        <div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--orange)' }}>⚠ </span>
            <strong>
              CSS will reach HIGH in ~
              {pred.minsLeft < 1 ? `${pred.secsLeft}s` : `${pred.minsLeft} min`}
            </strong>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-m)',
              fontSize: 9,
              color: 'var(--text3)',
            }}
          >
            Trend: +{pred.slope.toFixed(2)}/update · Current:{' '}
            {pred.currentVal.toFixed(1)}
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: 12,
            color: trend > 0.5 ? 'var(--yellow)' : 'var(--green)',
          }}
        >
          {cssHistory.length < 5
            ? '⏳ Collecting data...'
            : trend > 0.5
              ? `⬆ CSS rising (+${trend.toFixed(1)}) — monitor closely`
              : trend < -0.5
                ? `⬇ CSS falling (${trend.toFixed(1)}) — situation improving`
                : '✓ Crowd density stable'}
        </div>
      )}
    </div>
  );
}
