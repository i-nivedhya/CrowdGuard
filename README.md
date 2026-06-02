# CrowdGuard: Realtime Crowd Monitoring System 

> AI powered real time crowd density estimation and stampede prevention system designed for temples, college fests, stadiums, and public rallies.

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/45582f68-2653-4381-8bf2-fae17e17636c" />

---

## What It Does

- Realtime crowd counting using CSRNet deep learning model
- 4×4 grid spatial risk localization (Green / Yellow / Red zones)
- Surge and stampede early warning alerts
- Crowd Stress Score (CSS) — unified 0–100 risk metric
- Motion flow analysis and chaos detection
- Telegram push notifications for safety coordinators
- Live web dashboard with WebSocket streaming
- Server side video recording and screenshots


---

---
# CrowdGuard Core Features

## Realtime Grid Monitoring
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/4309b082-cfa7-4fe8-9c8c-6606e501c65a" />
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/899faf1e-23d3-4dc0-bdfb-f3c22cb1b9e6" />
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/390ac4ae-9f55-4137-943f-2926753397a1" />

---

## CSRNet Density Model 
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/25b44cd0-aef5-4c57-b157-529ee5fcb5d5" />

---

## Telegram Push Alerts
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/ec3bc42a-c5bf-4411-880e-5a25169f4853" />
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/c433607e-3ba7-4691-8bd4-412d30177ab7" />

---

## Historical Analytics Engine
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/6d1506c7-6502-48e5-8f4d-008abbe13e32" />
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/c77e5a57-a1ca-43f5-94ee-56bf37f4d3ba" />

---

## Role Based Access Control  
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/00f80ff7-92b0-484b-8cf2-099ec5cb2444" />
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/5f872d28-7ef3-4aec-aca2-fdebf7e8996d" />
<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/85099e89-a8c2-47c5-b8b8-e8fa4285e648" />

---


## System Requirements

### Hardware
| Component | Minimum |
|-----------|---------|
| GPU | NVIDIA RTX 3050 or better (4GB VRAM) |
| RAM | 16GB recommended |
| OS | Windows 10/11 64-bit |

### System Tools

**FFmpeg** — recommended for H264 recording quality
```
winget install ffmpeg
```
> Without FFmpeg, recordings still work using mp4v fallback.

**Git**
```
winget install git
```

**Node.js** — version 18 or higher, required for the frontend dashboard
```
https://nodejs.org
```

**Anaconda** — for Python environment management
```
https://www.anaconda.com
```

---

## Python Setup

**Step 1 — Create conda environment:**
```bash
conda create -n crowdguard python=3.9
conda activate crowdguard
```

**Step 2 — Install PyTorch with CUDA:**
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**Step 3 — Install remaining dependencies:**
```bash
pip install -r requirements.txt
```

**Step 4 — Verify GPU is working:**
```bash
python -c "import torch; print(torch.cuda.is_available())"
```
Should print: `True`

---

## Download Required Files

The CSRNet model weights are too large for GitHub (130MB) and must be downloaded separately.

**Option 1 — Automatic download (recommended):**
```bash
pip install gdown
python download_assets.py
```

**Option 2 — Manual download:**
- Download: [csrnet_shb.pth](https://drive.google.com/drive/folders/15548mWqjVxxVrMYh_uTDKS2ImHBHArpv?usp=drive_link)
- Place at: `models/CSRNet/weights/csrnet_shb.pth`

> Test videos are already included in the repository.

---

## Environment Setup

Create a `.env` file in the project root:
```
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_IDS=your_chat_id_here
```
> Contact the project team for the correct credentials.

---

## Database Setup

Required for analytics and historical data features. Install PostgreSQL first, then run:

```bash
psql -U postgres -c "CREATE DATABASE crowdguard;"
psql -U postgres -c "CREATE USER crowdguard_user WITH PASSWORD 'crowd123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE crowdguard TO crowdguard_user;"
psql -U postgres crowdguard < server/setup_db.sql
```

---

## Frontend Setup

```bash
cd dashboard_web
npm install
```

---

## Running the Project

Start in this exact order — each in a separate terminal:

**Terminal 1 — AI pipeline:**
```bash
conda activate crowdguard
python main.py
```

**Terminal 2 — API server:**
```bash
conda activate crowdguard
uvicorn server.main_server:app --reload --port 8000
```

**Terminal 3 — Web dashboard:**
```bash
cd dashboard_web
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Keyboard Controls

| Key | Action |
|-----|--------|
| `Q` | Quit the application |
| `V` | Cycle through venue types |
| `F` | Toggle motion flow arrows |

---

## Venue Types and Thresholds

| Venue | Yellow Threshold | Red Threshold |
|-------|-----------------|---------------|
| College | 6 people/tile | 14 people/tile |
| Temple | 5 people/tile | 12 people/tile |
| Stadium | 8 people/tile | 20 people/tile |
| Rally | 6 people/tile | 16 people/tile |

---

## Venue Calibration

If deploying at a new venue with a different camera angle or height:
```bash
python calibrate_scale.py
```
Follow the on-screen instructions to find the correct `COUNT_SCALE` for your setup.

---

## Validate Accuracy

To measure counting accuracy at your venue:
```bash
python validate_accuracy.py
```

---

## Surge Detection Validation

To verify surge detection is working correctly:
```bash
python test_surge_detection.py
```

---

## Mobile Export (Optional)

To export the model for Android deployment:
```bash
python src/onnx_export.py
```
This generates ONNX and INT8 quantized models in the `exports/` folder.

---

## Project Structure

```
CrowdGuard/
├── src/                    — Core AI pipeline modules
├── server/                 — FastAPI backend server
├── dashboard_web/          — React frontend dashboard
├── notifications/          — Telegram alert system
├── models/CSRNet/          — CSRNet model architecture
├── main.py                 — Entry point
├── config.py               — All settings and thresholds
├── calibrate_scale.py      — Venue calibration tool
├── validate_accuracy.py    — Accuracy measurement tool
├── download_assets.py      — Asset downloader script
├── recording_router.py     — Video recording API
└── ws_publisher.py         — WebSocket data publisher
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Model | CSRNet (VGG16 backend) |
| Deep Learning | PyTorch 2.0 + CUDA 11.8 |
| Computer Vision | OpenCV 4.8 |
| Backend API | FastAPI + PostgreSQL |
| Frontend | React + Vite |
| Alerts | Telegram Bot API |
| Mobile Export | ONNX INT8 |


## Troubleshooting

**CUDA not available:**
```bash
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**Model weights not found:**
- Check that `csrnet_shb.pth` is in `models/CSRNet/weights/`
- Run `python download_assets.py` to download automatically
- Check `MODEL_PATH` in `config.py` matches the filename

**Dashboard not connecting:**
- Make sure `main.py` is running before opening the browser
- Make sure uvicorn server is running on port 8000
- Check browser console for connection errors

**Telegram alerts not firing:**
- Make sure `.env` file exists in the project root
- Verify `ALERT_THRESHOLD` values in `config.py`
- Contact the project team for correct credentials

**Recording shows 0 frames:**
- Make sure `main.py` is running before starting a recording
- Start in the correct order: `main.py` → server → frontend → record

---

## Version History

| Version | Focus | Key Features |
|---------|-------|-------------|
| v1.0 | Core AI Pipeline | Density estimation, 4×4 grid, surge detection |
| v2.0 | Intelligence Layer | Prediction, motion flow, CSS, multi-camera |
| v3.0 | Deployment Platform | Cloud dashboard, WebSocket, analytics, recording |
