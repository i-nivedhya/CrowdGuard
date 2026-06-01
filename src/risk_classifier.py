# src/risk_classifier.py — assigns risk level to each tile
import config
 
def classify_tiles(tile_counts, venue):
    """
    Assign Green/Yellow/Red to each tile based on count and venue thresholds.
    Returns dict: {(row, col): ('green'|'yellow'|'red', (B,G,R color tuple))}
    """
    if venue not in config.VENUE_THRESHOLDS:
        venue = venue.lower()
    if venue not in config.VENUE_THRESHOLDS:
        venue = config.DEFAULT_VENUE.lower()
    yellow_thresh, red_thresh = config.VENUE_THRESHOLDS.get(venue, (6, 14))
    tile_risks = {}
    for tile, count in tile_counts.items():
        if count < yellow_thresh:
            tile_risks[tile] = ('green',  config.COLOR_GREEN)
        elif count < red_thresh:
            tile_risks[tile] = ('yellow', config.COLOR_YELLOW)
        else:
            tile_risks[tile] = ('red',    config.COLOR_RED)
    return tile_risks
 
def get_venue_list():
    """Returns list of available venue names for display/toggling."""
    return list(config.VENUE_THRESHOLDS.keys())
