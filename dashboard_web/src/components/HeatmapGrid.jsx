import { useEffect, useRef, useState } from 'react';

const SERVER = 'http://localhost:8000';

/**
 * HeatmapGrid — shows the exact Python OpenCV frame at its real dimensions
 * Fetches frame size from server on mount so grid aligns perfectly with video
 */
export default function HeatmapGrid({
  tileCounts = {},
  tileRisks = {},
  frameUrl = null,
  venueId = 'college_main',
  rows = 4,
  cols = 4,
}) {
  const canvasRef = useRef(null);
  const [frameDims, setFrameDims] = useState({ w: 640, h: 480 });

  // Fetch real frame dimensions from server once
  useEffect(() => {
    fetch(`${SERVER}/frame_info/${venueId}`)
      .then(r => r.json())
      .then(d => {
        if (d.w && d.h) setFrameDims({ w: d.w, h: d.h });
      })
      .catch(() => {});

    // Re-check every 5s in case frame size changes
    const iv = setInterval(() => {
      fetch(`${SERVER}/frame_info/${venueId}`)
        .then(r => r.json())
        .then(d => {
          if (d.w && d.h) setFrameDims({ w: d.w, h: d.h });
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(iv);
  }, [venueId]);

  // Draw overlay canvas whenever data or dims change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = frameDims.w;
    const H = frameDims.h;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const counts = Object.values(tileCounts).map(Number);
    const maxCount = Math.max(...counts, 1);
    const cellW = W / cols;
    const cellH = H / rows;

    // 1. Risk colour fill
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `(${r},${c})`;
        const count = tileCounts[key] || 0;
        const intensity = count / maxCount;
        const risk = Array.isArray(tileRisks[key])
          ? tileRisks[key][0]
          : tileRisks[key] || 'green';
        const alpha = 0.13 + intensity * 0.22;

        let fill;
        if (risk === 'red') fill = `rgba(255,51,51,${alpha})`;
        else if (risk === 'orange') fill = `rgba(255,102,0,${alpha})`;
        else if (risk === 'yellow') fill = `rgba(255,200,0,${alpha})`;
        else fill = `rgba(0,200,68,${alpha * 0.65})`;

        ctx.fillStyle = fill;
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }

    // 2. Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(W, r * cellH);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, H);
      ctx.stroke();
    }

    // 3. Count + tile label per cell
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `(${r},${c})`;
        const count = tileCounts[key] || 0;
        const risk = Array.isArray(tileRisks[key])
          ? tileRisks[key][0]
          : tileRisks[key] || 'green';
        const dot =
          risk === 'red'
            ? '#ff3333'
            : risk === 'orange'
              ? '#ff6600'
              : risk === 'yellow'
                ? '#ffc800'
                : '#00cc44';
        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;

        // Risk dot — top left
        ctx.fillStyle = dot;
        ctx.beginPath();
        ctx.arc(c * cellW + 9, r * cellH + 9, 5, 0, Math.PI * 2);
        ctx.fill();

        // Count
        const fontSize = Math.max(14, Math.floor(cellW * 0.2));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(count, cx, cy - 5);

        // Tile key label
        ctx.font = `${Math.max(9, Math.floor(cellW * 0.1))}px monospace`;
        ctx.shadowBlur = 3;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(key, cx, cy + Math.floor(cellH * 0.24));

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }
    }
  }, [tileCounts, tileRisks, rows, cols, frameDims]);

  const aspectRatio = `${frameDims.w} / ${frameDims.h}`;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio,
          background: '#060a0f',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Real MJPEG video — exact frame from Python */}
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="Live feed"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill', // no crop — pixel-perfect match to canvas
              display: 'block',
            }}
            onError={e => {
              e.target.style.opacity = '0';
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2a2a2a',
              fontFamily: 'monospace',
              fontSize: 12,
              letterSpacing: '0.1em',
            }}
          >
            WAITING FOR VIDEO FEED…
          </div>
        )}

        {/* Canvas overlay — risk + grid + counts */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />

        {/* Frame dimensions badge — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 8,
            background: 'rgba(0,0,0,0.55)',
            padding: '2px 7px',
            borderRadius: 3,
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.06em',
          }}
        >
          {frameDims.w}×{frameDims.h}
        </div>

        {/* LIVE badge — bottom right */}
        {frameUrl && (
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              right: 8,
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid #00cc44',
              padding: '2px 8px',
              borderRadius: 3,
              fontFamily: 'monospace',
              fontSize: 9,
              color: '#00cc44',
              letterSpacing: '0.1em',
            }}
          >
            ● LIVE
          </div>
        )}
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
