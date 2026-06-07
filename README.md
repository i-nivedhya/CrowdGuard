# CrowdGuard: Realtime Crowd Monitoring System 

> AI powered real time crowd density estimation and stampede prevention system designed for temples, college fests, stadiums, and public rallies.

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/45582f68-2653-4381-8bf2-fae17e17636c" />

---

## What It Does


## System Architecture

```text
Camera Feed
     ↓
CSRNet Model
     ↓
Density Estimation
     ↓
Risk Analysis Engine
     ↓
FastAPI Backend
     ↓
PostgreSQL Database
     ↓
React Dashboard + Telegram Alerts
```
React Dashboard + Telegram Alerts

- Realtime crowd counting using CSRNet deep learning model
- 4×4 grid spatial risk localization (Green / Yellow / Red zones)
- Surge and stampede early warning alerts
- Crowd Stress Score (CSS) — unified 0–100 risk metric
- Motion flow analysis and chaos detection
- Telegram push notifications for safety coordinators
- Live web dashboard with WebSocket streaming
- Server side video recording and screenshots


---
### How it Does
- The 4x4 grid gives 16 zones, which is the right balance between spatial granularity and practical usefulness. A 3x3 grid would be only 9 zones too coarse to localise danger precisely. An 8x8 grid of 64 zones would have very small tiles that might not have enough people in each zone to trigger meaningful thresholds. Also, for a safety officer looking at a dashboard, 16 colour coded tiles is the maximum they can process quickly in a high stress situation. With 64 tiles the display becomes too cluttered.
- Zone pressure is a weighted score that considers not just a tile's own count but also the counts of its neighbours. The formula gives the centre tile a weight of 2.0 and each of its up to 8 neighbours a weight of 1.0. The pressure score is the weighted average. This is important because an isolated yellow tile is much less dangerous than a yellow tile surrounded by other yellow and red tiles. In a real stampede scenario, the dangerous pressure builds across a connected cluster of zones, zone pressure captures this spatial context that a simple per tile threshold would miss.
- The surge detector maintains a rolling history of the last 15 frame counts for each tile. Every processed frame, it compares the current count to the count from 3 frames ago, this is the 3 frame delta. If the delta exceeds 3 persons AND the tile is already Yellow or Red, a SURGE alert is fired. Using a 3 frame window instead of frame-by-frame comparison smooths out noise from natural crowd movement. The system also detects CASCADE_RISK when zone pressure exceeds 1.5 times the red threshold with a rising count and SUDDEN_DISPERSAL when count drops below 50% of recent value which may indicate a panic scatter event.
- The Crowd Stress Score is a single number from 0 to 100 that combines four independent safety signals into one metric that non-technical safety officers can immediately act on. The formula is: CSS = 0.35 times the density score, plus 0.30 times the surge score, plus 0.20 times the zone pressure score, plus 0.15 times the motion chaos score. Density is weighted most because it is the most direct measure of danger. Surge is weighted second because rapid crowd growth is the key precursor to stampede. Zone pressure third because spatial context is important. Motion chaos is weighted least because optical flow is noisier than the count-based signals. A score of 0-20 is Normal, 21-40 is Elevated, 41-60 is High, 61-80 is Severe, and 81-100 is Critical. The weights were determined through expert elicitation informed by crowd crush literature, particularly the work of Helbing et al. on the dynamics of crowd disasters. Their research shows that compressive pressure which corresponds to density and zone pressure is the primary physical cause of crowd crush, while rapid ingress which corresponds to surge is the primary trigger. Motion chaos was added based on research showing that disorganised movement is an early behavioural indicator of panic. The weights reflect this hierarchy: density 35%, surge 30%, zone pressure 20%, motion chaos 15%. Data driven weight optimisation through user studies with actual safety officers is identified as future work.
- Optical flow is a computer vision technique that tracks how pixels move between consecutive frames. I use Lucas-Kanade sparse optical flow, which works by finding good feature points corners and edges using the Shi-Tomasi detector, and then tracking where those points move in the next frame. The movement vectors for all tracked points within each tile are aggregated to give a dominant direction and a speed for that tile. The angular standard deviation of all the flow vectors within a tile gives the chaos score, if all people are moving in roughly the same direction, the standard deviation is low. If people are moving in random directions which happens in panic situations, the standard deviation is high and a CHAOS alert is triggered. Adjacent tiles with directly opposing dominant directions flag a COLLISION ZONE.
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
# Additional Features

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/c2bfc529-a110-4bd1-a500-a1f9e60b48a7" />

> Configure venue name, type, and crowd capacity; toggle Telegram alerts on/off with a shareable QR code and invite link for safety staff.

---

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/027078d2-5feb-49ec-8d88-02200f709e9d" />

> Adjust CSS alert thresholds with a live color gradient preview — HIGH triggers Telegram alerts, CRITICAL triggers emergency + PA notifications.

---

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/e7625f53-0067-4043-9ab7-c484e930b3cc" />

> Assign custom labels to all 16 grid zones, displayed directly on the live dashboard for easy location identification by safety staff.

---

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/64dffb28-6d9e-4358-b174-7b3c03937946" />

> Set the video source (webcam, file, or RTSP stream) and calibrate the crowd count scale factor; previews the exact config.py changes before saving.

---

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/1f14059a-3c40-4f78-b453-2b3508d85ce3" />

> Manage multirole access control — add or remove users with roles like Super Admin, Venue Manager, Security Guard, and Read Only.

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
