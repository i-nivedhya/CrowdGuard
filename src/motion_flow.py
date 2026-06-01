# src/motion_flow.py — CrowdGuard AI v2.0
# Lucas-Kanade sparse optical flow, aggregated per tile

import cv2
import numpy as np
import config

# Lucas-Kanade parameters
LK_PARAMS = dict(
    winSize=(15, 15),
    maxLevel=2,
    criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03)
)

# Shi-Tomasi corner detector parameters
FEATURE_PARAMS = dict(
    maxCorners=200,
    qualityLevel=0.3,
    minDistance=7,
    blockSize=7
)

# Exponential smoothing factor for flow arrows
# 0.3 = very smooth but slow to react
# 0.6 = faster but slightly jittery
FLOW_SMOOTH = 0.3

# Module-level cache for previous smoothed flow values
_prev_flow = {}


def compute_tile_flow(prev_gray, curr_gray, tile_regions):
    """
    Given two consecutive grayscale frames and tile regions,
    compute dominant flow direction, speed, and chaos per tile.
    Flow values are smoothed across frames to prevent arrow flickering.

    Returns dict: {(row, col): {'mean_dx', 'mean_dy', 'speed', 'chaos'}}
    """
    global _prev_flow

    # Find strong corners in the previous frame
    p0 = cv2.goodFeaturesToTrack(prev_gray, mask=None, **FEATURE_PARAMS)
    if p0 is None:
        return {}

    # Track corners into current frame
    p1, st, _ = cv2.calcOpticalFlowPyrLK(prev_gray, curr_gray,
                                          p0, None, **LK_PARAMS)
    if p1 is None:
        return {}

    # Keep only successfully tracked points
    good_old     = p0[st == 1]
    good_new     = p1[st == 1]
    flow_vectors = good_new - good_old

    tile_flows = {}

    for tile, (x1, y1, x2, y2) in tile_regions.items():
        # Select vectors whose origin is inside this tile
        mask = ((good_old[:, 0] >= x1) & (good_old[:, 0] < x2) &
                (good_old[:, 1] >= y1) & (good_old[:, 1] < y2))
        vectors = flow_vectors[mask]

        # Need minimum points for a valid result
        if len(vectors) < config.FLOW_MIN_POINTS:
            continue

        # Raw mean displacement
        raw_dx = float(np.mean(vectors[:, 0]))
        raw_dy = float(np.mean(vectors[:, 1]))

        # ── Exponential smoothing ──────────────────────────────
        # Blends new value with previous to stop arrows from
        # jumping around every frame
        prev = _prev_flow.get(tile, {})
        smooth_dx = FLOW_SMOOTH * raw_dx + (1 - FLOW_SMOOTH) * prev.get('mean_dx', raw_dx)
        smooth_dy = FLOW_SMOOTH * raw_dy + (1 - FLOW_SMOOTH) * prev.get('mean_dy', raw_dy)

        # Average speed (use raw for accuracy)
        speed = float(np.mean(np.linalg.norm(vectors, axis=1)))

        # Chaos = angular standard deviation (high = panic indicator)
        angles = np.arctan2(vectors[:, 1], vectors[:, 0])
        chaos  = float(np.std(angles))

        tile_flows[tile] = {
            'mean_dx': smooth_dx,
            'mean_dy': smooth_dy,
            'speed':   speed,
            'chaos':   chaos,
        }

    # Save smoothed flow for next frame
    _prev_flow = tile_flows

    return tile_flows


def detect_opposing_flows(tile_flows, rows=4, cols=4):
    """
    Find pairs of adjacent tiles where crowds move toward each other.
    Dot product < FLOW_OPPOSING_DOT means flows are opposing.

    Returns list of (tile1, tile2, dot_product).
    """
    collision_zones = []

    for r in range(rows):
        for c in range(cols):
            # Check right neighbor
            if c + 1 < cols:
                t1, t2 = (r, c), (r, c + 1)
                collision_zones = _check_pair(tile_flows, t1, t2, collision_zones)

            # Check bottom neighbor
            if r + 1 < rows:
                t1, t2 = (r, c), (r + 1, c)
                collision_zones = _check_pair(tile_flows, t1, t2, collision_zones)

    return collision_zones


def _check_pair(tile_flows, t1, t2, collision_zones):
    """Check if two adjacent tiles have opposing flow vectors."""
    if t1 not in tile_flows or t2 not in tile_flows:
        return collision_zones

    v1 = np.array([tile_flows[t1]['mean_dx'], tile_flows[t1]['mean_dy']])
    v2 = np.array([tile_flows[t2]['mean_dx'], tile_flows[t2]['mean_dy']])

    n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)

    # Only check tiles with meaningful movement (> 0.5px per frame)
    if n1 > 0.5 and n2 > 0.5:
        dot = float(np.dot(v1 / n1, v2 / n2))
        if dot < config.FLOW_OPPOSING_DOT:
            collision_zones.append((t1, t2, dot))

    return collision_zones


def get_chaotic_tiles(tile_flows):
    """
    Return tiles where chaos score exceeds FLOW_CHAOS_THRESHOLD.
    High chaos = people moving in random directions (panic indicator).
    """
    return [tile for tile, data in tile_flows.items()
            if data['chaos'] > config.FLOW_CHAOS_THRESHOLD]


def reset_flow_history():
    """
    Call this when switching video sources or restarting the pipeline
    so stale smoothing values from the old source don't bleed in.
    """
    global _prev_flow
    _prev_flow = {}