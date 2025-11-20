#!/usr/bin/env python3
import csv
from pathlib import Path

# --- CONFIG ---
SOURCE_DIR = Path("data/processed")
DB_DIR = Path("data/database")
USERS_FILE = DB_DIR / "Users.csv"

# Ensure DB directory exists
DB_DIR.mkdir(parents=True, exist_ok=True)

# --- DATA HOLDERS ---
# users map: name -> {'id': int, 'role': str}
users = {}
next_student_id = 1
next_teacher_id = -1

# --- 1. Load Existing Users (if any) ---
if USERS_FILE.exists():
    print(f"📂 Loading existing users from {USERS_FILE}...")
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            uid = int(row["user_id"])
            name = row["name"]
            # Determine role based on ID sign
            if uid > 0:
                users[name] = {'id': uid, 'role': 'student'}
                if uid >= next_student_id: next_student_id = uid + 1
            else:
                users[name] = {'id': uid, 'role': 'teacher'}
                if uid <= next_teacher_id: next_teacher_id = uid - 1
    print(f"   Loaded {len(users)} users. Next Student ID: {next_student_id}, Next Teacher ID: {next_teacher_id}")


# --- HELPER FUNCTIONS ---
def get_or_create_user_id(name, role):
    global next_student_id, next_teacher_id
    name = name.strip()

    if name in users:
        return users[name]['id']

    if role == 'student':
        new_id = next_student_id
        next_student_id += 1
    elif role == 'teacher':
        new_id = next_teacher_id
        next_teacher_id -= 1
    else:
        raise ValueError(f"Unknown role: {role}")

    users[name] = {'id': new_id, 'role': role}
    return new_id


def parse_score(val):
    if val is None or val.strip() == "":
        return None
    try:
        return float(val)
    except ValueError:
        return None


# --- 2. Process All Files recursively ---
source_files = sorted(list(SOURCE_DIR.rglob("*.csv")))
print(f"\n🚀 Starting conversion of {len(source_files)} files...")

for src_file in source_files:
    try:
        year_dir = src_file.parent.name  # e.g., 1447
        month_name = src_file.stem  # e.g., 1

        # Prepare output directory: data/database/1447/
        target_dir = DB_DIR / year_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / f"{month_name}.csv"

        # Dictionary to handle uniqueness: Key = (student_id, teacher_id, day)
        month_entries = {}

        with open(src_file, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            rows = [r for r in reader if any(r)]

        if len(rows) < 3:
            continue

        header = rows[1]
        data_rows = rows[4:]

        # Map columns to days
        day_indices = []
        for col_idx in range(3, len(header), 2):
            day_num = (col_idx - 3) // 2 + 1
            if col_idx + 1 < len(header):
                day_indices.append((day_num, col_idx, col_idx + 1))

        for row in data_rows:
            if len(row) < 3: continue

            student_name = row[0].strip()
            teacher_name = row[2].strip()

            if not student_name or not teacher_name: continue

            s_id = get_or_create_user_id(student_name, 'student')
            t_id = get_or_create_user_id(teacher_name, 'teacher')

            for day_num, h_idx, m_idx in day_indices:
                h_val = parse_score(row[h_idx]) if h_idx < len(row) else None
                m_val = parse_score(row[m_idx]) if m_idx < len(row) else None

                if h_val is None and m_val is None:
                    continue

                # Composite Key Tuple (not saved to CSV, used for uniqueness only)
                key_tuple = (s_id, t_id, day_num)

                entry_data = {
                    "student_id": s_id,
                    "teacher_id": t_id,
                    "day": day_num,
                    "hifz": h_val,
                    "murajaah": m_val
                }

                # Insert into dict (overwrites previous if duplicate exists)
                month_entries[key_tuple] = entry_data

        # Write the Month CSV
        if month_entries:
            with open(target_file, "w", newline="", encoding="utf-8") as f:
                fieldnames = ["student_id", "teacher_id", "day", "hifz", "murajaah"]
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(month_entries.values())
            print(f"   ✅ Parsed {year_dir}/{month_name}: {len(month_entries)} entries saved.")

    except Exception as e:
        print(f"   ❌ Error processing {src_file}: {e}")

# --- 3. Save Users File ---
print(f"\n💾 Saving Users database to {USERS_FILE}...")
with open(USERS_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["user_id", "name", "birth_year"])

    sorted_users = sorted(users.items(), key=lambda x: x[1]['id'])

    for name, data in sorted_users:
        writer.writerow([data['id'], name, ""])

print("✨ All done.")