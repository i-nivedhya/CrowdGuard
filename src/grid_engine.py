# src/grid_engine.py — divides density map into 4x4 grid and counts per tile
import numpy as np
import config
 
def get_tile_regions(frame_h, frame_w):
    """
    Compute pixel boundaries for each of the 16 tiles.
    Returns dict: {(row, col): (x1, y1, x2, y2)}
    """
    regions = {}
    rows, cols = config.GRID_ROWS, config.GRID_COLS
    for r in range(rows):
        for c in range(cols):
            x1 = int(c * frame_w / cols)
            y1 = int(r * frame_h / rows)
            x2 = int((c+1) * frame_w / cols)
            y2 = int((r+1) * frame_h / rows)
            regions[(r, c)] = (x1, y1, x2, y2)
    return regions
 
def compute_tile_counts(density_map, tile_regions):
    """
    Sum the density map within each tile region.
    For DM-Count: sum of pixel values = estimated person count in that region.
    Returns dict: {(row, col): float_count}
    """
    tile_counts = {}
    for (r, c), (x1, y1, x2, y2) in tile_regions.items():
        # Slice out the tile region from the density map
        tile_region = density_map[y1:y2, x1:x2]
        tile_counts[(r, c)] = float(tile_region.sum())
    return tile_counts

