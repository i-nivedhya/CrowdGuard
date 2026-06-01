# src/multi_camera.py — CrowdGuard AI v2.0
# Threaded multi-camera capture manager
 
import cv2
import threading
import config
import time
 
class MultiCameraManager:
    """
    Opens multiple camera sources and reads frames in background threads.
    Main loop calls get_frames() to receive the latest frame from each camera.
 
    Why threads? cv2.VideoCapture.read() blocks until a frame arrives.
    If we called it N times in sequence, camera 2 would always lag behind
    camera 1 by one full frame capture time. Threads allow all cameras to
    read in parallel.
    """
 
    def __init__(self, sources=None, labels=None):
        """
        sources: list of camera sources.
                 Use integer (0, 1) for webcam index.
                 Use string for file path or RTSP stream URL.
        labels:  list of display names, one per source.
        """
        if sources is None:
            sources = config.CAMERA_SOURCES
        if labels is None:
            labels = config.CAMERA_LABELS
 
        self.sources  = sources
        self.labels   = labels if labels else [f'Camera {i+1}' for i in range(len(sources))]
        self.n        = len(sources)
 
        # Open a VideoCapture for each source
        self.captures = [cv2.VideoCapture(s) for s in sources]
 
        # Store the latest frame for each camera
        self.frames   = [None] * self.n
 
        # One lock per camera to avoid race conditions
        self.locks    = [threading.Lock() for _ in range(self.n)]
 
        self._running = False
        self.threads  = []
 
    def start(self):
        """Start one background thread per camera."""
        self._running = True
        for i in range(self.n):
            if not self.captures[i].isOpened():
                print(f'[MultiCam] WARNING: Camera {i} ({self.sources[i]}) failed to open')
                continue
            t = threading.Thread(
                target=self._capture_loop,
                args=(i,),
                daemon=True  # daemon = thread stops when main program stops
            )
            t.start()
            self.threads.append(t)
        print(f'[MultiCam] Started {len(self.threads)} camera thread(s)')
 
    def _capture_loop(self, idx):
        """Background thread: reads frames at the video's natural FPS."""
        cap = self.captures[idx]

        # Get the video's actual FPS — default to 30 if unknown
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0 or fps > 120:
            fps = 30
        frame_delay = 1.0 / fps  # seconds to wait between frames

        while self._running:
            loop_start = time.time()

            ret, frame = cap.read()

            if ret:
                with self.locks[idx]:
                    self.frames[idx] = frame
            else:
                # Video ended — rewind to start
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                # Reset flow smoothing so stale values don't cause
                # a big arrow jump when the video loops back to frame 0
                from src.motion_flow import reset_flow_history
                reset_flow_history()
                continue

            # Throttle to match real video speed
            elapsed = time.time() - loop_start
            sleep_time = frame_delay - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)
 
    def get_frames(self):
        """
        Returns a list of (frame_or_None, label) for each camera.
        Thread-safe: uses locks to read the latest stored frame.
        """
        result = []
        for i in range(self.n):
            with self.locks[i]:
                frame = self.frames[i].copy() if self.frames[i] is not None else None
            result.append((frame, self.labels[i]))
        return result
 
    def any_ready(self):
        """Returns True if at least one camera has a frame ready."""
        return any(f is not None for f in self.frames)
 
    def release(self):
        """Stop threads and release all captures."""
        self._running = False
        for cap in self.captures:
            cap.release()
        print('[MultiCam] All cameras released.')
 
 
def aggregate_css(css_per_camera):
    """
    Compute a master CSS from a list of per-camera CSS values.
    Uses simple average. If camera coverage areas differ,
    you can pass weights instead.
 
    Args:
        css_per_camera: list of floats, one per active camera
 
    Returns: master CSS (float 0-100)
    """
    if not css_per_camera:
        return 0.0
    return round(sum(css_per_camera) / len(css_per_camera), 1)
 
 
def tile_frames_horizontally(frames_with_labels, target_height=480):
    """
    Resize all frames to the same height and stack them side by side.
    Returns a black placeholder if no frames are ready yet.
    """
    import numpy as np

    resized = []

    for frame, label in frames_with_labels:
        if frame is None:
            # Camera not ready — use black placeholder
            placeholder = np.zeros((target_height, 640, 3), dtype=np.uint8)
            cv2.putText(placeholder, f'Waiting for signal...',
                        (40, target_height // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (80, 80, 80), 2)
            resized.append(placeholder)
            continue

        h, w = frame.shape[:2]
        new_w = int(w * target_height / h)
        resized_frame = cv2.resize(frame, (new_w, target_height))
        resized.append(resized_frame)

    # Safety check — if still empty, return a black frame
    if not resized:
        return np.zeros((target_height, 640, 3), dtype=np.uint8)

    return np.hstack(resized)