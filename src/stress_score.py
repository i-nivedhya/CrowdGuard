# src/stress_score.py — CrowdGuard AI v2.0
# Unified Crowd Stress Score (CSS) 0-100

import numpy as np
import cv2
from collections import deque
import config
 
# CSS level bands for interpretation
CSS_BANDS = [
    (0,  20, 'NORMAL',   (0, 180, 0)),     # green
    (21, 40, 'ELEVATED', (0, 200, 180)),    # teal
    (41, 60, 'HIGH',     (0, 200, 255)),    # yellow
    (61, 80, 'SEVERE',   (0, 100, 255)),    # orange
    (81,100, 'CRITICAL', (0, 0, 220)),      # red
]
 
 
class StressScoreEngine:
    def __init__(self):
        # Keep CSS_HISTORY_LEN frames of CSS history for sparkline
        self.history = deque(maxlen=config.CSS_HISTORY_LEN)
        self.current_css = 0.0
 
    def compute(self, tile_counts, tile_risks, surge_alerts,
                zone_pressure, tile_flows, venue):
        """
        Compute the CSS for this frame.
        Returns (css_value, level_string, band_color)
        """
        if venue not in config.VENUE_THRESHOLDS:
            venue = config.DEFAULT_VENUE
        yellow_thresh, red_thresh = config.VENUE_THRESHOLDS.get(venue.lower(), config.VENUE_THRESHOLDS.get(config.DEFAULT_VENUE.lower(), (6, 14)))
        weights = config.CSS_WEIGHTS
 
        # ── Component 1: Density sub-score ──────────────────────
        # How many tiles are at yellow or red right now?
        red_count    = sum(1 for t in tile_risks if tile_risks[t][0] == 'red')
        yellow_count = sum(1 for t in tile_risks if tile_risks[t][0] == 'yellow')
        density_score = min(100, red_count * 15 + yellow_count * 5)
 
        # ── Component 2: Surge sub-score ────────────────────────
        # How fast is the busiest tile growing?
        surge_deltas = [abs(a.get('delta', 0)) for a in surge_alerts]
        max_delta    = max(surge_deltas) if surge_deltas else 0
        surge_score  = min(100, max_delta * 10)
 
        # ── Component 3: Zone pressure sub-score ────────────────
        max_pressure   = max(zone_pressure.values(), default=0)
        pressure_score = min(100, (max_pressure / max(red_thresh * 2.0, 1)) * 100)
 
        # ── Component 4: Motion chaos sub-score ─────────────────
        chaos_values = [tf['chaos'] for tf in tile_flows.values() if 'chaos' in tf]
        if chaos_values:
            chaos_score = min(100, (np.mean(chaos_values) / 1.5) * 100)
        else:
            chaos_score = 0.0
 
        # ── Weighted sum ─────────────────────────────────────────
        css = (density_score  * weights['density'] +
               surge_score    * weights['surge'] +
               pressure_score * weights['zone_pressure'] +
               chaos_score    * weights['motion_chaos'])
 
        css = round(min(100.0, max(0.0, css)), 1)
        self.current_css = css
        self.history.append(css)
 
        level, color = self._get_band(css)
        return css, level, color
 
    def _get_band(self, css):
        for lo, hi, label, color in CSS_BANDS:
            if lo <= css <= hi:
                return label, color
        return 'CRITICAL', (0, 0, 220)
 
    def get_trend_arrow(self):
        """
        Returns 'UP', 'DOWN', or 'STABLE' based on the last 10 frames.
        This is shown as an arrow next to the CSS number on screen.
        """
        if len(self.history) < 10:
            return 'STABLE'
        recent = list(self.history)[-10:]
        diff   = recent[-1] - recent[0]
        if diff > 3:
            return 'UP'
        elif diff < -3:
            return 'DOWN'
        return 'STABLE'
 
    def get_sparkline_data(self, width=120, height=30):
        """
        Returns a small numpy image (height x width x 3) showing the CSS
        history as a line chart. Used as an overlay on the dashboard.
        """
        canvas = np.zeros((height, width, 3), dtype=np.uint8)
        hist   = list(self.history)
        if len(hist) < 2:
            return canvas
 
        # Normalise to canvas height
        pts = []
        for i, val in enumerate(hist):
            x = int(i * (width - 1) / max(len(hist) - 1, 1))
            y = height - 1 - int(val / 100.0 * (height - 1))
            pts.append((x, y))
 
        # Draw line segments
        for i in range(len(pts) - 1):
            cv2.line(canvas, pts[i], pts[i + 1], (100, 220, 100), 1)
 
        return canvas
