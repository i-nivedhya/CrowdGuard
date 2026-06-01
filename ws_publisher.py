# ws_publisher.py — CrowdGuard v3.0 (non-blocking HTTP)
import requests, threading
from datetime import datetime

class WSPublisher:
    def __init__(self, venue_id="college_main"):
        self.venue_id   = venue_id
        self.server_url = f"http://localhost:8000/api/v1/ingest/{venue_id}"

    def start(self):
        print(f"[Publisher] HTTP mode → {self.server_url}")

    def publish(self, total_count, css, tile_counts, tile_risks, alerts):
        """Send in background thread — never blocks main loop."""
        payload = {
            "total_count": total_count,
            "css"        : round(float(css), 2),
            "tile_counts": tile_counts,
            "tile_risks" : tile_risks,
            "alerts"     : alerts,
            "timestamp"  : datetime.utcnow().isoformat() + "Z",
        }
        # Fire and forget — runs in separate thread
        threading.Thread(
            target=self._post,
            args=(payload,),
            daemon=True
        ).start()

    def _post(self, payload):
        try:
            # timeout=0.3 — fail fast, never block main loop
            requests.post(self.server_url, json=payload, timeout=0.3)
        except Exception:
            pass  # server not running — silent fail, no print spam