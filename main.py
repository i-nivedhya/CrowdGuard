# main.py — CrowdGuard AI v2.0 + v3.0 (clean + stable)
# IMPORTANT:
# - No FastAPI app code here
# - No direct recorder push here
# - main.py only posts JPEG frames to /api/v1/frame/{venue_id}
# - JSON analytics are sent by WSPublisher -> /api/v1/ingest/{venue_id}

import cv2, time, config, os, threading
import numpy as np
from ws_publisher import WSPublisher
from notifications.telegram_notifier import TelegramNotifier
from src import density_model, grid_engine
from src import risk_classifier, zone_pressure, surge_detector, dashboard
from src import prediction_engine, motion_flow, stress_score, recommendation_engine
from src.multi_camera import MultiCameraManager, aggregate_css, tile_frames_horizontally

import importlib
import threading

global _prev_camera_sources
_config_mtime = os.path.getmtime('config.py')

def _config_watcher():
    global _config_mtime, _prev_camera_sources, _pending_venue   # ← _prev_camera_sources added here
    while True:
        try:
            mtime = os.path.getmtime('config.py')
            if mtime != _config_mtime:
                _config_mtime = mtime
                importlib.reload(config)
                print('[Config] config.py reloaded — new settings active')

                for state in _active_states:
                    state.notifier = TelegramNotifier(
                        bot_token=config.TELEGRAM_BOT_TOKEN,
                        chat_ids=config.TELEGRAM_CHAT_IDS
                    )
                    state.startup_sent = False
                    print('[Config] Telegram notifier refreshed')

                if _prev_camera_sources is not None:
                    if config.CAMERA_SOURCES != _prev_camera_sources:
                        print(f'[Config] Camera sources changed: {config.CAMERA_SOURCES}')
                        _camera_restart_flag.set()

                _prev_camera_sources = list(config.CAMERA_SOURCES)

                _pending_venue = config.DEFAULT_VENUE.strip().lower()
                print(f'[Config] Venue updated to: {_pending_venue}')

        except Exception as e:
            print(f'[Config] Reload error: {e}')
        time.sleep(1)

# ── Shared in-memory frame buffer (no file I/O in critical path) ──
_frame_lock   = threading.Lock()
_frame_buffer = None
_frame_shape  = (480, 640)
_camera_restart_flag = threading.Event()
_prev_camera_sources = None
_pending_venue       = None
_active_states = []   # ← ADD THIS
def _frame_sender_thread():
    """
    Sends latest annotated frame to FastAPI at ~30fps.
    Recording capture is handled in server/main_server.py
    via push_frame_to_recorder() in /api/v1/frame endpoint.
    """
    import requests

    session = requests.Session()

    while True:
        try:
            with _frame_lock:
                data  = _frame_buffer
                shape = _frame_shape

            if data:
                session.post(
                    "http://localhost:8000/api/v1/frame/college_main",
                    data=data,
                    headers={
                        "Content-Type": "application/octet-stream",
                        "X-Frame-Width": str(shape[1]),
                        "X-Frame-Height": str(shape[0]),
                    },
                    timeout=0.3
                )
        except Exception:
            pass

        time.sleep(0.033)


class SourceState:
    def __init__(self, label):
        self.label = label
        self.detector = surge_detector.SurgeDetector()
        self.publisher = WSPublisher(venue_id="college_main")
        self.publisher.start()
        self.notifier = TelegramNotifier(
            bot_token=config.TELEGRAM_BOT_TOKEN,
            chat_ids=config.TELEGRAM_CHAT_IDS
        )
        self.predictor = prediction_engine.PredictionEngine()
        self.css_engine = stress_score.StressScoreEngine()

        self.prev_gray = None
        self.count_history = None
        self.frame_count = 0
        self.startup_sent = False

        self.last_density = None
        self.last_counts = None
        self.last_risks = None
        self.last_alerts = []
        self.last_tile_flows = {}
        self.last_collision_zones = []
        self.last_chaotic_tiles = []
        self.last_predictions = {}
        self.last_css = (0.0, "NORMAL", (0, 180, 0))
        self.last_recs = []
        self.last_total = 0


def process_source(frame, state, venue):
    state.frame_count += 1
    h, w = frame.shape[:2]

    if state.frame_count % config.PROCESS_EVERY_N_FRAMES == 0:
        density_map, _ = density_model.predict(frame)
        tile_regions = grid_engine.get_tile_regions(h, w)
        tile_counts = grid_engine.compute_tile_counts(density_map, tile_regions)

        # Temporal smoothing (median)
        WINDOW = 5
        if state.count_history is None:
            state.count_history = {tile: [] for tile in tile_counts}

        for tile in tile_counts:
            state.count_history.setdefault(tile, [])
            state.count_history[tile].append(tile_counts[tile])
            if len(state.count_history[tile]) > WINDOW:
                state.count_history[tile].pop(0)

        stable_counts = {
            tile: float(np.median(state.count_history[tile]))
            for tile in tile_counts
        }

        tile_risks = risk_classifier.classify_tiles(stable_counts, venue)
        zone_press = zone_pressure.compute_zone_pressure(tile_counts)
        alerts = state.detector.update(tile_counts, tile_risks, zone_press, venue)
        predictions = state.predictor.update(tile_counts, venue)

        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        tile_flows, collision_zones, chaotic_tiles = {}, [], []
        if state.prev_gray is not None:
            tile_flows = motion_flow.compute_tile_flow(state.prev_gray, curr_gray, tile_regions)
            collision_zones = motion_flow.detect_opposing_flows(tile_flows, config.GRID_ROWS, config.GRID_COLS)
            chaotic_tiles = motion_flow.get_chaotic_tiles(tile_flows)
        state.prev_gray = curr_gray

        css_val, css_level, css_color = state.css_engine.compute(
            tile_counts, tile_risks, alerts, zone_press, tile_flows, venue
        )
        recs = recommendation_engine.get_recommendations_for_alerts(alerts, venue)

        state.last_density = density_map
        state.last_counts = tile_counts
        state.last_risks = tile_risks
        state.last_alerts = alerts
        state.last_tile_flows = tile_flows
        state.last_collision_zones = collision_zones
        state.last_chaotic_tiles = chaotic_tiles
        state.last_predictions = predictions
        state.last_css = (css_val, css_level, css_color)
        state.last_recs = recs
        state.last_total = int(density_map.sum())

        # Publish JSON payload for dashboard cards/predictions/history
        try:
            tile_risks_str = {}
            tile_counts_str = {}

            for k, v in state.last_risks.items():
                key = f"({k[0]},{k[1]})" if isinstance(k, tuple) else str(k).replace(" ", "")
                tile_risks_str[key] = v

            for k, v in state.last_counts.items():
                key = f"({k[0]},{k[1]})" if isinstance(k, tuple) else str(k).replace(" ", "")
                tile_counts_str[key] = int(v)

            alerts_data = []
            for a in state.last_alerts:
                alerts_data.append(a.__dict__ if hasattr(a, "__dict__") else a)

            state.publisher.publish(
                total_count=state.last_total,
                css=css_val,
                tile_counts=tile_counts_str,
                tile_risks=tile_risks_str,
                alerts=alerts_data
            )
        except Exception as e:
            print(f"[Publisher] Warning: {e}")

        

        # Telegram alerts
        # ── Telegram alerts — fires per tile, cooldown is per tile ──
        try:
            telegram_enabled = getattr(config, 'TELEGRAM_ENABLED', True)
            if telegram_enabled:

                if not state.startup_sent:
                    state.notifier.send_startup(venue)
                    state.startup_sent = True

                # Find every tile that is currently RED
                red_tiles = [
                    k for k, v in state.last_risks.items()
                    if (v[0] if isinstance(v, (list, tuple)) else v) == "red"
                ]

                for tile in red_tiles:
                    tile_str = f"({tile[0]},{tile[1]})" if isinstance(tile, tuple) else str(tile)
                    count    = int(state.last_counts.get(tile, 0))

                    # Determine severity from CSS
                    if css_val >= config.ALERT_THRESHOLD_CRITICAL:
                        severity = "EMERGENCY"
                    elif css_val >= config.ALERT_THRESHOLD_SEVERE:
                        severity = "CRITICAL"
                    else:
                        severity = "HIGH"

                    # notify_red_tile handles per-tile cooldown internally
                    state.notifier.notify_red_tile(
                        tile_str  = tile_str,
                        count     = count,
                        css       = css_val,
                        venue_name= venue,
                        severity  = severity,
                    )

        except Exception as e:
            print(f"[Telegram] Warning: {e}")

    if state.last_density is None:
        return frame

    css_val, css_level, css_color = state.last_css
    tile_regions = grid_engine.get_tile_regions(h, w)

    annotated = dashboard.draw_dashboard(
        frame.copy(),
        state.last_density,
        state.last_counts,
        tile_regions,
        state.last_risks,
        state.last_alerts,
        venue,
        state.last_total,
        fps=0,
        tile_flows=state.last_tile_flows,
        collision_zones=state.last_collision_zones,
        chaotic_tiles=state.last_chaotic_tiles,
        predictions=state.last_predictions,
        css_value=css_val,
        css_level=css_level,
        css_color=css_color,
        css_trend=state.css_engine.get_trend_arrow(),
        sparkline_img=state.css_engine.get_sparkline_data(),
        recommendations=state.last_recs
    )
    return annotated


def main():
    global _prev_camera_sources, _pending_venue
    print("=" * 60)
    print("  CrowdGuard AI v2.0 + v3.0  —  Multi-Source Mode")
    print("=" * 60)
    print("[Main] Recording      : Controlled by FastAPI server")
    print("[Main] Cloud dashboard: http://localhost:5173")
    print("[Main] API docs       : http://localhost:8000/docs")

    density_model.load_model()

    threading.Thread(target=_config_watcher, daemon=True).start()
    _prev_camera_sources = list(config.CAMERA_SOURCES)

    cam_mgr = MultiCameraManager(
        sources=config.CAMERA_SOURCES,
        labels=config.CAMERA_LABELS
    )
    cam_mgr.start()

    states = [SourceState(label) for label in config.CAMERA_LABELS]
    _active_states.clear()
    _active_states.extend(states)
    venue_list = risk_classifier.get_venue_list()

    # ── FIX: normalise to lowercase so Settings page values like
    #         'College' never cause a ValueError crash ──────────────
    _default = config.DEFAULT_VENUE.strip().lower()
    if _default not in venue_list:
        print(f"[Main] WARNING: DEFAULT_VENUE '{config.DEFAULT_VENUE}' not in "
              f"{venue_list}. Falling back to '{venue_list[0]}'.")
        _default = venue_list[0]
    venue_index   = venue_list.index(_default)
    current_venue = venue_list[venue_index]

    prev_time = time.time()

    os.makedirs("latest_frame", exist_ok=True)

    sender = threading.Thread(target=_frame_sender_thread, daemon=True)
    sender.start()

    cv2.namedWindow("CrowdGuard AI v2.0 - Multi-Source", cv2.WINDOW_NORMAL)

    while True:
        if _camera_restart_flag.is_set():
            _camera_restart_flag.clear()
            print('[Main] Restarting camera manager with new sources...')
            cam_mgr.release()
            cam_mgr = MultiCameraManager(
                sources=config.CAMERA_SOURCES,
                labels=config.CAMERA_LABELS
            )
            cam_mgr.start()
            states = [SourceState(label) for label in config.CAMERA_LABELS]
            _active_states.clear()
            _active_states.extend(states)
            print(f'[Main] Camera restarted: {config.CAMERA_SOURCES}')

        if _pending_venue is not None and _pending_venue != current_venue:
            if _pending_venue in venue_list:
                current_venue = _pending_venue
                print(f'[Main] Venue switched to: {current_venue}')
            _pending_venue = None

        frames_and_labels = cam_mgr.get_frames()
        if not any(f is not None for f, _ in frames_and_labels):
            time.sleep(0.05)
            continue

        annotated_frames = []
        css_values = []

        for i, (frame, label) in enumerate(frames_and_labels):
            if frame is None:
                placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(placeholder, f"{label}: No Signal", (30, 240),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (80, 80, 80), 2)
                annotated_frames.append((placeholder, label))
                continue

            if frame.shape[0] > 60:
                frame = frame[:-30, :]

            annotated = process_source(frame, states[i], current_venue)
            annotated_frames.append((annotated, label))

            css_val, _, _ = states[i].last_css
            css_values.append(css_val)

        master_css = aggregate_css(css_values)
        combined = tile_frames_horizontally(annotated_frames, target_height=480)

        curr_time = time.time()
        fps = 1.0 / max(curr_time - prev_time, 0.001)
        prev_time = curr_time

        h, w = combined.shape[:2]
        bar = (
            f"MASTER CSS: {master_css:.0f}  |  "
            f"Venue: {current_venue.upper()}  |  "
            f"FPS: {fps:.1f}  |  "
            f"Telegram: ACTIVE  |  "
            f"[Q]quit [V]venue [F]flow"
        )
        cv2.rectangle(combined, (0, h - 26), (w, h), (20, 20, 20), -1)
        cv2.putText(combined, bar, (10, h - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)

        screen_w = 1100
        if combined.shape[1] > screen_w:
            scale = screen_w / combined.shape[1]
            combined = cv2.resize(
                combined,
                (int(combined.shape[1] * scale), int(combined.shape[0] * scale))
            )

        cv2.imshow("CrowdGuard AI v2.0 - Multi-Source", combined)

        global _frame_buffer, _frame_shape
        fh, fw = combined.shape[:2]
        _, jpeg_buf = cv2.imencode(".jpg", combined, [cv2.IMWRITE_JPEG_QUALITY, 85])
        with _frame_lock:
            _frame_buffer = jpeg_buf.tobytes()
            _frame_shape = (fh, fw)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), ord("Q")):
            break
        elif key in (ord("v"), ord("V")):
            venue_index = (venue_index + 1) % len(venue_list)
            current_venue = venue_list[venue_index]
            print(f"[Main] Venue -> {current_venue}")
        elif key in (ord("f"), ord("F")):
            config.SHOW_FLOW_ARROWS = not config.SHOW_FLOW_ARROWS

    cam_mgr.release()
    cv2.destroyAllWindows()
    print("[Main] CrowdGuard AI shut down cleanly.")


if __name__ == "__main__":
    main()