# calibrate_scale.py --- CrowdGuard AI Count Scale Calibrator
#
# Reads video source automatically from config.py → CAMERA_SOURCES
# Just change your source in config.py and run this script.
#
# Run: python calibrate_scale.py

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models as tv_models, transforms
import warnings
warnings.filterwarnings('ignore', category=UserWarning)
import config

# ── Video source is read from config.py automatically ────────────────
# To change the source, edit CAMERA_SOURCES in config.py
# If you have multiple sources, you can choose which one to calibrate
VIDEO_SOURCE = config.CAMERA_SOURCES[0]

FRAME_NUMBER   = 40   # which frame to use for calibration
TILES_TO_COUNT = 6    # how many tiles to manually count

# =====================================================================

TRANSFORM = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std= [0.229, 0.224, 0.225])
])
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


class CSRNet(nn.Module):
    def __init__(self):
        super().__init__()
        vgg = tv_models.vgg16(pretrained=False)
        features = list(vgg.features.children())
        self.frontend = nn.Sequential(*features[:23])
        self.backend  = nn.Sequential(
            nn.Conv2d(512,512,3,padding=2,dilation=2), nn.ReLU(inplace=True),
            nn.Conv2d(512,512,3,padding=2,dilation=2), nn.ReLU(inplace=True),
            nn.Conv2d(512,512,3,padding=2,dilation=2), nn.ReLU(inplace=True),
            nn.Conv2d(512,256,3,padding=2,dilation=2), nn.ReLU(inplace=True),
            nn.Conv2d(256,128,3,padding=2,dilation=2), nn.ReLU(inplace=True),
            nn.Conv2d(128, 64,3,padding=2,dilation=2), nn.ReLU(inplace=True),
        )
        self.output_layer = nn.Conv2d(64, 1, 1)

    def forward(self, x):
        return self.output_layer(self.backend(self.frontend(x)))


def load_csrnet():
    print(f'Loading CSRNet SHB on {DEVICE}...')
    model = CSRNet().to(DEVICE)
    ck    = torch.load(config.MODEL_PATH, map_location=DEVICE, weights_only=False)
    if isinstance(ck, dict):
        st = ck.get('state_dict', ck.get('model', ck))
    else:
        st = ck
    st = {k.replace('module.', ''): v for k, v in st.items()}
    model.load_state_dict(st, strict=False)
    model.eval()
    print('Model loaded.')
    return model


def get_density_map(model, frame_bgr):
    h, w   = frame_bgr.shape[:2]
    img    = cv2.resize(frame_bgr, (config.INFERENCE_WIDTH, config.INFERENCE_HEIGHT))
    tensor = TRANSFORM(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        out = model(tensor)
    dm  = cv2.resize(out.squeeze().cpu().numpy(), (w, h))
    dm  = np.maximum(dm, 0)
    dm *= (config.INFERENCE_WIDTH * config.INFERENCE_HEIGHT) / (w * h)
    return dm


def get_tile_regions(h, w):
    regions = {}
    for r in range(config.GRID_ROWS):
        for c in range(config.GRID_COLS):
            x1 = int(c * w / config.GRID_COLS)
            y1 = int(r * h / config.GRID_ROWS)
            x2 = int((c+1) * w / config.GRID_COLS)
            y2 = int((r+1) * h / config.GRID_ROWS)
            regions[(r, c)] = (x1, y1, x2, y2)
    return regions


def pick_source_interactively():
    """
    If config.py has multiple sources, ask the user which one to calibrate.
    Returns the chosen source string/int.
    """
    sources = config.CAMERA_SOURCES
    labels  = getattr(config, 'CAMERA_LABELS',
                      [f'Source {i}' for i in range(len(sources))])

    if len(sources) == 1:
        print(f'  Using source from config.py: {sources[0]}')
        return sources[0]

    print('  Multiple sources found in config.py:')
    for i, (src, lbl) in enumerate(zip(sources, labels)):
        print(f'    [{i}] {lbl}  →  {src}')
    print()

    while True:
        try:
            choice = int(input(f'  Which source to calibrate? (0-{len(sources)-1}): '))
            if 0 <= choice < len(sources):
                print(f'  Selected: {labels[choice]}  →  {sources[choice]}')
                return sources[choice]
        except ValueError:
            pass
        print(f'  Please enter a number between 0 and {len(sources)-1}')


def draw_frame_with_all_tiles(frame, density_map, tile_regions, tile_counts):
    display = frame.copy()
    h, w    = frame.shape[:2]

    d_norm  = cv2.normalize(density_map, None, 0, 255, cv2.NORM_MINMAX)
    heatmap = cv2.applyColorMap(d_norm.astype(np.uint8), cv2.COLORMAP_JET)
    display = cv2.addWeighted(display, 0.55, heatmap, 0.45, 0)

    for (r, c), (x1, y1, x2, y2) in tile_regions.items():
        cv2.rectangle(display, (x1, y1), (x2, y2), (255, 255, 255), 1)
        count = tile_counts[(r, c)]
        # Label placed at bottom of each tile so row-0 labels don't get hidden
        cv2.putText(display, f'({r},{c})={count:.0f}',
                    (x1+4, y2-6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1, cv2.LINE_AA)

    total = sum(tile_counts.values())
    # Header moved to BOTTOM — never covers any tile
    cv2.rectangle(display, (0, h-56), (w, h), (15, 15, 15), -1)
    cv2.putText(display,
                f'Source: {VIDEO_SOURCE}  |  Raw total: {total:.0f}  |  Frame: {FRAME_NUMBER}',
                (8, h-36),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1, cv2.LINE_AA)
    cv2.putText(display,
                'Study this frame carefully. Press any key to begin counting.',
                (8, h-12),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 200), 1, cv2.LINE_AA)

    return display


def draw_tile_highlight(frame, density_map, tile_regions, tile_counts,
                        target_tile, tile_number, total_tiles):
    display = frame.copy()
    h, w    = frame.shape[:2]

    d_norm  = cv2.normalize(density_map, None, 0, 255, cv2.NORM_MINMAX)
    heatmap = cv2.applyColorMap(d_norm.astype(np.uint8), cv2.COLORMAP_JET)
    display = cv2.addWeighted(display, 0.55, heatmap, 0.45, 0)

    # Dim everything
    dim_overlay = display.copy()
    cv2.rectangle(dim_overlay, (0, 0), (w, h), (0, 0, 0), -1)
    display = cv2.addWeighted(display, 0.35, dim_overlay, 0.65, 0)

    # Restore target tile
    tr, tc = target_tile
    tx1, ty1, tx2, ty2 = tile_regions[target_tile]
    tile_full    = frame[ty1:ty2, tx1:tx2].copy()
    tile_heatmap = heatmap[ty1:ty2, tx1:tx2].copy()
    tile_blended = cv2.addWeighted(tile_full, 0.55, tile_heatmap, 0.45, 0)
    display[ty1:ty2, tx1:tx2] = tile_blended

    cv2.rectangle(display, (tx1, ty1), (tx2, ty2), (0, 255, 255), 3)

    raw_count = tile_counts[target_tile]
    mid_x = (tx1 + tx2) // 2 - 40
    mid_y = (ty1 + ty2) // 2
    cv2.putText(display, f'Raw: {raw_count:.0f}',
                (mid_x, mid_y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2, cv2.LINE_AA)

    for (r, c), (x1, y1, x2, y2) in tile_regions.items():
        if (r, c) == target_tile:
            continue
        cv2.rectangle(display, (x1, y1), (x2, y2), (80, 80, 80), 1)
        cv2.putText(display, f'({r},{c})',
                    (x1+4, y1+14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.30, (80, 80, 80), 1, cv2.LINE_AA)

    cv2.rectangle(display, (0, 0), (w, 52), (15, 15, 15), -1)
    cv2.putText(display,
                f'TILE ({tr},{tc})  —  Counting tile {tile_number} of {total_tiles}',
                (8, 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(display,
                f'Raw model count for this tile: {raw_count:.0f}',
                (8, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 180, 180), 1, cv2.LINE_AA)

    cv2.rectangle(display, (0, h-52), (w, h), (15, 15, 15), -1)
    cv2.putText(display,
                'Count every visible person head/body in the BRIGHT tile.',
                (8, h-32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 200), 1, cv2.LINE_AA)
    cv2.putText(display,
                'Include partial people at edges. Then type the number in terminal.',
                (8, h-12),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 200), 1, cv2.LINE_AA)

    return display


def main():
    global VIDEO_SOURCE

    print()
    print('=' * 60)
    print('  CROWDGUARD AI - COUNT SCALE CALIBRATOR')
    print('=' * 60)
    print()

    # ── Pick source from config.py ────────────────────────────────────
    VIDEO_SOURCE = pick_source_interactively()
    print()

    # Webcam index (integer) cannot be seeked to a frame number
    # So if source is a webcam, read the first available frame instead
    is_webcam = isinstance(VIDEO_SOURCE, int)

    print(f'  Source : {VIDEO_SOURCE}')
    print(f'  Frame  : {"live capture" if is_webcam else FRAME_NUMBER}')
    print(f'  Device : {DEVICE}')
    print()

    # ── Load the frame ────────────────────────────────────────────────
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    if not cap.isOpened():
        print(f'ERROR: Cannot open source: {VIDEO_SOURCE}')
        print('Check that the file path is correct in config.py → CAMERA_SOURCES')
        return

    if is_webcam:
        # Read a few frames to let camera warm up
        for _ in range(5):
            cap.read()
        ret, frame = cap.read()
    else:
        cap.set(cv2.CAP_PROP_POS_FRAMES, FRAME_NUMBER)
        ret, frame = cap.read()

    cap.release()

    if not ret or frame is None:
        print('ERROR: Could not read frame from source.')
        print(f'If using a video file, check FRAME_NUMBER ({FRAME_NUMBER}) is not beyond the end.')
        return

    h, w = frame.shape[:2]
    print(f'  Frame size: {w}x{h}')
    print()

    # ── Run model ─────────────────────────────────────────────────────
    model        = load_csrnet()
    print()
    print('  Running inference...')
    density_map  = get_density_map(model, frame)
    tile_regions = get_tile_regions(h, w)

    tile_counts = {}
    for (r, c), (x1, y1, x2, y2) in tile_regions.items():
        tile_counts[(r, c)] = float(density_map[y1:y2, x1:x2].sum())

    total_raw = sum(tile_counts.values())
    print(f'  Total raw model count: {total_raw:.0f}')
    print()

    # ── Show overview ─────────────────────────────────────────────────
    print('  Showing full frame. Study it carefully.')
    print('  Press any key to start counting tile by tile.')
    print()

    overview = draw_frame_with_all_tiles(frame, density_map, tile_regions, tile_counts)
    MAX_W = 1400
    oh, ow = overview.shape[:2]
    if ow > MAX_W:
        scale    = MAX_W / ow
        overview = cv2.resize(overview, (MAX_W, int(oh * scale)))
    cv2.namedWindow('CrowdGuard Calibration', cv2.WINDOW_NORMAL)
    cv2.resizeWindow('CrowdGuard Calibration', overview.shape[1], overview.shape[0])
    cv2.imshow('CrowdGuard Calibration', overview)
    cv2.waitKey(0)

    # ── Select tiles to count ─────────────────────────────────────────
    sorted_tiles   = sorted(tile_counts.items(), key=lambda x: x[1], reverse=True)
    step           = max(1, len(sorted_tiles) // TILES_TO_COUNT)
    selected_tiles = [sorted_tiles[i][0] for i in range(0, len(sorted_tiles), step)]
    selected_tiles = selected_tiles[:TILES_TO_COUNT]
    selected_tiles.sort()

    print(f'  You will count people in {len(selected_tiles)} tiles.')
    print(f'  Selected tiles: {selected_tiles}')
    print()
    print('  For each tile:')
    print('  1. Look at the BRIGHT highlighted region on screen')
    print('  2. Count every person head/body you can see')
    print('  3. Include partial people at tile edges')
    print('  4. Type the number and press Enter')
    print()
    input('  Press ENTER to begin...')
    print()

    # ── Count loop ────────────────────────────────────────────────────
    raw_counts  = []
    real_counts = []

    for i, tile in enumerate(selected_tiles):
        r, c = tile
        raw  = tile_counts[tile]

        highlight = draw_tile_highlight(
            frame, density_map, tile_regions, tile_counts,
            tile, i + 1, len(selected_tiles)
        )
        MAX_W = 1400
        hh, hw = highlight.shape[:2]
        if hw > MAX_W:
            scale     = MAX_W / hw
            highlight = cv2.resize(highlight, (MAX_W, int(hh * scale)))
        cv2.namedWindow('CrowdGuard Calibration', cv2.WINDOW_NORMAL)
        cv2.resizeWindow('CrowdGuard Calibration', highlight.shape[1], highlight.shape[0])
        cv2.imshow('CrowdGuard Calibration', highlight)
        cv2.waitKey(1)

        print(f'  TILE ({r},{c})  —  {i+1} of {len(selected_tiles)}')
        print(f'  Raw model count: {raw:.0f}')
        print()

        while True:
            try:
                user_count = int(input(f'  How many people in tile ({r},{c})? ').strip())
                if user_count >= 0:
                    break
                print('  Enter 0 or a positive number.')
            except ValueError:
                print('  Please type a whole number.')

        raw_counts.append(raw)
        real_counts.append(user_count)

        ratio = raw / user_count if user_count > 0 else 0
        print(f'  Counted: {user_count}  |  Ratio: {raw:.0f}/{user_count} = {ratio:.1f}x')
        print()

    cv2.destroyAllWindows()

    # ── Calculate scale factor ────────────────────────────────────────
    print()
    print('=' * 60)
    print('  CALIBRATION RESULTS')
    print('=' * 60)
    print()
    print(f'  {"Tile":<10} {"Raw":>10} {"You Counted":>13} {"Ratio":>8}')
    print('  ' + '-' * 44)

    ratios = []
    for tile, raw, real in zip(selected_tiles, raw_counts, real_counts):
        if real > 0:
            ratio = raw / real
            ratios.append(ratio)
            print(f'  {str(tile):<10} {raw:>10.0f} {real:>13} {ratio:>8.1f}x')
        else:
            print(f'  {str(tile):<10} {raw:>10.0f} {real:>13} {"(skipped)":>8}')

    print('  ' + '-' * 44)

    if not ratios:
        print('  ERROR: No valid counts. Run again and enter non-zero counts.')
        return

    scale_factor = round(float(np.median(ratios)), 1)
    mean_ratio   = round(float(np.mean(ratios)),   1)
    min_ratio    = round(float(np.min(ratios)),    1)
    max_ratio    = round(float(np.max(ratios)),    1)

    print()
    print(f'  Individual ratios : {[round(r,1) for r in ratios]}')
    print(f'  Mean ratio        : {mean_ratio}x')
    print(f'  Median ratio      : {scale_factor}x  ← your COUNT_SCALE')
    print(f'  Range             : {min_ratio}x — {max_ratio}x')
    print()

    estimated_total_real = int(total_raw / scale_factor)
    print(f'  Raw total  : {total_raw:.0f}')
    print(f'  Scale      : {scale_factor}x')
    print(f'  Estimated  : ~{estimated_total_real} real people in scene')
    print()

    if len(ratios) > 1 and max_ratio / min_ratio > 3.0:
        print('  NOTE: Ratios vary a lot — normal for overhead cameras.')
        print('  Median is still a reliable estimate.')
        print()

    # ── Print what to update in config.py ─────────────────────────────
    print('=' * 60)
    print('  COPY THIS INTO config.py')
    print('=' * 60)
    print()
    print(f'  COUNT_SCALE = {scale_factor}')
    print()
    print('  VENUE_THRESHOLDS = {')
    venues = {
        'stadium': (8,  20),
        'temple':  (5,  12),
        'college': (6,  15),
        'rally':   (6,  16),
    }
    for venue, (yellow, red) in venues.items():
        y_scaled = round(yellow * scale_factor)
        r_scaled = round(red    * scale_factor)
        print(f"      '{venue}': ({y_scaled:>6}, {r_scaled:>6}),   "
              f"# {yellow} to {red} people × {scale_factor}")
    print('  }')
    print()
    print('=' * 60)


if __name__ == '__main__':
    main()