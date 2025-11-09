#!/usr/bin/env python3
import csv
from pathlib import Path

# --- CONFIG ---
BASE_DIR = Path("data/processed/1447")
PERSON_FILE = Path("Person.csv")
DAILY_FILE = Path("DailyEntry.csv")

# --- Data holders ---
persons = {}  # (name, role) -> person_id
daily_entries_set = set()  # (student_id, teacher_id, entry_date) to detect duplicates
person_id_counter = 1
entry_id_counter = 1

# --- Load existing Person.csv if exists ---
if PERSON_FILE.exists():
    with open(PERSON_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name, role, pid = row["name"], row["role"], int(row["person_id"])
            persons[(name, role)] = pid
        if persons:
            person_id_counter = max(persons.values()) + 1
    print(f"Loaded {len(persons)} existing persons")

# --- Load existing DailyEntry.csv if exists ---
if DAILY_FILE.exists():
    with open(DAILY_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (int(row["student_id"]), int(row["teacher_id"]), row["entry_date"])
            daily_entries_set.add(key)
        if daily_entries_set:
            entry_id_counter = max([int(row["entry_id"]) for row in csv.DictReader(open(DAILY_FILE))]) + 1
    print(f"Loaded {len(daily_entries_set)} existing daily entries")

# --- Helpers ---
def get_or_create_person(name, role):
    global person_id_counter
    key = (name.strip(), role)
    if key in persons:
        print(f"Person exists: {name} ({role}), skipping creation")
        return persons[key]
    persons[key] = person_id_counter
    print(f"Added person: {name} ({role}) -> id {person_id_counter}")
    person_id_counter += 1
    return persons[key]


def parse_value(val):
    if val is None or val.strip() == "":
        return None
    try:
        return float(val)
    except ValueError:
        return None


# --- Process CSVs ---
new_daily_entries = []

for csv_file in sorted(BASE_DIR.glob("*.csv")):
    month = csv_file.stem
    print(f"Processing: {csv_file.name}")

    with open(csv_file, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = [r for r in reader if any(r)]

    if len(rows) < 3:
        continue

    header = rows[1]
    data_rows = rows[4:]

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

            if hifz_val is None and mur_val is None:
                continue

            entry_date = f"1447-{month.zfill(2)}-{str(day_num).zfill(2)}"
            key = (student_id, teacher_id, entry_date)
            if key in daily_entries_set:
                print(f"DailyEntry exists for {student_name} on {entry_date}, skipping")
                continue

            daily_entries_set.add(key)
            new_daily_entries.append({
                "entry_id": entry_id_counter,
                "student_id": student_id,
                "teacher_id": teacher_id,
                "entry_date": entry_date,
                "hifz": hifz_val,
                "murajaah": mur_val
            })
            entry_id_counter += 1

# --- Write persons (overwrite existing) ---
with open(PERSON_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["person_id", "name", "role"])
    for (name, role), pid in persons.items():
        writer.writerow([pid, name, role])

# --- Append new daily entries ---
if new_daily_entries:
    write_header = not DAILY_FILE.exists()
    with open(DAILY_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["entry_id", "student_id", "teacher_id", "entry_date", "hifz", "murajaah"])
        if write_header:
            writer.writeheader()
        writer.writerows(new_daily_entries)

print(f"\n✅ Done!")
print(f"Persons: {len(persons)}, New Daily Entries added: {len(new_daily_entries)}")
