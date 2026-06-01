# src/dashboard.py — CrowdGuard AI v2.0

import cv2
import numpy as np
import config

ARROW_SCALE = 15


def draw_dashboard(frame, density_map, tile_counts, tile_regions,
                   tile_risks, alerts, venue, total_count, fps,
                   tile_flows=None, collision_zones=None, chaotic_tiles=None,
                   predictions=None, css_value=0.0, css_level='NORMAL',
                   css_color=(0, 180, 0), css_trend='STABLE',
                   sparkline_img=None, recommendations=None):

    tile_flows      = tile_flows      or {}
    collision_zones = collision_zones or []
    chaotic_tiles   = chaotic_tiles   or []
    predictions     = predictions     or {}
    recommendations = recommendations or []

    h, w = frame.shape[:2]

    # ── Step 1: Heatmap ───────────────────────────────────────────────
    if config.SHOW_HEATMAP:
        d_norm    = cv2.normalize(density_map, None, 0, 255, cv2.NORM_MINMAX)
        d_uint8   = d_norm.astype(np.uint8)
        d_resized = cv2.resize(d_uint8, (w, h))
        heatmap   = cv2.applyColorMap(d_resized, cv2.COLORMAP_JET)
        frame     = cv2.addWeighted(frame, 0.65, heatmap, 0.35, 0)

    # ── Step 2: Colored tile overlay ──────────────────────────────────
    overlay = frame.copy()
    for tile, (x1, y1, x2, y2) in tile_regions.items():
        color = tile_risks[tile][1]
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
    cv2.addWeighted(overlay, config.OVERLAY_ALPHA, frame,
                    1 - config.OVERLAY_ALPHA, 0, frame)

    # ── Step 3: Grid lines ────────────────────────────────────────────
    for tile, (x1, y1, x2, y2) in tile_regions.items():
        cv2.rectangle(frame, (x1, y1), (x2, y2), config.COLOR_GRID, 1)

    # ── Step 4: Prediction dashed borders ─────────────────────────────
    for tile, pred in predictions.items():
        if tile not in tile_regions:
            continue
        x1, y1, x2, y2 = tile_regions[tile]
        _draw_dashed_rect(frame, x1 + 2, y1 + 2, x2 - 2, y2 - 2,
                          (0, 140, 255), dash=8)

    

    # ── Step 6: Flow arrows ───────────────────────────────────────────
    if config.SHOW_FLOW_ARROWS and tile_flows:
        for tile, flow in tile_flows.items():
            if tile not in tile_regions:
                continue
            x1, y1, x2, y2 = tile_regions[tile]
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            dx = int(flow['mean_dx'] * ARROW_SCALE)
            dy = int(flow['mean_dy'] * ARROW_SCALE)
            if abs(dx) + abs(dy) > 2:
                cv2.arrowedLine(frame, (cx, cy), (cx + dx, cy + dy),
                                (255, 255, 100), 2, tipLength=0.3)

    # ── Step 7: Per-tile count labels ─────────────────────────────────
    for tile, (x1, y1, x2, y2) in tile_regions.items():
        count = tile_counts[tile]
        cv2.putText(frame, f'{count:.0f}',
                    (x1 + 5, y1 + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                    config.COLOR_TEXT, 1, cv2.LINE_AA)

   

    
    # ── Step 11: Status bar ───────────────────────────────────────────
    cv2.putText(frame,
                f'Total:{total_count} | [Q]quit [V]venue [F]flow',
                (10, h - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44,
                (220, 220, 220), 1, cv2.LINE_AA)

    return frame


# ── Private helpers ───────────────────────────────────────────────────────────

def _draw_dashed_rect(frame, x1, y1, x2, y2, color, dash=8):
    pts = [(x1, y1, x2, y1), (x2, y1, x2, y2),
           (x2, y2, x1, y2), (x1, y2, x1, y1)]
    for ax, ay, bx, by in pts:
        length = max(abs(bx - ax), abs(by - ay))
        steps  = length // (dash * 2)
        for i in range(steps):
            t0 = (2 * i * dash)       / max(length, 1)
            t1 = ((2 * i + 1) * dash) / max(length, 1)
            p0 = (int(ax + t0 * (bx - ax)), int(ay + t0 * (by - ay)))
            p1 = (int(ax + t1 * (bx - ax)), int(ay + t1 * (by - ay)))
            cv2.line(frame, p0, p1, color, 2)


