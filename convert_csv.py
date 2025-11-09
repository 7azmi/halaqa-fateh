#!/usr/bin/env python3
import csv
from pathlib import Path

# --- CONFIG ---
BASE_DIR = Path("data/processed/1447")  # Only 1447
PERSON_FILE = "Person.csv"
DAILY_FILE = "DailyEntry.csv"

# --- Data holders ---
persons = {}  # (name, role) -> person_id
person_id_counter = 1
daily_entries = []
entry_id_counter = 1


def get_or_create_person(name, role):
    """Return person_id, creating if new."""
    global person_id_counter
    name = name.strip()
    if not name:
        return None
    key = (name, role)
    if key not in persons:
        persons[key] = person_id_counter
        person_id_counter += 1
    return persons[key]


def parse_value(val):
    """Convert numeric or 0 to float, ignore empty."""
    if val is None or val.strip() == "":
        return None
    try:
        return float(val)
    except ValueError:
        return None


# --- Process all CSVs in 1447 ---
for csv_file in sorted(BASE_DIR.glob("*.csv")):
    month = csv_file.stem  # e.g. "1", "2", ...
    print(f"Processing: {csv_file.name}")

    with open(csv_file, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = [r for r in reader if any(r)]

    if len(rows) < 3:
        continue

    header = rows[1]  # The second row holds "اسم الطالب", "العمر", "الأستاذ", "حفظ", "مراجعة", ...
    data_rows = rows[4:]  # Skip top empty/meta rows

    # Determine day columns (starting at index 3)
    day_indices = []
    for i in range(3, len(header), 2):
        day_num = (i - 3) // 2 + 1
        if i + 1 < len(header):
            day_indices.append((day_num, i, i + 1))

    for row in data_rows:
        if len(row) < 3:
            continue

        student_name = row[0].strip()
        teacher_name = row[2].strip()

        if not student_name or not teacher_name:
            continue

        student_id = get_or_create_person(student_name, "student")
        teacher_id = get_or_create_person(teacher_name, "teacher")

        for day_num, hifz_idx, mur_idx in day_indices:
            hifz_val = parse_value(row[hifz_idx]) if hifz_idx < len(row) else None
            mur_val = parse_value(row[mur_idx]) if mur_idx < len(row) else None

            # Skip if both are absent (None)
            if hifz_val is None and mur_val is None:
                continue

            entry_date = f"1447-{month.zfill(2)}-{str(day_num).zfill(2)}"
            daily_entries.append({
                "entry_id": entry_id_counter,
                "student_id": student_id,
                "teacher_id": teacher_id,
                "entry_date": entry_date,
                "hifz": hifz_val,
                "murajaah": mur_val
            })
            entry_id_counter += 1

# --- Write outputs ---
with open(PERSON_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["person_id", "name", "role"])
    for (name, role), pid in persons.items():
        writer.writerow([pid, name, role])

with open(DAILY_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["entry_id", "student_id", "teacher_id", "entry_date", "hifz", "murajaah"])
    writer.writeheader()
    writer.writerows(daily_entries)

print(f"\n✅ Done! Created {PERSON_FILE} and {DAILY_FILE}")
print(f"Persons: {len(persons)}, Daily Entries: {len(daily_entries)}")
