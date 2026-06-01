# CrowdGuard AI

AI powered realtime crowd density estimation and stampede prevention
system designed for temples, college fests, stadiums, and public rallies.

## What It Does

Realtime crowd counting using CSRNet deep learning model
4x4 grid spatial risk localization (Green/Yellow/Red zones)
Surge and stampede early warning alerts
Crowd Stress Score (CSS) unified risk metric
Motion flow analysis and chaos detection
Telegram push notifications for safety coordinators
Live web dashboard with WebSocket streaming
Server side video recording and screenshots

## System Requirements

### Hardware

GPU: NVIDIA RTX 3050 or better (4GB VRAM minimum)
RAM: 16GB recommended
OS: Windows 10/11 64-bit

### System Tools

**FFmpeg** (recommended for H264 recording quality)
winget install ffmpeg

Without FFmpeg recordings still work using mp4v fallback.

**Git**
winget install git

**Node.js** (for frontend dashboard)
Download from https://nodejs.org — version 18 or higher

**Anaconda**
Download from https://www.anaconda.com

## Python Setup

**Step 1 — Create conda environment:**
conda create -n crowdguard python=3.9
conda activate crowdguard

**Step 2 — Install PyTorch with CUDA:**
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

**Step 3 — Install remaining dependencies:**
pip install -r requirements.txt

**Step 4 — Verify GPU is working:**
python -c "import torch; print(torch.cuda.is_available())"

Should print: True

## Download Required Files

The CSRNet model weights are too large for GitHub (130MB).

**Option 1 — Automatic download:**
pip install gdown
python download_assets.py

**Option 2 — Manual download:**
Download: [csrnet_shb.pth](https://drive.google.com/drive/folders/15548mWqjVxxVrMYh_uTDKS2ImHBHArpv?usp=drive_link)
Place at: `models/CSRNet/weights/csrnet_shb.pth`

Test videos are already included in the repository.

## Database Setup (for analytics features)

Install PostgreSQL, then run:
psql -U postgres -c "CREATE DATABASE crowdguard;"
psql -U postgres -c "CREATE USER crowdguard_user WITH PASSWORD 'crowd123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE crowdguard TO crowdguard_user;"
psql -U postgres crowdguard < server/setup_db.sql

## Frontend Setup

cd dashboard_web
npm install

## Running the Project

Start in this exact order — each in a separate terminal:

**Terminal 1 — AI pipeline:**
conda activate crowdguard
python main.py

**Terminal 2 — API server:**
conda activate crowdguard
uvicorn server.main_server:app --reload --port 8000

**Terminal 3 — Web dashboard:**
cd dashboard_web
npm run dev

Then open http://localhost:5173

## Venue Calibration

If deploying at your own new venue with a different camera:
python calibrate_scale.py

Follow the on screen instructions to find the correct COUNT_SCALE
for your camera angle and height.

## Validate Accuracy

To measure counting accuracy at your venue:
python validate_accuracy.py

## Surge Detection Validation

To verify surge detection is working correctly:
python test_surge_detection.py

## Mobile Export (Optional)

To export the model for Android deployment:
python src/onnx_export.py

This generates ONNX and INT8 quantized models in the exports/ folder.

## Project Structure

CrowdGuard/
├── src/ — Core AI pipeline modules
├── server/ — FastAPI backend server
├── dashboard_web/ — React frontend dashboard
├── notifications/ — Telegram alert system
├── models/CSRNet/ — CSRNet model architecture
├── main.py — Entry point
├── config.py — All settings and thresholds
├── calibrate_scale.py — Venue calibration tool
├── validate_accuracy.py — Accuracy measurement tool
├── recording_router.py — Video recording API
└── ws_publisher.py — WebSocket data publisher

## Troubleshooting

**Telegram alerts not firing:**
Make sure `.env` file exists in the project root
Contact the project team for the correct credentials

**CUDA not available:**
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

**Model weights not found:**
Check that csrnet_shb.pth is in models/CSRNet/weights/
Check MODEL_PATH in config.py matches the filename

**Dashboard not connecting:**
Make sure main.py is running before opening the browser
Make sure uvicorn server is running on port 8000
Check browser console for errors

**Telegram alerts not firing:**
Verify .env file exists with correct token and chat ID
Run test_telegram.py to verify bot connection (before deleting it)
Check ALERT_THRESHOLD values in config.py

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Model | CSRNet (VGG16 backend) |
| Deep Learning | PyTorch 2.0 + CUDA |
| Computer Vision | OpenCV 4.8 |
| Backend API | FastAPI + PostgreSQL |
| Frontend | React + Vite |
| Alerts | Telegram Bot API |
| Mobile Export | ONNX INT8 |

## Version

v1.0 — Core AI pipeline, grid, surge detection
v2.0 — Prediction, motion flow, CSS
v3.0 — Cloud dashboard, WebSocket, analytics, recording
