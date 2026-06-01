# server/crud.py — CrowdGuard v3.0 Database Operations
# Column names match actual PostgreSQL schema:
#   crowd_snapshots : id, venue_id, timestamp, total_count, css, tile_data
#   alert_events    : id, venue_id, timestamp, alert_type, severity, tile, css_at_alert, resolved_at, duration_secs, recommendations

from sqlalchemy.orm import Session
from sqlalchemy import text
import json


# ─────────────────────────────────────────────
# SAVE OPERATIONS
# ─────────────────────────────────────────────

def save_snapshot(db, venue_id, total_count, css, tile_counts, tile_risks):
    """Save one crowd snapshot to the database."""
    try:
        tile_data = json.dumps({
            "tile_counts": tile_counts,
            "tile_risks" : tile_risks
        })
        db.execute(text("""
            INSERT INTO crowd_snapshots (venue_id, total_count, css, tile_data, timestamp)
            VALUES (:venue_id, :total_count, :css, :tile_data, NOW())
        """), {
            "venue_id"   : venue_id,
            "total_count": total_count,
            "css"        : css,
            "tile_data"  : tile_data,
        })
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[CRUD] save_snapshot error: {e}")


def save_alert(db, venue_id, alert_type, severity, tile, css, message=""):
    """Save one alert event to the database."""
    try:
        db.execute(text("""
            INSERT INTO alert_events (venue_id, alert_type, severity, tile, css_at_alert, timestamp)
            VALUES (:venue_id, :alert_type, :severity, :tile, :css, NOW())
        """), {
            "venue_id"  : venue_id,
            "alert_type": alert_type,
            "severity"  : severity,
            "tile"      : str(tile)[:8],   # column is varchar(8)
            "css"       : css,
        })
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[CRUD] save_alert error: {e}")


# ─────────────────────────────────────────────
# HISTORICAL ANALYTICS QUERIES
# ─────────────────────────────────────────────

def get_css_history(db, venue_id, minutes=60):
    """CSS values over the last N minutes — used for timeline chart."""
    try:
        rows = db.execute(text("""
            SELECT timestamp, css, total_count
            FROM crowd_snapshots
            WHERE venue_id = :venue_id
              AND timestamp >= NOW() - (:minutes * INTERVAL '1 minute')
            ORDER BY timestamp ASC
        """), {"venue_id": venue_id, "minutes": minutes}).fetchall()
        return [
            {
                "timestamp"  : row[0].isoformat(),
                "css"        : round(float(row[1]), 1),
                "total_count": int(row[2]),
            }
            for row in rows
        ]
    except Exception as e:
        print(f"[CRUD] get_css_history error: {e}")
        return []


def get_alert_history(db, venue_id, limit=50):
    """Recent alert history for a venue."""
    try:
        rows = db.execute(text("""
            SELECT timestamp, alert_type, severity, tile, css_at_alert
            FROM alert_events
            WHERE venue_id = :venue_id
            ORDER BY timestamp DESC
            LIMIT :limit
        """), {"venue_id": venue_id, "limit": limit}).fetchall()
        return [
            {
                "timestamp": row[0].isoformat(),
                "type"     : row[1],
                "severity" : row[2],
                "tile"     : row[3],
                "css"      : round(float(row[4]), 1),
                "message"  : "",
            }
            for row in rows
        ]
    except Exception as e:
        print(f"[CRUD] get_alert_history error: {e}")
        return []


def get_venue_stats(db, venue_id, hours=24):
    """Summary statistics for a venue over the last N hours."""
    try:
        s = db.execute(text("""
            SELECT MAX(css), AVG(css), MAX(total_count), AVG(total_count), COUNT(*)
            FROM crowd_snapshots
            WHERE venue_id = :venue_id
              AND timestamp >= NOW() - (:hours * INTERVAL '1 hour')
        """), {"venue_id": venue_id, "hours": hours}).fetchone()

        alert_count = db.execute(text("""
            SELECT COUNT(*) FROM alert_events
            WHERE venue_id = :venue_id
              AND timestamp >= NOW() - (:hours * INTERVAL '1 hour')
        """), {"venue_id": venue_id, "hours": hours}).scalar()

        top = db.execute(text("""
            SELECT alert_type, COUNT(*) AS cnt FROM alert_events
            WHERE venue_id = :venue_id
              AND timestamp >= NOW() - (:hours * INTERVAL '1 hour')
            GROUP BY alert_type ORDER BY cnt DESC LIMIT 1
        """), {"venue_id": venue_id, "hours": hours}).fetchone()

        return {
            "peak_css"       : round(float(s[0] or 0), 1),
            "avg_css"        : round(float(s[1] or 0), 1),
            "peak_count"     : int(s[2] or 0),
            "avg_count"      : round(float(s[3] or 0), 1),
            "total_snapshots": int(s[4] or 0),
            "total_alerts"   : int(alert_count or 0),
            "top_alert_type" : top[0] if top else "None",
            "hours_analyzed" : hours,
        }
    except Exception as e:
        print(f"[CRUD] get_venue_stats error: {e}")
        return {}


def get_hotspot_tiles(db, venue_id, hours=24):
    """Which tiles triggered the most alerts."""
    try:
        rows = db.execute(text("""
            SELECT tile,
                   SUM(CASE WHEN severity='CRITICAL' THEN 1 ELSE 0 END) AS critical_count,
                   SUM(CASE WHEN severity='HIGH'     THEN 1 ELSE 0 END) AS high_count,
                   COUNT(*) AS total
            FROM alert_events
            WHERE venue_id = :venue_id
              AND timestamp >= NOW() - (:hours * INTERVAL '1 hour')
            GROUP BY tile
            ORDER BY critical_count DESC, high_count DESC
            LIMIT 10
        """), {"venue_id": venue_id, "hours": hours}).fetchall()
        return [
            {
                "tile"          : row[0],
                "critical_count": int(row[1]),
                "high_count"    : int(row[2]),
                "total_alerts"  : int(row[3]),
            }
            for row in rows
        ]
    except Exception as e:
        print(f"[CRUD] get_hotspot_tiles error: {e}")
        return []


def get_snapshots_for_venue(db, venue_id, limit=100):
    """Recent snapshots for incident replay."""
    try:
        rows = db.execute(text("""
            SELECT timestamp, total_count, css, tile_data
            FROM crowd_snapshots
            WHERE venue_id = :venue_id
            ORDER BY timestamp DESC
            LIMIT :limit
        """), {"venue_id": venue_id, "limit": limit}).fetchall()
        return [
            {
                "timestamp"  : row[0].isoformat(),
                "total_count": int(row[1]),
                "css"        : round(float(row[2]), 1),
                "tile_data"  : json.loads(row[3]) if row[3] else {},
            }
            for row in rows
        ]
    except Exception as e:
        print(f"[CRUD] get_snapshots error: {e}")
        return []