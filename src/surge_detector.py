# src/surge_detector.py — CrowdGuard AI v2.0
from collections import deque
import config

class SurgeDetector:
    """
    Maintains rolling count history per tile.
    Detects three dangerous patterns:
    1. SURGE         — rapid crowd buildup in one tile
    2. CASCADE_RISK  — multiple adjacent tiles all high
    3. DISPERSAL     — sudden crowd scatter
    Alerts are held visible for ALERT_HOLD_FRAMES to prevent flickering.
    """
    def __init__(self):
        self.history       = {}   # {tile: deque of float counts}
        self.alerts_active = []   # current active alerts
        self._alert_hold   = {}   # {(tile, type): (alert_dict, frames_remaining)}

    def update(self, tile_counts, tile_risks, zone_pressure, venue):
        """
        Call this every processed frame.
        Returns list of alert dicts, held for minimum ALERT_HOLD_FRAMES.
        """
        yellow_thresh, red_thresh = config.VENUE_THRESHOLDS.get(
            venue.lower(), config.VENUE_THRESHOLDS.get(config.DEFAULT_VENUE.lower(), (6, 14)))

        fresh_alerts = []

        for tile, count in tile_counts.items():
            if tile not in self.history:
                self.history[tile] = deque(maxlen=config.SURGE_HISTORY_LEN)
            hist = self.history[tile]
            hist.append(count)

            if len(hist) < config.SURGE_FRAME_GAP + 1:
                continue

            prev_count = hist[-config.SURGE_FRAME_GAP - 1]
            delta      = count - prev_count
            risk_label = tile_risks[tile][0]

            # ── Alert 1: SURGE ────────────────────────────────────
            if delta >= config.SURGE_DELTA_THRESHOLD and risk_label in ('yellow', 'red'):
                fresh_alerts.append({
                    'tile':     tile,
                    'type':     'SURGE',
                    'severity': 'HIGH' if risk_label == 'red' else 'MODERATE',
                    'delta':    delta,
                    'message':  f'Zone {tile} - rapid crowd buildup (+{delta:.0f} in {config.SURGE_FRAME_GAP} frames)'
                })

            # ── Alert 2: CASCADE RISK ─────────────────────────────
            pressure = zone_pressure[tile]
            if pressure > red_thresh * 1.5 and delta > 0 and risk_label == 'red':
                fresh_alerts.append({
                    'tile':     tile,
                    'type':     'CASCADE_RISK',
                    'severity': 'CRITICAL',
                    'delta':    delta,
                    'message':  f'Zone {tile} - surrounding zones CRITICAL, stampede risk'
                })

            # ── Alert 3: SUDDEN DISPERSAL ─────────────────────────
            if (len(hist) >= config.SURGE_HISTORY_LEN and
                    prev_count > yellow_thresh and
                    count < prev_count * 0.5):
                fresh_alerts.append({
                    'tile':     tile,
                    'type':     'SUDDEN_DISPERSAL',
                    'severity': 'HIGH',
                    'delta':    delta,
                    'message':  f'Zone {tile} - sudden crowd scatter, check for incident'
                })

        # ── Hold logic: keep alerts visible for minimum N frames ──
        # This stops alerts from flickering on and off every frame
        hold_frames = getattr(config, 'ALERT_HOLD_FRAMES', 15)

        # Register new alerts with full hold timer
        for alert in fresh_alerts:
            key = (alert['tile'], alert['type'])
            self._alert_hold[key] = (alert, hold_frames)

        # Tick down all timers
        for key in list(self._alert_hold.keys()):
            alert, timer = self._alert_hold[key]
            if timer <= 1:
                del self._alert_hold[key]
            else:
                self._alert_hold[key] = (alert, timer - 1)

        # Return all alerts still within their hold window
        self.alerts_active = [a for a, _ in self._alert_hold.values()]
        return self.alerts_active