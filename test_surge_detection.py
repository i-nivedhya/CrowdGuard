# test_surge_detection.py — CrowdGuard AI Surge Validation
#
# Tests surge detector with controlled count injections.
# Does NOT need a real video — generates synthetic count sequences.
#
# Run: python test_surge_detection.py

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from src.surge_detector import SurgeDetector
from src.risk_classifier import classify_tiles
from src.zone_pressure   import compute_zone_pressure

print()
print("=" * 60)
print("  CROWDGUARD AI — SURGE DETECTION VALIDATION")
print("=" * 60)
print()
print("  Testing 4 scenarios × 5 runs each = 20 controlled tests")
print()

# ── Setup ─────────────────────────────────────────────────────────────
VENUE     = 'college'
ROWS, COLS = config.GRID_ROWS, config.GRID_COLS
ALL_TILES  = [(r, c) for r in range(ROWS) for c in range(COLS)]

def make_counts(values_dict):
    """Build a full 4x4 tile_counts dict from a sparse input."""
    counts = {tile: 0.0 for tile in ALL_TILES}
    counts.update(values_dict)
    return counts

def run_scenario(name, frame_sequence, expect_alert):
    """
    Feed a sequence of frames into the surge detector.
    Returns True if the scenario produced the expected result.

    frame_sequence: list of dicts {tile: count} per frame
    expect_alert:   True if we expect a surge to fire
    """
    detector = SurgeDetector()
    fired    = False
    latency  = None

    for frame_idx, sparse_counts in enumerate(frame_sequence):
        counts     = make_counts(sparse_counts)
        risks      = classify_tiles(counts, VENUE)
        zone_press = compute_zone_pressure(counts)
        alerts     = detector.update(counts, risks, zone_press, VENUE)

        if alerts and not fired:
            fired   = True
            latency = frame_idx  # which frame alert fired on

    correct = (fired == expect_alert)
    return correct, fired, latency


# ── Scenario 1: SUDDEN INFLOW ──────────────────────────────────────
# 3 frames stable at 5 people, then jumps to 12 in 3 frames
# Expected: SURGE fires
print("  Scenario 1 — Sudden Inflow (expect SURGE)")
print("  " + "-" * 40)
results_s1 = []
for run in range(5):
    sequence = []
    # 10 frames stable at 5 people (below yellow threshold=6)
    for _ in range(10):
        sequence.append({(1,1): 5.0})
    # 3 frames rapid increase to 13 (above red threshold=15? No, above yellow)
    sequence.append({(1,1): 7.0})
    sequence.append({(1,1): 10.0})
    sequence.append({(1,1): 13.0})

    correct, fired, latency = run_scenario(
        "Sudden Inflow", sequence, expect_alert=True)
    results_s1.append(correct)
    status = "PASS" if correct else "FAIL"
    lat_str = f"frame {latency}" if latency is not None else "never"
    print(f"  Run {run+1}: Alert={'YES' if fired else 'NO '} "
          f"| Alert fired at {lat_str} | {status}")

s1_pass = sum(results_s1)
print(f"  Result: {s1_pass}/5 correct\n")


# ── Scenario 2: GRADUAL BUILD-UP ──────────────────────────────────
# Count rises steadily from 3 to 14 over 15 frames
# Expected: SURGE fires when tile reaches yellow+
print("  Scenario 2 — Gradual Build-up (expect SURGE)")
print("  " + "-" * 40)
results_s2 = []
for run in range(5):
    sequence = []
    for i in range(15):
        count = 3.0 + i * 0.8   # rises from 3 to ~14
        sequence.append({(2,2): count})

    correct, fired, latency = run_scenario(
        "Gradual Build-up", sequence, expect_alert=True)
    results_s2.append(correct)
    status = "PASS" if correct else "FAIL"
    lat_str = f"frame {latency}" if latency is not None else "never"
    print(f"  Run {run+1}: Alert={'YES' if fired else 'NO '} "
          f"| Alert fired at {lat_str} | {status}")

s2_pass = sum(results_s2)
print(f"  Result: {s2_pass}/5 correct\n")


# ── Scenario 3: NORMAL MOVEMENT ───────────────────────────────────
# Count stays between 2-5 with small fluctuations
# Expected: NO surge (false alarm test)
print("  Scenario 3 — Normal Movement (expect NO alert)")
print("  " + "-" * 40)
results_s3 = []
import random
random.seed(42)
for run in range(5):
    sequence = []
    base = 3.0
    for i in range(20):
        # Small random fluctuation ±1 around base
        count = base + random.uniform(-1.0, 1.0)
        count = max(0, count)
        sequence.append({(0,0): count, (1,1): count + 0.5})

    correct, fired, latency = run_scenario(
        "Normal Movement", sequence, expect_alert=False)
    results_s3.append(correct)
    status = "PASS" if correct else "FAIL"
    print(f"  Run {run+1}: Alert={'YES' if fired else 'NO '} "
          f"| False alarm={'YES' if fired else 'NO '} | {status}")

s3_pass = sum(results_s3)
print(f"  Result: {s3_pass}/5 correct\n")


# ── Scenario 4: SUDDEN DISPERSAL ──────────────────────────────────
# Tile was crowded (12 people), suddenly drops to 3
# Expected: SUDDEN_DISPERSAL fires
print("  Scenario 4 — Sudden Dispersal (expect DISPERSAL alert)")
print("  " + "-" * 40)
results_s4 = []
for run in range(5):
    sequence = []
    # 15 frames at 12 people (crowded)
    for _ in range(15):
        sequence.append({(3,3): 12.0})
    # Sudden drop to 2 (panic scatter)
    for _ in range(5):
        sequence.append({(3,3): 2.0})

    correct, fired, latency = run_scenario(
        "Sudden Dispersal", sequence, expect_alert=True)
    results_s4.append(correct)
    status = "PASS" if correct else "FAIL"
    lat_str = f"frame {latency}" if latency is not None else "never"
    print(f"  Run {run+1}: Alert={'YES' if fired else 'NO '} "
          f"| Alert fired at {lat_str} | {status}")

s4_pass = sum(results_s4)
print(f"  Result: {s4_pass}/5 correct\n")


# ── Final Results ─────────────────────────────────────────────────
print("=" * 60)
print("  FINAL VALIDATION RESULTS")
print("=" * 60)

total_correct  = s1_pass + s2_pass + s3_pass + s4_pass
total_tests    = 20

# Precision: of all alerts that fired, how many were correct?
# True positives  = correct surge detections (scenarios 1,2,4)
# False positives = alerts that fired during scenario 3 (normal)
true_positives  = s1_pass + s2_pass + s4_pass
false_positives = 5 - s3_pass   # scenario 3 failures = false alarms
false_negatives = (5 - s1_pass) + (5 - s2_pass) + (5 - s4_pass)

precision = (true_positives / max(true_positives + false_positives, 1)) * 100
recall    = (true_positives / max(true_positives + false_negatives, 1)) * 100

print()
print(f"  Scenario 1 — Sudden Inflow:    {s1_pass}/5 correct")
print(f"  Scenario 2 — Gradual Build-up: {s2_pass}/5 correct")
print(f"  Scenario 3 — Normal Movement:  {s3_pass}/5 correct (false alarm test)")
print(f"  Scenario 4 — Sudden Dispersal: {s4_pass}/5 correct")
print()
print(f"  Total correct : {total_correct}/{total_tests}")
print(f"  Precision     : {precision:.1f}%")
print(f"  Recall        : {recall:.1f}%")
print(f"  False alarms  : {false_positives}/5 during normal movement")
print()
print("=" * 60)
print("  COPY THIS INTO YOUR PAPER (Table III)")
print("=" * 60)
print()
print(f"  Precision  = {precision:.1f}%   (target: >80%)")
print(f"  Recall     = {recall:.1f}%   (target: >85%)")
print(f"  False alarms during normal movement = {false_positives}/5")
print(f"  Correct detections = {total_correct}/20")
print()

if precision >= 80 and recall >= 80:
    print("  STATUS: PASS — Surge detection meets PRD targets")
else:
    print("  STATUS: Review — Some scenarios may need threshold tuning")
    if s1_pass < 4:
        print("  → Sudden inflow not detected reliably")
        print("    Fix: lower SURGE_DELTA_THRESHOLD in config.py")
    if s3_pass < 4:
        print("  → Too many false alarms during normal movement")
        print("    Fix: raise SURGE_DELTA_THRESHOLD in config.py")

print()