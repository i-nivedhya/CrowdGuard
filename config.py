import os
from dotenv import load_dotenv

load_dotenv() 

# config.py — CrowdGuard AI v2.0 + v3.0
# All project settings live here. Change values here to tune the system.

# ── Model Settings ───────────────────────────────────────────────────
MODEL_PATH       = 'models/CSRNet/weights/csrnet_shb.pth'
INFERENCE_WIDTH  = 640   # resize frame to this width before inference
INFERENCE_HEIGHT = 480   # resize frame to this height before inference
PROCESS_EVERY_N_FRAMES = 2  # run AI on every 2nd frame (skip alternate)

# ── Adaptive COUNT_SCALE (key research contribution) ─────────────────
# ADAPTIVE_SCALE = True  → density_model.py uses density-aware scaling
# ADAPTIVE_SCALE = False → fixed COUNT_SCALE is used (legacy mode)
#
# Research finding (validated March 2026):
#   CSRNet exhibits non-linear density-dependent scale variance caused
#   by Gaussian kernel overlap in dense crowds. A single fixed scale
#   produces ~65% error across extreme density ranges.
#
#   Primary calibration (original validated finding):
#     Sparse scenes  → scale = 26.9×  (MAE 8.5%)
#     Dense scenes   → scale = 78.5×  (MAE 9.2%)
#     Scale ratio    → 2.9×  (confirmed non-linear effect)
#
#   Secondary calibration (3-video college venue, March 2026):
#     sparse.mp4        raw = 9,033   scale = 57.2
#     medium_dense.mp4  raw = 8,776   scale = 74.7
#     very_dense.mp4    raw = 20,398  scale = 58.9
#     Mean ± std        63.6 ± 8.9×  (all in moderate-dense band)
#     Average MAE after adaptive scaling: 14.3%
#
ADAPTIVE_SCALE = False

# Fallback fixed scale — used when ADAPTIVE_SCALE = False
# Set to mean of 3-video college calibration
COUNT_SCALE = 74.4

# ── Grid Settings ────────────────────────────────────────────────────
GRID_ROWS = 4
GRID_COLS = 4

# ── Venue Thresholds (real persons per tile) ─────────────────────────
# (yellow_threshold, red_threshold)
# Below yellow = Green (safe)
# Between yellow and red = Yellow (moderate)
# Above red = Red (critical)
#
# These are in REAL PERSON COUNTS (not raw model output).
# density_model.py applies COUNT_SCALE before returning counts,
# so these values directly correspond to actual people per tile.
VENUE_THRESHOLDS = {
    'stadium': (8,  20),
    'temple':  (5,  12),
    'college': (6,  14),
    'rally':   (6,  16),
}
DEFAULT_VENUE = 'college'

# ── Surge Detection Settings ─────────────────────────────────────────
SURGE_HISTORY_LEN     = 15  # rolling frame history length per tile
SURGE_DELTA_THRESHOLD = 2   # persons added in SURGE_FRAME_GAP frames
SURGE_FRAME_GAP       = 3   # compare current count vs N frames ago

# ── Display Settings ─────────────────────────────────────────────────
OVERLAY_ALPHA = 0.50   # tile color transparency (0=invisible, 1=solid)
SHOW_HEATMAP  = True   # show density heatmap behind grid

# ── Colors (BGR format for OpenCV) ───────────────────────────────────
COLOR_GREEN  = (0, 200,   0)
COLOR_YELLOW = (0, 200, 255)
COLOR_RED    = (0,   0, 220)
COLOR_GRID   = (255, 255, 255)
COLOR_ALERT  = (0,   0, 255)
COLOR_TEXT   = (255, 255, 255)

# ── v2.0 Settings ────────────────────────────────────────────────────

# Predictive Warning (FR-09)
PREDICTION_WINDOW       = 30   # past frames used for trend fitting
PREDICTION_FRAMES       = 50   # frames ahead to predict (~3s at 5fps)
PREDICTION_MIN_WINDOW   = 20   # minimum frames before prediction fires
PREDICTION_R2_MIN       = 0.80 # minimum R² for prediction to be trusted
PREDICTION_HOLD_FRAMES  = 20

# Motion Flow (FR-10)
FLOW_CHAOS_THRESHOLD  = 2.8   # angular std dev (rad) → tile = chaotic
FLOW_OPPOSING_DOT     = -0.5  # dot product below this = opposing flows
FLOW_MIN_POINTS       = 5     # min tracked points per tile for valid flow
SHOW_FLOW_ARROWS      = True  # toggle flow arrows on dashboard (F key)

# Crowd Stress Score (FR-11)
CSS_WEIGHTS = {
    'density':       0.35,
    'surge':         0.30,
    'zone_pressure': 0.20,
    'motion_chaos':  0.15,
}
CSS_HISTORY_LEN = 300   # ~60 seconds at 5fps — for sparkline graph

# Venue type for recommendations (FR-14)
VENUE_TYPE = 'college'

# Multi-Camera (FR-13)
CAMERA_SOURCES = ['test_video/dense.mp4']
CAMERA_LABELS  = ['college_main']

# Alert hold duration
ALERT_HOLD_FRAMES = 15   # keep each alert visible for 15 frames minimum

# ONNX Export (FR-12)
ONNX_EXPORT_PATH     = 'exports/crowdguard_model.onnx'
ONNX_INT8_PATH       = 'exports/crowdguard_model_int8.onnx'
ONNX_INPUT_SIZE      = (1, 3, 480, 640)
MOBILE_PROCESS_EVERY = 3

# ── v3.0 Settings ────────────────────────────────────────────────────

TELEGRAM_ENABLED   = True
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_IDS  = [int(os.getenv("TELEGRAM_CHAT_IDS", "0"))]

# CSS alert thresholds for Telegram notifications
ALERT_THRESHOLD_ELEVATED = 40   # dashboard only
ALERT_THRESHOLD_HIGH     = 60
ALERT_THRESHOLD_SEVERE   = 75   # Telegram alert + louder emoji
ALERT_THRESHOLD_CRITICAL = 75