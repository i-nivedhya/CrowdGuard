# src/prediction_engine.py — CrowdGuard AI v2.0
# Predictive zone warnings using linear regression on smoothed count history

import numpy as np
from collections import deque
import config


class PredictionEngine:
    """
    Watches smoothed tile count history and fires a warning when a tile
    is on a GENUINE upward trend toward the NEXT danger threshold.

    Guards against false positives:
    1. Already-red tiles are skipped (nothing to predict)
    2. Green tile must be at 60% of yellow before checking
    3. Yellow tile must be at 60% of red before checking
    4. Slope must be clearly rising (> 0.08)
    5. R² must be above PREDICTION_R2_MIN (clean straight trend)
    6. 65% of last 5 frames must be rising (no zigzag)
    7. Projected count must exceed NEXT threshold by 15% margin
    8. Uses exponentially smoothed counts, not raw noisy values
    """

    def __init__(self):
        self._history   = {}   # {tile: deque of smoothed counts}
        self._smooth    = {}   # {tile: float} exponential smoothed value
        self._pred_hold = {}   # {tile: (pred_dict, frames_remaining)}

    def update(self, tile_counts, venue):
        """
        Call every processed frame.
        Returns dict: {tile: prediction_dict} for tiles with active warnings.
        """
        yellow_thresh, red_thresh = config.VENUE_THRESHOLDS.get(
            venue.lower(), config.VENUE_THRESHOLDS.get(config.DEFAULT_VENUE.lower(), (6, 14)))

        hold_frames  = getattr(config, 'PREDICTION_HOLD_FRAMES', 20)
        smooth_alpha = 0.35   # lower = more stable, higher = more responsive

        for tile, raw_count in tile_counts.items():

            # ── Smooth the count ──────────────────────────────────
            prev_smooth        = self._smooth.get(tile, raw_count)
            smoothed           = smooth_alpha * raw_count + (1 - smooth_alpha) * prev_smooth
            self._smooth[tile] = smoothed

            # ── Add to rolling history ────────────────────────────
            if tile not in self._history:
                self._history[tile] = deque(maxlen=config.PREDICTION_WINDOW)
            self._history[tile].append(smoothed)
            hist = self._history[tile]

            # Need minimum history to fit a trend
            if len(hist) < config.PREDICTION_MIN_WINDOW:
                continue

            # ── Guard 1: determine current risk level ─────────────
            if smoothed >= red_thresh:
                current_risk = 'red'
            elif smoothed >= yellow_thresh:
                current_risk = 'yellow'
            else:
                current_risk = 'green'

            # Already red — nothing to predict, skip
            if current_risk == 'red':
                continue

            # ── Guard 2: green tile must be near yellow ───────────
            # Stops orange boxes on cold tiles like count=2
            if current_risk == 'green' and smoothed < yellow_thresh * 0.75:
                continue

            # ── Guard 3: yellow tile must be near red ─────────────
            # Stops orange boxes on yellow tiles just staying yellow
            if current_risk == 'yellow' and smoothed < red_thresh * 0.65:
                continue

            # ── Fit linear regression to smoothed history ─────────
            x = np.arange(len(hist), dtype=float)
            y = np.array(hist)
            slope, intercept = np.polyfit(x, y, 1)

            # ── Guard 4: must be clearly rising ───────────────────
            if slope <= 0.08:
                continue

            # ── Guard 5: trend must be a clean straight line ──────
            y_pred = slope * x + intercept
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            r2     = 1.0 - (ss_res / ss_tot) if ss_tot > 1e-6 else 0.0

            if r2 < config.PREDICTION_R2_MIN:
                continue

            # ── Guard 6: 65% of last 5 frames must be rising ──────
            recent = list(hist)[-5:]
            if len(recent) >= 3:
                diffs        = [recent[i+1] - recent[i] for i in range(len(recent)-1)]
                rising_count = sum(1 for d in diffs if d > 0)
                if rising_count < len(diffs) * 0.65:
                    continue

            # ── Project forward ───────────────────────────────────
            frames_ahead = config.PREDICTION_FRAMES
            projected    = intercept + slope * (len(hist) + frames_ahead)

            pred = None

            # GREEN → only warn if projecting clearly past YELLOW
            if current_risk == 'green' and projected > yellow_thresh * 1.15:
                pred = {
                    'level':           'PRE_WARNING',
                    'projected_count': projected,
                    'frames_ahead':    frames_ahead,
                    'r_squared':       round(r2, 2),
                    'message':         f'Trending to YELLOW in ~{round(frames_ahead/5)}s'
                }

            # YELLOW → only warn if projecting clearly past RED
            elif current_risk == 'yellow' and projected > red_thresh * 1.15:
                pred = {
                    'level':           'IMMINENT_RED',
                    'projected_count': projected,
                    'frames_ahead':    frames_ahead,
                    'r_squared':       round(r2, 2),
                    'message':         f'Trending to RED in ~{round(frames_ahead/5)}s'
                }

            # ── Register prediction with hold timer ───────────────
            if pred is not None:
                self._pred_hold[tile] = (pred, hold_frames)

        # ── Tick down hold timers ─────────────────────────────────
        for tile in list(self._pred_hold.keys()):
            pred, timer = self._pred_hold[tile]
            if timer <= 1:
                del self._pred_hold[tile]
            else:
                self._pred_hold[tile] = (pred, timer - 1)

        # Return all tiles still within their hold window
        return {tile: pred for tile, (pred, _) in self._pred_hold.items()}