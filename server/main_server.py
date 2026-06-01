# server/main_server.py — CrowdGuard v3.0 FastAPI Server (clean + complete)
# Keeps existing UI behavior unchanged.
# Supports:
# - JSON ingest for dashboard cards/predictions
# - frame ingest and stream
# - recording API + frame hook for recording
# - existing analytics + partner APIs
# - screenshot capture from live frames
# - video playback with full HTML5 controls

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, FileResponse
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
import asyncio, json, os
import aiofiles

from server.database import get_db
from server import crud
from recording_router import router as recording_router, push_frame_to_recorder

app = FastAPI(title="CrowdGuard AI API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or your specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Recording routes
app.include_router(recording_router)

# ── API Keys ──────────────────────────────────────────────────
VALID_API_KEYS = {
    "cg-partner-police-2026":   {"partner": "City Police Control Room", "role": "emergency"},
    "cg-partner-hospital-2026": {"partner": "City Hospital Emergency", "role": "emergency"},
    "cg-partner-admin-2026":    {"partner": "Venue Administration", "role": "admin"},
    "cg-partner-security-2026": {"partner": "Security Agency", "role": "security"},
    "cg-demo-key-2026":         {"partner": "Demo / Testing", "role": "readonly"},
}
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_api_key(api_key: str = Security(API_KEY_HEADER)):
    if api_key and api_key in VALID_API_KEYS:
        return {"key": api_key, **VALID_API_KEYS[api_key]}
    raise HTTPException(status_code=401, detail="Invalid or missing API key.")

# ── In-Memory State ───────────────────────────────────────────
latest_data: dict = {}
dashboard_connections: dict = {}
latest_frames: dict = {}
frame_dimensions: dict = {}

# ── WebSocket routes ──────────────────────────────────────────
@app.websocket("/ws/{venue_id}")
async def websocket_simple(websocket: WebSocket, venue_id: str):
    await websocket.accept()
    dashboard_connections.setdefault(venue_id, []).append(websocket)
    try:
        if venue_id in latest_data:
            await websocket.send_text(json.dumps(latest_data[venue_id]))
        while True:
            await asyncio.sleep(0.5)
            try:
                if venue_id in latest_data:
                    await websocket.send_text(json.dumps(latest_data[venue_id]))
            except Exception:
                break  # client disconnected, stop sending
    except WebSocketDisconnect:
        if websocket in dashboard_connections.get(venue_id, []):
            dashboard_connections[venue_id].remove(websocket)

@app.websocket("/ws/dashboard/{venue_id}")
async def websocket_dashboard(websocket: WebSocket, venue_id: str):
    await websocket.accept()
    dashboard_connections.setdefault(venue_id, []).append(websocket)
    try:
        if venue_id in latest_data:
            await websocket.send_text(json.dumps(latest_data[venue_id]))
        while True:
            await asyncio.sleep(0.5)
            if venue_id in latest_data:
                await websocket.send_text(json.dumps(latest_data[venue_id]))
    except WebSocketDisconnect:
        if websocket in dashboard_connections.get(venue_id, []):
            dashboard_connections[venue_id].remove(websocket)

# ── JSON ingest from ws_publisher.py ─────────────────────────
@app.post("/api/v1/ingest/{venue_id}")
async def ingest(venue_id: str, payload: dict, db: Session = Depends(get_db)):
    latest_data[venue_id] = payload
    try:
        crud.save_snapshot(
            db, venue_id,
            total_count=payload.get("total_count", 0),
            css=payload.get("css", 0.0),
            tile_counts=payload.get("tile_counts", {}),
            tile_risks=payload.get("tile_risks", {})
        )
        for alert in payload.get("alerts", []):
            crud.save_alert(
                db, venue_id,
                alert_type=alert.get("type", "UNKNOWN"),
                severity=alert.get("severity", ""),
                tile=str(alert.get("tile", "")),
                css=payload.get("css", 0.0)
            )
    except Exception as e:
        print(f"[Server] DB write error: {e}")

    # Push live to dashboard clients
    if venue_id in dashboard_connections:
        dead = []
        for ws in dashboard_connections[venue_id]:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            dashboard_connections[venue_id].remove(ws)

    return {"status": "ok"}

# ── Frame ingest ──────────────────────────────────────────────
@app.post("/api/v1/frame/{venue_id}")
async def ingest_frame(venue_id: str, request: Request):
    """
    Receives raw JPEG bytes from main.py frame sender.
    Stores in memory and feeds to recording router if recording is active.
    """
    body = await request.body()
    if body:
        latest_frames[venue_id] = body

        # Recording hook (single source of recording capture)
        # This ensures recordings contain the actual annotated frames
        await push_frame_to_recorder(venue_id, body)

        w = request.headers.get("X-Frame-Width")
        h = request.headers.get("X-Frame-Height")
        if w and h:
            frame_dimensions[venue_id] = {"w": int(w), "h": int(h)}
    return {"status": "ok"}

@app.get("/frame_info/{venue_id}")
async def get_frame_info(venue_id: str):
    """Returns exact width/height of the video frame for React sizing."""
    return frame_dimensions.get(venue_id, {"w": 640, "h": 480})

@app.get("/frame/{venue_id}")
async def get_frame(venue_id: str):
    """
    Returns latest JPEG frame for screenshot capture and live display.
    Works both from in-memory (via POST) and from file (saved by main.py).
    """
    if venue_id in latest_frames and latest_frames[venue_id]:
        return Response(
            content=latest_frames[venue_id],
            media_type="image/jpeg",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
            }
        )

    file_path = f"latest_frame/{venue_id}.jpg"
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            return Response(
                content=f.read(),
                media_type="image/jpeg",
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Access-Control-Allow-Origin": "*",
                }
            )
    return Response(status_code=404)

@app.get("/video_feed/{venue_id}")
async def video_feed(venue_id: str):
    """
    MJPEG stream at ~30fps for live dashboard display.
    Use in React as: <img src="http://localhost:8000/video_feed/college_main"/>
    """
    async def generate():
        while True:
            frame_bytes = latest_frames.get(venue_id)
            if not frame_bytes:
                file_path = f"latest_frame/{venue_id}.jpg"
                if os.path.exists(file_path):
                    async with aiofiles.open(file_path, "rb") as f:
                        frame_bytes = await f.read()

            if frame_bytes:
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + 
                       frame_bytes + b"\r\n")
                await asyncio.sleep(0.033)  # ~30fps
            else:
                await asyncio.sleep(0.1)

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
        }
    )

# ── Health ────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "active_venues": list(latest_data.keys()),
        "streaming_venues": list(latest_frames.keys()),
        "dashboard_connections": {k: len(v) for k, v in dashboard_connections.items()},
    }

# ── Live venue endpoint ───────────────────────────────────────
@app.get("/api/v1/venues/{venue_id}/live")
def get_live(venue_id: str):
    if venue_id not in latest_data:
        raise HTTPException(status_code=404, detail="Venue not found")
    return {"status": "ok", "data": latest_data[venue_id], "version": "3.0"}

# ── Historical Analytics ──────────────────────────────────────
@app.get("/api/v1/venues/{venue_id}/history/css")
def get_css_history(venue_id: str, minutes: int = 60, db: Session = Depends(get_db)):
    data = crud.get_css_history(db, venue_id, minutes)
    return {
        "status": "ok",
        "venue": venue_id,
        "minutes": minutes,
        "count": len(data),
        "data": data
    }

@app.get("/api/v1/venues/{venue_id}/history/alerts")
def get_alert_history(venue_id: str, limit: int = 50, db: Session = Depends(get_db)):
    data = crud.get_alert_history(db, venue_id, limit)
    return {
        "status": "ok",
        "venue": venue_id,
        "count": len(data),
        "data": data
    }

@app.get("/api/v1/venues/{venue_id}/stats")
def get_venue_stats(venue_id: str, hours: int = 24, db: Session = Depends(get_db)):
    stats = crud.get_venue_stats(db, venue_id, hours)
    if not stats:
        raise HTTPException(status_code=404, detail="No data found")
    return {"status": "ok", "venue": venue_id, "stats": stats}

@app.get("/api/v1/venues/{venue_id}/hotspots")
def get_hotspots(venue_id: str, hours: int = 24, db: Session = Depends(get_db)):
    data = crud.get_hotspot_tiles(db, venue_id, hours)
    return {"status": "ok", "venue": venue_id, "hours": hours, "data": data}

@app.get("/api/v1/venues/{venue_id}/replay")
def get_replay(venue_id: str, limit: int = 100, db: Session = Depends(get_db)):
    data = crud.get_snapshots_for_venue(db, venue_id, limit)
    return {"status": "ok", "venue": venue_id, "count": len(data), "data": data}

# ── Partner API ───────────────────────────────────────────────
@app.get("/partner/v1/venues", tags=["Partner API"])
def partner_list_venues(partner=Depends(get_api_key)):
    return {
        "status": "ok",
        "partner": partner["partner"],
        "venues": [{"venue_id": v, "is_live": True} for v in latest_data],
        "total": len(latest_data),
    }

@app.get("/partner/v1/venues/{venue_id}/status", tags=["Partner API"])
def partner_get_status(venue_id: str, partner=Depends(get_api_key)):
    if venue_id not in latest_data:
        raise HTTPException(status_code=404, detail="Venue not found.")

    data = latest_data[venue_id]
    css = float(data.get("css", 0))
    risks = data.get("tile_risks", {})
    red_zones = [
        t for t, r in risks.items()
        if (r[0] if isinstance(r, list) else r) == "red"
    ]

    level = (
        "CRITICAL" if css > 85 else
        "SEVERE" if css > 75 else
        "HIGH" if css > 60 else
        "ELEVATED" if css > 40 else
        "NORMAL"
    )

    return {
        "status": "ok",
        "partner": partner["partner"],
        "venue_id": venue_id,
        "crowd_data": {
            "css": round(css, 1),
            "risk_level": level,
            "total_count": data.get("total_count", 0),
            "red_zones": red_zones,
            "is_emergency": level in ("CRITICAL", "SEVERE"),
        },
    }

@app.get("/partner/v1/info", tags=["Partner API"])
def partner_info():
    return {
        "name": "CrowdGuard AI Partner API",
        "version": "3.0",
        "auth": "X-API-Key header",
        "demo_key": "cg-demo-key-2026",
        "swagger_docs": "http://localhost:8000/docs",
    }

# ── Settings API ──────────────────────────────────────────────
# Reads and writes config.py on disk so the Python backend
# actually sees the changes made in the React Settings page.

import re as _re

# config.py is in the CrowdGuard root, one level above server/main_server.py
_THIS_DIR   = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR   = os.path.dirname(_THIS_DIR)
CONFIG_PATH = os.path.join(_ROOT_DIR, 'config.py')
# Fallback: if run directly from the root folder
if not os.path.exists(CONFIG_PATH):
    CONFIG_PATH = os.path.join(_THIS_DIR, 'config.py')

def _read_config_value(key: str, default=None):
    """Read a single value from config.py by key name."""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            text = f.read()
        pattern = rf"^{key}\s*=\s*(.+)$"
        m = _re.search(pattern, text, _re.MULTILINE)
        if m:
            raw = m.group(1).strip().strip('"').strip("'")
            return raw
    except Exception:
        pass
    return default

def _write_config_value(text: str, key: str, new_value: str) -> str:
    """Replace a single assignment line in config.py text."""
    pattern = rf"^({key}\s*=\s*)(.+)$"
    replacement = rf"\g<1>{new_value}"
    return _re.sub(pattern, replacement, text, flags=_re.MULTILINE)

@app.get("/api/v1/settings")
def get_settings():
    """Return current config.py values to the React Settings page."""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            text = f.read()

        def read(key, default=""):
            m = _re.search(rf"^{key}\s*=\s*(.+)$", text, _re.MULTILINE)
            if m:
                return m.group(1).strip().strip('"').strip("'")
            return default

        # Parse CAMERA_SOURCES list — grab first entry
        cam_m = _re.search(r"CAMERA_SOURCES\s*=\s*\[(.+?)\]", text)
        camera_source = "0"
        if cam_m:
            inner = cam_m.group(1).strip().strip('"').strip("'")
            camera_source = inner

        return {
            "cameraSource":      camera_source,
            "countScale":        float(read("COUNT_SCALE", "1.0")),
            "telegramEnabled": read("TELEGRAM_ENABLED", "True") == "True",
            "redThreshold":      int(read("ALERT_THRESHOLD_CRITICAL", "85")),
            "highThreshold":     int(read("ALERT_THRESHOLD_HIGH", "30")),
            "defaultVenue":      read("DEFAULT_VENUE", "college"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/settings")
def save_settings(payload: dict):
    print(f"[Settings] Received payload: {payload}")
    """
    Write changed values back into config.py on disk.
    After this the user must restart main.py (as the hint says).
    """
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            text = f.read()

        # --- Camera source ---
        if "cameraSource" in payload:
            src = payload["cameraSource"].strip()
            # Try to interpret as integer (webcam index)
            try:
                src_val = f"[{int(src)}]"
            except ValueError:
                src_val = f"['{src}']"
            text = _write_config_value(text, "CAMERA_SOURCES", src_val)

        # --- Count scale ---
        if "countScale" in payload:
            text = _write_config_value(
                text, "COUNT_SCALE", str(round(float(payload["countScale"]), 1))
            )

        # --- CSS alert thresholds ---
        if "redThreshold" in payload:
            text = _write_config_value(
                text, "ALERT_THRESHOLD_CRITICAL", str(int(payload["redThreshold"]))
            )
        if "highThreshold" in payload:
            text = _write_config_value(
                text, "ALERT_THRESHOLD_HIGH", str(int(payload["highThreshold"]))
            )

        # --- Telegram toggle ---
        # We disable by blanking the token; enable restores a placeholder
        if "telegramEnabled" in payload:
            enabled = bool(payload["telegramEnabled"])
            text = _write_config_value(
                text, "TELEGRAM_ENABLED", "True" if enabled else "False"
            )

        # --- Default venue --- always stored lowercase to match VENUE_THRESHOLDS keys
        if "defaultVenue" in payload:
            venue_val = payload["defaultVenue"].strip().lower()
            text = _write_config_value(
                text, "DEFAULT_VENUE", f"'{venue_val}'"
            )

        text = _write_config_value(
                text, "VENUE_TYPE", f"'{venue_val}'"
            )

        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            f.write(text)

        return {"status": "ok", "message": "config.py updated. Restart main.py to apply."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))