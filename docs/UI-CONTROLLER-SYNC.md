# UI ↔ Controller sync

How the UI (app.js) stays in sync with the Controller.

## Rule

- **Controller** = single source of truth for data, auth, time, and pending entries.
- **UI** = reads from Controller to render; writes to Controller on user actions. No localStorage/CSV/GitHub in app.js.

---

## 1. Hijri working date

| Direction | Flow |
|-----------|-----|
| **Controller → UI** | `Controller.get_selected_hijri_date()` → date pill, day label. `Controller.get_hijri_from_date(date)` → hidden inputs when navigating. `Controller.get_hijri_weekday_label(currentRealDate)` → weekday pill. |
| **UI → Controller** | Any date change (prev/next, Today, picker apply, or hidden input change) → set hidden inputs **and** `Controller.set_selected_hijri(day, month, year)`. |

**State**: Controller holds `selectedHijri` (day, month, year). UI holds hidden `hijri-day`, `hijri-month`, `hijri-year` and `currentRealDate` (used for weekday). Both are kept in sync whenever the user changes the date.

---

## 2. Teacher selection

| Direction | Flow |
|-----------|-----|
| **Controller → UI** | After `load_data()`, `teacherSelect.value = Controller.get_last_teacher_id()`. Teacher list from `Controller.get_teachers()`. |
| **UI → Controller** | On teacher select or teacher-button click → `Controller.set_last_teacher_id(id)`. |

**State**: Current selection is UI-only (`teacherSelect.value`). Controller only persists “last chosen” for next load.

---

## 3. Students list & daily entries

| Direction | Flow |
|-----------|-----|
| **Controller → UI** | `renderStudents()` uses `Controller.get_students()`, `Controller.get_pending_entries()`, `Controller.find_existing_entry(sid, tid, date)` to build list and fill hifz/muragaa values. |
| **UI → Controller** | On hifz/muragaa input or attend toggle → `collectFormToPending()` builds array from DOM and calls `Controller.set_pending_entries(newPending)`. Then `backgroundSyncIfPossible()` → `Controller.sync_data()`. |

**State**: List and values are fully driven by Controller; form is the editing surface and pushed back into Controller as pending.

---

## 4. Student–teacher mapping (الحلقة)

| Direction | Flow |
|-----------|-----|
| **Controller → UI** | `Controller.get_student_default_teacher_map()`, `Controller.get_teachers()` → chip label and dropdown options. |
| **UI → Controller** | On chip select change/blur → `Controller.set_student_teacher_overrides(overrides)`. |

---

## 5. Auth & settings

| Direction | Flow |
|-----------|-----|
| **Controller → UI** | `Controller.get_config().token` → token input. `Controller.get_archived_students()`, `get_archived_teachers()`, `get_students()`, `get_teachers()` → settings lists. |
| **UI → Controller** | Form submit → `Controller.store_github_token_locally(token)`, `Controller.clear_local_csv_cache()`. Archive buttons → `Controller.toggle_archived_student(id)` / `toggle_archived_teacher(id)`. |

---

## 6. Connection & sync

| Direction | Flow |
|-----------|-----|
| **Controller → UI** | `Controller.is_online()` → connection status banner. |
| **UI → Controller** | Online event → `Controller.sync_data()` (via `backgroundSyncIfPossible()`). |

---

## Summary table

| Area        | UI reads from Controller | UI writes to Controller |
|------------|---------------------------|---------------------------|
| Hijri date | get_selected_hijri_date, get_hijri_from_date, get_hijri_weekday_label | set_selected_hijri |
| Auth       | get_config, is_authenticated | store_github_token_locally, clear_local_csv_cache |
| Data       | get_students, get_teachers, get_daily_progress_rows, get_pending_entries, find_existing_entry | set_pending_entries, load_data (trigger) |
| Teacher    | get_last_teacher_id, get_teachers, get_student_default_teacher_map | set_last_teacher_id, set_student_teacher_overrides |
| Archive    | get_archived_students, get_archived_teachers | toggle_archived_student, toggle_archived_teacher |
| Sync       | is_online, get_pending_entries | sync_data (trigger) |
