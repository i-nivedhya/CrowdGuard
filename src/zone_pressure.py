# src/zone_pressure.py — weighted neighbor analysis
import config
 
def compute_zone_pressure(tile_counts):
    """
    For each tile compute a weighted zone pressure score:
    - Center tile weight: 2.0
    - Each of up to 8 neighboring tiles weight: 1.0
    This means a red tile surrounded by red tiles is scored much higher
    than an isolated red tile.
    Returns dict: {(row, col): pressure_score}
    """
    rows, cols = config.GRID_ROWS, config.GRID_COLS
    zone_pressure = {}
    for r in range(rows):
        for c in range(cols):
            center_count  = tile_counts[(r, c)]
            neighbor_sum  = 0
            neighbor_count = 0
            # Check all 8 surrounding tiles
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue  # skip center tile itself
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        neighbor_sum += tile_counts[(nr, nc)]
                        neighbor_count += 1
            # Weighted average: center counts double
            total_weight  = 2.0 + neighbor_count
            zone_pressure[(r, c)] = (center_count * 2.0 + neighbor_sum) / total_weight
    return zone_pressure
