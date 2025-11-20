#!/usr/bin/env python3
import csv
from pathlib import Path

# --- CONFIG ---
BASE_DIR = Path("data/processed")

# Expected Source Header Structure
EXPECTED_HEADER_START = ["اسم الطالب", "العمر", "الأستاذ"]
EXPECTED_DAY_COLUMNS = 30


def build_expected_header():
    header = EXPECTED_HEADER_START.copy()
    for day in range(1, EXPECTED_DAY_COLUMNS + 1):
        header.extend(["حفظ", "مراجعة"])
    return header


EXPECTED_HEADER = build_expected_header()

# --- Scan ---
print(f"🔍 Scanning directory: {BASE_DIR.resolve()}")
all_csvs = sorted(list(BASE_DIR.rglob("*.csv")))

consistent_files = []
inconsistent_files = []

for csv_file in all_csvs:
    try:
        path_parts = csv_file.parts
        if len(path_parts) >= 2:
            year_folder = path_parts[-2]
            month_file = path_parts[-1]

        with open(csv_file, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            rows = [r for r in reader if any(r)]

            if len(rows) < 2:
                inconsistent_files.append((csv_file, "Too few rows"))
                continue

            header = rows[1]
            header = [h.strip() for h in header if h is not None]

            start_match = header[:3] == EXPECTED_HEADER_START
            len_match = len(header) == len(EXPECTED_HEADER)

            if not start_match:
                inconsistent_files.append((csv_file, f"Header start mismatch: {header[:3]}"))
            elif not len_match:
                inconsistent_files.append((csv_file, f"Col count mismatch: {len(header)} vs {len(EXPECTED_HEADER)}"))
            else:
                consistent_files.append(csv_file)

    except Exception as e:
        inconsistent_files.append((csv_file, f"Read Error: {e}"))

# --- Report ---
print(f"\n✅ Checked {len(all_csvs)} CSV files.")
print(f"Consistent files: {len(consistent_files)}")
print(f"Inconsistent files: {len(inconsistent_files)}\n")

if inconsistent_files:
    print("⚠️  Inconsistent CSVs found:")
    for f, reason in inconsistent_files:
        print(f" - {f}: {reason}")
else:
    print("🎉 All files are consistent.")