# recording_router.py — CrowdGuard v3.0
# Writes H264 directly via ffmpeg pipe. Auto-converts old mp4v on Play.

import os, time, uuid, json, shutil, subprocess
import numpy as np
import cv2
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

router = APIRouter(prefix="/api/v1/recordings", tags=["recordings"])

RECORDINGS_DIR = Path("recordings")
RECORDINGS_DIR.mkdir(exist_ok=True)

_active: dict[str, dict] = {}

FFMPEG = shutil.which("ffmpeg") or r"C:\ffmpeg\bin\ffmpeg.exe"


# ── frame capture ─────────────────────────────────────────────────────────────

async def push_frame_to_recorder(venue_id: str, jpeg_bytes: bytes):
    if venue_id not in _active:
        return
    arr = np.frombuffer(jpeg_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is not None:
        _active[venue_id]["frames"].append(frame)
        _active[venue_id]["timestamps"].append(time.time())


# ── encoding helpers ──────────────────────────────────────────────────────────

def _has_ffmpeg() -> bool:
    return bool(FFMPEG and os.path.isfile(FFMPEG))


def _write_h264_via_pipe(frames: list, fps: float, final_path: Path) -> bool:
    """Pipe raw BGR frames into ffmpeg → H264 mp4. Most reliable method."""
    if not frames or not _has_ffmpeg():
        return False
    h, w = frames[0].shape[:2]
    # Make height/width even (H264 requires this)
    w = w if w % 2 == 0 else w - 1
    h = h if h % 2 == 0 else h - 1
    cmd = [
        FFMPEG, "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{w}x{h}", "-pix_fmt", "bgr24",
        "-r", str(fps), "-i", "pipe:0",
        "-c:v", "libx264", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-an", str(final_path),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for f in frames:
            f = cv2.resize(f, (w, h)) if (f.shape[1] != w or f.shape[0] != h) else f
            proc.stdin.write(f.tobytes())
        proc.stdin.close()
        proc.wait(timeout=180)
        return proc.returncode == 0 and final_path.exists() and final_path.stat().st_size > 1000
    except Exception as e:
        print(f"[Recorder] ffmpeg pipe error: {e}")
        try: proc.kill()
        except: pass
        return False


def _write_opencv_fallback(frames: list, fps: float, final_path: Path) -> bool:
    """Fallback: write mp4v with OpenCV if ffmpeg fails."""
    if not frames:
        return False
    h, w = frames[0].shape[:2]
    writer = cv2.VideoWriter(str(final_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    if not writer.isOpened():
        return False
    for f in frames:
        writer.write(cv2.resize(f, (w, h)) if (f.shape[1] != w or f.shape[0] != h) else f)
    writer.release()
    return final_path.exists() and final_path.stat().st_size > 100


def _convert_to_h264(src: Path, dst: Path) -> bool:
    """Re-encode any existing video file to H264."""
    if not _has_ffmpeg() or not src.exists():
        return False
    try:
        result = subprocess.run([
            FFMPEG, "-y", "-i", str(src),
            "-c:v", "libx264", "-preset", "veryfast",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-an", str(dst),
        ], timeout=300, capture_output=True)
        ok = result.returncode == 0 and dst.exists() and dst.stat().st_size > 1000
        if not ok:
            print(f"[Recorder] convert failed: {result.stderr.decode()[:300]}")
        return ok
    except Exception as e:
        print(f"[Recorder] convert error: {e}")
        return False


def _ensure_h264(meta: dict) -> dict:
    """Auto-convert mp4v → H264 on first access. Silent, transparent."""
    if meta.get("codec") == "h264":
        return meta
    old_path = RECORDINGS_DIR / meta["filename"]
    if not old_path.exists():
        return meta
    new_name = old_path.stem + "_h264.mp4"
    new_path = RECORDINGS_DIR / new_name
    if not new_path.exists():
        print(f"[Recorder] Auto-converting {old_path.name} → H264...")
        ok = _convert_to_h264(old_path, new_path)
        if not ok:
            print("[Recorder] Conversion failed — serving original mp4v")
            return meta
    # Swap metadata to point to H264 file
    old_path.unlink(missing_ok=True)
    meta["filename"]    = new_name
    meta["codec"]       = "h264"
    meta["ffmpeg_used"] = True
    meta["size_mb"]     = round(new_path.stat().st_size / 1e6, 2)
    _save_meta(meta["id"], meta)
    print(f"[Recorder] Conversion done → {new_name}")
    return meta


# ── byte-range streaming ──────────────────────────────────────────────────────

def _stream_response(filepath: Path, request: Request):
    """
    Proper HTTP byte-range streaming — required for browser <video> to work.
    Without this, seek/play/pause all break and the screen stays black.
    """
    file_size = filepath.stat().st_size
    range_hdr = request.headers.get("range")

    def _iter(path, start, length, buf=65536):
        with open(path, "rb") as f:
            f.seek(start)
            rem = length
            while rem > 0:
                chunk = f.read(min(buf, rem))
                if not chunk:
                    break
                rem -= len(chunk)
                yield chunk

    if range_hdr:
        parts  = range_hdr.replace("bytes=", "").split("-")
        start  = int(parts[0]) if parts[0] else 0
        end    = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
        end    = min(end, file_size - 1)
        length = end - start + 1
        return StreamingResponse(
            _iter(filepath, start, length),
            status_code=206,
            media_type="video/mp4",
            headers={
                "Content-Range":  f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges":  "bytes",
                "Content-Length": str(length),
                "Access-Control-Allow-Origin": "*",
                "Cache-Control":  "no-cache",
            },
        )

    return StreamingResponse(
        _iter(filepath, 0, file_size),
        status_code=200,
        media_type="video/mp4",
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges":  "bytes",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control":  "no-cache",
        },
    )


# ── API routes ────────────────────────────────────────────────────────────────

@router.post("/start/{venue_id}")
async def start_recording(venue_id: str):
    if venue_id in _active:
        raise HTTPException(400, f"Recording already active for {venue_id}")
    rec_id = str(uuid.uuid4())[:8]
    _active[venue_id] = {
        "id": rec_id, "venue_id": venue_id,
        "start_time": time.time(), "end_time": None, "frames": [],"timestamps": [],
    }
    print(f"[Recorder] Started: {rec_id}")
    return {"status": "started", "id": rec_id, "venue_id": venue_id}


@router.post("/stop/{venue_id}")
async def stop_recording(venue_id: str):
    if venue_id not in _active:
        raise HTTPException(404, f"No active recording for {venue_id}")

    rec      = _active.pop(venue_id)
    rec["end_time"] = time.time()
    duration = rec["end_time"] - rec["start_time"]
    frames   = rec["frames"]
    timestamps = rec.get("timestamps", [])

    print(f"[Recorder] Stopping: {len(frames)} frames, {duration:.1f}s")

    if len(timestamps) >= 2:
        actual_duration = timestamps[-1] - timestamps[0]
        fps = len(frames) / max(actual_duration, 0.1)
        fps = max(8.0, min(30.0, fps))
    else:
        fps = max(8.0, min(30.0, len(frames) / max(duration, 0.001)))

    # ── ADD THESE TWO LINES HERE ──────────────────────────────
    ts = time.strftime("%Y%m%d_%H%M%S", time.localtime(rec["start_time"]))
    filename = f"{venue_id}_{ts}_{rec['id']}.mp4"
    final_path = RECORDINGS_DIR / filename
    # ─────────────────────────────────────────────────────────

    if len(frames) < 2:
        raise HTTPException(400, "Too few frames captured — was main.py running?")

    # Try H264 via ffmpeg first, fall back to mp4v
    if _write_h264_via_pipe(frames, fps, final_path):
        codec = "h264"
        print(f"[Recorder] Saved H264: {filename}")
    else:
        print("[Recorder] ffmpeg pipe failed, falling back to mp4v")
        _write_opencv_fallback(frames, fps, final_path)
        codec = "mp4v"

    if not final_path.exists():
        raise HTTPException(500, "Recording file was not created")

    meta = {
        "id": rec["id"], "venue_id": venue_id,
        "start_time": rec["start_time"], "end_time": rec["end_time"],
        "duration_secs": round(duration, 1), "frame_count": len(frames),
        "filename": filename, "status": "saved",
        "size_mb": round(final_path.stat().st_size / 1e6, 2),
        "codec": codec, "fps": round(fps, 2),
        "ffmpeg_used": _has_ffmpeg(),
    }
    _save_meta(rec["id"], meta)
    return meta


@router.get("/stream/{rec_id}")
async def stream_recording(rec_id: str, request: Request):
    meta = _load_meta(rec_id)
    if not meta:
        raise HTTPException(404, "Recording not found")
    # Auto-convert mp4v → H264 transparently (for old recordings)
    meta     = _ensure_h264(meta)
    filepath = RECORDINGS_DIR / meta["filename"]
    if not filepath.exists():
        raise HTTPException(404, "File missing from disk")
    return _stream_response(filepath, request)


@router.get("/list")
async def list_recordings():
    meta_dir = RECORDINGS_DIR / "meta"
    if not meta_dir.exists():
        return []
    out = []
    for f in sorted(meta_dir.glob("*.json"), reverse=True):
        with open(f, encoding="utf-8") as fh:
            out.append(json.load(fh))
    return out


@router.get("/download/{rec_id}")
async def download_recording(rec_id: str):
    meta = _load_meta(rec_id)
    if not meta:
        raise HTTPException(404, "Recording not found")
    meta     = _ensure_h264(meta)
    filepath = RECORDINGS_DIR / meta["filename"]
    if not filepath.exists():
        raise HTTPException(404, "File missing from disk")
    return FileResponse(str(filepath), media_type="video/mp4",
                        filename=meta["filename"],
                        headers={"Accept-Ranges":"bytes","Access-Control-Allow-Origin":"*"})


@router.delete("/{rec_id}")
async def delete_recording(rec_id: str):
    meta = _load_meta(rec_id)
    if not meta:
        raise HTTPException(404, "Recording not found")
    for name in [meta["filename"], meta["filename"].replace(".mp4","_h264.mp4")]:
        p = RECORDINGS_DIR / name
        if p.exists():
            p.unlink()
    mp = RECORDINGS_DIR / "meta" / f"{rec_id}.json"
    if mp.exists():
        mp.unlink()
    return {"status": "deleted", "id": rec_id}


@router.get("/status/{venue_id}")
async def recording_status(venue_id: str):
    if venue_id not in _active:
        return {"recording": False, "venue_id": venue_id}
    rec = _active[venue_id]
    return {
        "recording": True, "id": rec["id"], "venue_id": venue_id,
        "elapsed_secs": round(time.time() - rec["start_time"], 1),
        "frame_count": len(rec["frames"]),
    }


def _save_meta(rec_id: str, meta: dict):
    d = RECORDINGS_DIR / "meta"
    d.mkdir(exist_ok=True)
    with open(d / f"{rec_id}.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)


def _load_meta(rec_id: str) -> Optional[dict]:
    p = RECORDINGS_DIR / "meta" / f"{rec_id}.json"
    if not p.exists():
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)