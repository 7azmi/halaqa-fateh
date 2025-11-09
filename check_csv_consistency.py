#!/usr/bin/env python3
import csv
from pathlib import Path

# --- CONFIG ---
BASE_DIR = Path("data/processed")

# This is the expected header structure (second row in your clean CSV)
EXPECTED_HEADER_START = ["اسم الطالب", "العمر", "الأستاذ"]  # the first 3 columns
EXPECTED_DAY_COLUMNS = 30  # number of day pairs (حفظ/مراجعة)

def build_expected_header():
    header = EXPECTED_HEADER_START.copy()
    for day in range(1, EXPECTED_DAY_COLUMNS + 1):
        header.extend(["حفظ", "مراجعة"])
    return header

EXPECTED_HEADER = build_expected_header()

# --- Scan all CSV files ---
all_csvs = list(BASE_DIR.rglob("*.csv"))
consistent_files = []
inconsistent_files = []

for csv_file in all_csvs:
    try:
        with open(csv_file, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            rows = [r for r in reader if any(r)]
            if len(rows) < 2:
                inconsistent_files.append((csv_file, "Too few rows"))
                continue
            header = rows[1]
            # Normalize: strip all headers
            header = [h.strip() for h in header if h is not None]
            # Compare start + day columns length
            if header[:3] != EXPECTED_HEADER_START or len(header) != len(EXPECTED_HEADER):
                inconsistent_files.append((csv_file, "Header mismatch"))
            else:
                consistent_files.append(csv_file)
    except Exception as e:
        inconsistent_files.append((csv_file, f"Error reading file: {e}"))

# --- Report ---
print(f"\n✅ Checked {len(all_csvs)} CSV files")
print(f"Consistent files: {len(consistent_files)}")
print(f"Inconsistent files: {len(inconsistent_files)}\n")

if inconsistent_files:
    print("Inconsistent CSVs:")
    for f, reason in inconsistent_files:
        print(f" - {f}: {reason}")
