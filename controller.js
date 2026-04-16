/**
 * Controller — single source of logic for halaqa-fateh.
 * All data, auth, time, sync, and CRUD operations live here.
 * UI (app.js) must only call Controller methods and render DOM.
 */

(function (global) {
  const LS_KEYS = {
    token: 'hf_github_token',
    pending: 'hf_pending_entries_v1',
    cacheMeta: 'hf_cache_meta_v1',
    dailyProgress: 'hf_daily_progress_csv_v1',
    students: 'hf_students_csv_v1',
    teachers: 'hf_teachers_csv_v1',
    lastTeacherId: 'hf_last_teacher_id',
    archivedStudents: 'hf_archived_students_v1',
    archivedTeachers: 'hf_archived_teachers_v1',
    studentTeacherOverrides: 'hf_student_teacher_overrides_v1',
  };

  const DEFAULT_OWNER = '7azmi';
  const DEFAULT_REPO = 'halaqa-fateh';
  const DEFAULT_BRANCH = 'main';

  const STUDENT_HEADERS = ['id', 'full_name', 'hijri_birth_year', 'hijri_enrollment_date', 'notes', 'state'];
  const TEACHER_HEADERS = ['id', 'full_name', 'status'];
  const DAILY_HEADERS = ['student_id', 'teacher_id', 'hifz', 'muragaa', 'hijri_date', 'notes'];

  /** @type {{ students: object[], teachers: object[], daily_progress: object[], student_default_teacher: Record<number, number> }} */
  let all_data = {
    students: [],
    teachers: [],
    daily_progress: [],
    student_default_teacher: {},
  };

  function safeJSONParse(value, fallback) {
    if (value == null || value === '') return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function parseCsv(text) {
    const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const result = [];
    let headers = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const cols = line.split(',');
      if (!headers) {
        headers = cols;
        continue;
      }
      const row = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] !== undefined ? cols[i] : '';
      });
      result.push(row);
    }
    return { headers: headers || [], rows: result };
  }

  function stringifyCsv(headers, rows) {
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const headerLine = headers.join(',');
    const lines = [headerLine];
    rows.forEach((r) => {
      const line = headers.map((h) => escape(r[h])).join(',');
      lines.push(line);
    });
    return lines.join('\n');
  }

  function getConfig() {
    return {
      token: localStorage.getItem(LS_KEYS.token) || '',
      owner: DEFAULT_OWNER,
      repo: DEFAULT_REPO,
      branch: DEFAULT_BRANCH,
    };
  }

  async function githubRequest(cfg, path, options = {}) {
    const url = `https://api.github.com${path}`;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `token ${cfg.token}`,
    };
    if (options.body && !options.headers) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: { ...headers, ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub: ${res.status} - ${text}`);
    }
    return res.json();
  }

  async function loadCsvFromRepo(cfg, filename) {
    const path = `/repos/${cfg.owner}/${cfg.repo}/contents/data/${filename}?ref=${cfg.branch}`;
    const json = await githubRequest(cfg, path);
    const binary = atob(json.content.replace(/\n/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const content = new TextDecoder('utf-8').decode(bytes);
    return { text: content, sha: json.sha };
  }

  function hijriFromDate(date) {
    try {
      const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      });
      const parts = formatter.formatToParts(date);
      const getPart = (type, fallback) => {
        const value = parts.find((p) => p.type === type)?.value;
        const n = value != null ? parseInt(value, 10) : NaN;
        return Number.isNaN(n) ? fallback : n;
      };
      const day = getPart('day', 1);
      const month = getPart('month', 1);
      const year = getPart('year', 1447);
      return { day, month, year };
    } catch (err) {
      console.error('Hijri date failed', date, err);
      return { day: 1, month: 1, year: 1447 };
    }
  }

  function toHijriString(day, month, year) {
    const d = String(parseInt(day, 10) || 1).padStart(2, '0');
    const m = String(parseInt(month, 10) || 1).padStart(2, '0');
    const y = String(year || 1447);
    return `${d}/${m}/${y}`;
  }

  // ---- Selected date (UI working date) ----
  let selectedHijri = hijriFromDate(new Date());

  // ============ Public API (README) ============

  function is_online() {
    return typeof navigator !== 'undefined' && navigator.onLine === true;
  }

  function get_current_local_hijri_date() {
    const h = hijriFromDate(new Date());
    return toHijriString(h.day, h.month, h.year);
  }

  function get_current_online_hijri_date() {
    return get_current_local_hijri_date();
  }

  function get_current_hijri_date() {
    return is_online() ? get_current_online_hijri_date() : get_current_local_hijri_date();
  }

  function store_github_token_locally(token) {
    if (token != null) localStorage.setItem(LS_KEYS.token, String(token).trim());
  }

  function is_authenticated() {
    const cfg = getConfig();
    return !!cfg.token;
  }

  function sync_data() {
    if (!is_online()) return;
    const cfg = getConfig();
    if (!cfg.token) return;
    const pending = get_pending_entries();
    if (!pending.length) return;
    return sync_pending_to_repo(cfg);
  }

  function load_data() {
    const cfg = getConfig();
    if (!cfg.token) return Promise.resolve();
    let studentsCsv = localStorage.getItem(LS_KEYS.students);
    let teachersCsv = localStorage.getItem(LS_KEYS.teachers);
    let progressCsv = null;

    if (is_online()) {
      return Promise.all([
        loadCsvFromRepo(cfg, 'students.csv').catch(() => null),
        loadCsvFromRepo(cfg, 'teachers.csv').catch(() => null),
        loadCsvFromRepo(cfg, 'daily_progress.csv').catch(() => null),
      ]).then(([sFile, tFile, pFile]) => {
        if (sFile) {
          studentsCsv = sFile.text;
          localStorage.setItem(LS_KEYS.students, studentsCsv);
        }
        if (tFile) {
          teachersCsv = tFile.text;
          localStorage.setItem(LS_KEYS.teachers, teachersCsv);
        }
        if (pFile) {
          progressCsv = pFile.text;
          localStorage.setItem(LS_KEYS.dailyProgress, progressCsv);
        }
        apply_csv_to_all_data(studentsCsv, teachersCsv, progressCsv);
      });
    }

    if (!progressCsv) progressCsv = localStorage.getItem(LS_KEYS.dailyProgress);
    if (studentsCsv || teachersCsv || progressCsv) {
      apply_csv_to_all_data(studentsCsv, teachersCsv, progressCsv);
      return Promise.resolve();
    }
    return Promise.resolve();
  }

  function apply_csv_to_all_data(studentsCsv, teachersCsv, progressCsv) {
    const archivedStudentIds = new Set(
      (safeJSONParse(localStorage.getItem(LS_KEYS.archivedStudents), []) || []).map((id) => parseInt(id, 10))
    );
    const archivedTeacherIds = new Set(
      (safeJSONParse(localStorage.getItem(LS_KEYS.archivedTeachers), []) || []).map((id) => parseInt(id, 10))
    );

    if (studentsCsv) {
      const sParsed = parseCsv(studentsCsv);
      all_data.students = (sParsed.rows || []).map((r) => ({
        id: parseInt(r.id, 10),
        full_name: r.full_name || '',
        hijri_birth_year: r.hijri_birth_year || '',
        hijri_enrollment_date: r.hijri_enrollment_date || '',
        notes: r.notes || '',
        state: r.state || 'Active',
      })).filter((s) => !archivedStudentIds.has(s.id));
    }
    if (teachersCsv) {
      const tParsed = parseCsv(teachersCsv);
      all_data.teachers = (tParsed.rows || []).map((r) => ({
        id: parseInt(r.id, 10),
        full_name: r.full_name || '',
        status: r.status || 'Active',
      })).filter((t) => !archivedTeacherIds.has(t.id));
    }
    if (progressCsv) {
      const pParsed = parseCsv(progressCsv);
      all_data.daily_progress = pParsed.rows || [];
      const countsByStudent = {};
      all_data.daily_progress.forEach((r) => {
        const sid = parseInt(r.student_id || '0', 10);
        const tid = parseInt(r.teacher_id || '0', 10);
        if (!sid || !tid) return;
        if (!countsByStudent[sid]) countsByStudent[sid] = {};
        countsByStudent[sid][tid] = (countsByStudent[sid][tid] || 0) + 1;
      });
      all_data.student_default_teacher = {};
      Object.keys(countsByStudent).forEach((sidStr) => {
        const sid = parseInt(sidStr, 10);
        const teacherCounts = countsByStudent[sid];
        let bestTid = null;
        let bestCount = -1;
        Object.keys(teacherCounts).forEach((tidStr) => {
          const c = teacherCounts[tidStr];
          if (c > bestCount) {
            bestCount = c;
            bestTid = parseInt(tidStr, 10);
          }
        });
        if (bestTid) all_data.student_default_teacher[sid] = bestTid;
      });
      const overrides = get_student_teacher_overrides();
      Object.keys(overrides || {}).forEach((sidStr) => {
        const sid = parseInt(sidStr, 10);
        const tid = parseInt(overrides[sidStr], 10);
        if (sid && tid) all_data.student_default_teacher[sid] = tid;
      });
    }
  }

  async function sync_pending_to_repo(cfg) {
    const pending = get_pending_entries();
    if (!pending.length) return;
    try {
      const file = await loadCsvFromRepo(cfg, 'daily_progress.csv');
      const parsed = parseCsv(file.text);
      const existingRows = parsed.rows || [];
      const headers = parsed.headers && parsed.headers.length ? parsed.headers : DAILY_HEADERS;
      const indexByKey = new Map();
      existingRows.forEach((r, idx) => {
        indexByKey.set(`${r.student_id}|${r.teacher_id}|${r.hijri_date}`, idx);
      });
      pending.forEach((p) => {
        const key = `${p.student_id}|${p.teacher_id}|${p.hijri_date}`;
        const row = {
          student_id: String(p.student_id),
          teacher_id: String(p.teacher_id),
          hifz: String(p.hifz != null ? p.hifz : 0),
          muragaa: String(p.muragaa != null ? p.muragaa : 0),
          hijri_date: p.hijri_date,
          notes: p.notes || '',
        };
        if (indexByKey.has(key)) {
          existingRows[indexByKey.get(key)] = row;
        } else {
          existingRows.push(row);
        }
      });
      const newContent = stringifyCsv(headers, existingRows);
      const b64 = btoa(unescape(encodeURIComponent(newContent)));
      await githubRequest(cfg, `/repos/${cfg.owner}/${cfg.repo}/contents/data/daily_progress.csv`, {
        method: 'PUT',
        body: {
          message: 'Add daily progress entries from حلقة الفتح tool',
          content: b64,
          sha: file.sha,
          branch: cfg.branch,
        },
      });
      set_pending_entries([]);
      all_data.daily_progress = existingRows;
    } catch (err) {
      console.error('sync_pending_to_repo', err);
      throw err;
    }
  }

  function create_student(payload) {
    if (!payload || typeof payload !== 'object') return;
    const allowed = new Set(STUDENT_HEADERS);
    const row = {};
    STUDENT_HEADERS.forEach((h) => {
      row[h] = allowed.has(h) && payload[h] !== undefined ? String(payload[h]) : (h === 'state' ? 'Active' : '');
    });
    const cfg = getConfig();
    if (!cfg.token) return;
    const studentsCsv = localStorage.getItem(LS_KEYS.students) || '';
    const parsed = parseCsv(studentsCsv);
    const headers = parsed.headers && parsed.headers.length ? parsed.headers : STUDENT_HEADERS;
    const rows = parsed.rows || [];
    const nextId = rows.length ? Math.max(...rows.map((r) => parseInt(r.id, 10) || 0)) + 1 : 1;
    row.id = String(nextId);
    if (!row.state) row.state = 'Active';
    rows.push(row);
    const newCsv = stringifyCsv(headers, rows);
    localStorage.setItem(LS_KEYS.students, newCsv);
    all_data.students.push({
      id: nextId,
      full_name: row.full_name,
      hijri_birth_year: row.hijri_birth_year || '',
      hijri_enrollment_date: row.hijri_enrollment_date || '',
      notes: row.notes || '',
      state: row.state || 'Active',
    });
  }

  function create_teacher(payload) {
    if (!payload || typeof payload !== 'object') return;
    const row = {};
    TEACHER_HEADERS.forEach((h) => {
      row[h] = payload[h] !== undefined ? String(payload[h]) : (h === 'status' ? 'Active' : '');
    });
    const cfg = getConfig();
    if (!cfg.token) return;
    const teachersCsv = localStorage.getItem(LS_KEYS.teachers) || '';
    const parsed = parseCsv(teachersCsv);
    const headers = parsed.headers && parsed.headers.length ? parsed.headers : TEACHER_HEADERS;
    const rows = parsed.rows || [];
    const nextId = rows.length ? Math.max(...rows.map((r) => parseInt(r.id, 10) || 0)) + 1 : 1;
    row.id = String(nextId);
    if (!row.status) row.status = 'Active';
    rows.push(row);
    const newCsv = stringifyCsv(headers, rows);
    localStorage.setItem(LS_KEYS.teachers, newCsv);
    all_data.teachers.push({
      id: nextId,
      full_name: row.full_name,
      status: row.status || 'Active',
    });
  }

  function update_student(id, header_name, value) {
    if (!STUDENT_HEADERS.includes(header_name)) return;
    const studentsCsv = localStorage.getItem(LS_KEYS.students) || '';
    const parsed = parseCsv(studentsCsv);
    const headers = parsed.headers && parsed.headers.length ? parsed.headers : STUDENT_HEADERS;
    const rows = parsed.rows || [];
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) return;
    row[header_name] = value !== undefined ? String(value) : '';
    const newCsv = stringifyCsv(headers, rows);
    localStorage.setItem(LS_KEYS.students, newCsv);
    const s = all_data.students.find((x) => x.id === parseInt(id, 10));
    if (s && s.hasOwnProperty(header_name)) s[header_name] = value !== undefined ? String(value) : '';
  }

  function update_teacher(id, header_name, value) {
    if (!TEACHER_HEADERS.includes(header_name)) return;
    const teachersCsv = localStorage.getItem(LS_KEYS.teachers) || '';
    const parsed = parseCsv(teachersCsv);
    const headers = parsed.headers && parsed.headers.length ? parsed.headers : TEACHER_HEADERS;
    const rows = parsed.rows || [];
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) return;
    row[header_name] = value !== undefined ? String(value) : '';
    const newCsv = stringifyCsv(headers, rows);
    localStorage.setItem(LS_KEYS.teachers, newCsv);
    const t = all_data.teachers.find((x) => x.id === parseInt(id, 10));
    if (t && t.hasOwnProperty(header_name)) t[header_name] = value !== undefined ? String(value) : '';
  }

  function create_daily_entry(student_id, teacher_id, hijri_date, hifz, muragaa, notes) {
    const h = Number(hifz);
    const m = Number(muragaa);
    const entry = {
      student_id: parseInt(student_id, 10),
      teacher_id: parseInt(teacher_id, 10),
      hifz: Number.isNaN(h) ? 0 : h,
      muragaa: Number.isNaN(m) ? 0 : m,
      hijri_date: String(hijri_date || ''),
      notes: notes != null ? String(notes) : '',
    };
    const pending = get_pending_entries();
    const key = `${entry.student_id}|${entry.teacher_id}|${entry.hijri_date}`;
    const without = pending.filter((p) => `${p.student_id}|${p.teacher_id}|${p.hijri_date}` !== key);
    without.push(entry);
    set_pending_entries(without);
  }

  function update_daily_entry(student_id, teacher_id, hijri_date, hifz, muragaa, notes) {
    create_daily_entry(student_id, teacher_id, hijri_date, hifz, muragaa, notes);
  }

  // ---- Helpers for UI (still logic, so in controller) ----

  function get_pending_entries() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.pending), []);
  }

  function set_pending_entries(entries) {
    localStorage.setItem(LS_KEYS.pending, JSON.stringify(entries || []));
  }

  function find_existing_entry(studentId, teacherId, date) {
    if (!teacherId) return null;
    const pending = get_pending_entries();
    const fromPending = pending.find(
      (p) =>
        String(p.student_id) === String(studentId) &&
        String(p.teacher_id) === String(teacherId) &&
        p.hijri_date === date
    );
    if (fromPending) return fromPending;
    const fromStored = all_data.daily_progress.find(
      (r) =>
        String(r.student_id) === String(studentId) &&
        String(r.teacher_id) === String(teacherId) &&
        r.hijri_date === date
    );
    if (!fromStored) return null;
    return {
      student_id: parseInt(fromStored.student_id || studentId, 10),
      teacher_id: parseInt(fromStored.teacher_id || teacherId, 10),
      hifz: fromStored.hifz,
      muragaa: fromStored.muragaa,
      hijri_date: fromStored.hijri_date,
      notes: fromStored.notes || '',
    };
  }

  function get_student_default_teacher_map() {
    return all_data.student_default_teacher;
  }

  function get_student_teacher_overrides() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.studentTeacherOverrides), {}) || {};
  }

  function set_student_teacher_overrides(overrides) {
    localStorage.setItem(LS_KEYS.studentTeacherOverrides, JSON.stringify(overrides || {}));
    Object.keys(overrides || {}).forEach((sidStr) => {
      const sid = parseInt(sidStr, 10);
      const tid = parseInt(overrides[sidStr], 10);
      if (sid && tid) all_data.student_default_teacher[sid] = tid;
    });
  }

  function get_students() {
    return all_data.students;
  }

  function get_teachers() {
    return all_data.teachers;
  }

  function get_daily_progress_rows() {
    return all_data.daily_progress;
  }

  function get_selected_hijri_date() {
    return toHijriString(selectedHijri.day, selectedHijri.month, selectedHijri.year);
  }

  function set_selected_hijri(day, month, year) {
    selectedHijri = {
      day: parseInt(day, 10) || 1,
      month: parseInt(month, 10) || 1,
      year: parseInt(year, 10) || 1447,
    };
  }

  function get_hijri_from_date(date) {
    return hijriFromDate(date || new Date());
  }

  function get_hijri_weekday_label(date) {
    try {
      const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { weekday: 'long' });
      return formatter.format(date || new Date());
    } catch {
      return '';
    }
  }

  function get_config() {
    return getConfig();
  }

  function get_last_teacher_id() {
    return localStorage.getItem(LS_KEYS.lastTeacherId) || '';
  }

  function set_last_teacher_id(id) {
    if (id != null) localStorage.setItem(LS_KEYS.lastTeacherId, String(id));
  }

  function get_archived_students() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.archivedStudents), []) || [];
  }

  function set_archived_students(ids) {
    localStorage.setItem(LS_KEYS.archivedStudents, JSON.stringify(ids || []));
  }

  function get_archived_teachers() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.archivedTeachers), []) || [];
  }

  function set_archived_teachers(ids) {
    localStorage.setItem(LS_KEYS.archivedTeachers, JSON.stringify(ids || []));
  }

  function toggle_archived_student(id) {
    const ids = new Set(get_archived_students().map((i) => String(i)));
    const sid = String(id);
    if (ids.has(sid)) ids.delete(sid);
    else ids.add(sid);
    set_archived_students(Array.from(ids));
  }

  function toggle_archived_teacher(id) {
    const ids = new Set(get_archived_teachers().map((i) => String(i)));
    const tid = String(id);
    if (ids.has(tid)) ids.delete(tid);
    else ids.add(tid);
    set_archived_teachers(Array.from(ids));
  }

  function clear_local_csv_cache() {
    localStorage.setItem(LS_KEYS.students, '');
    localStorage.setItem(LS_KEYS.teachers, '');
    localStorage.setItem(LS_KEYS.dailyProgress, '');
  }

  const Controller = {
    is_online: is_online,
    get_current_hijri_date: get_current_hijri_date,
    get_current_online_hijri_date: get_current_online_hijri_date,
    get_current_local_hijri_date: get_current_local_hijri_date,
    store_github_token_locally: store_github_token_locally,
    is_authenticated: is_authenticated,
    sync_data: sync_data,
    load_data: load_data,
    create_student: create_student,
    create_teacher: create_teacher,
    update_student: update_student,
    update_teacher: update_teacher,
    create_daily_entry: create_daily_entry,
    update_daily_entry: update_daily_entry,
    get_pending_entries: get_pending_entries,
    set_pending_entries: set_pending_entries,
    find_existing_entry: find_existing_entry,
    get_student_default_teacher_map: get_student_default_teacher_map,
    get_student_teacher_overrides: get_student_teacher_overrides,
    set_student_teacher_overrides: set_student_teacher_overrides,
    get_students: get_students,
    get_teachers: get_teachers,
    get_daily_progress_rows: get_daily_progress_rows,
    get_selected_hijri_date: get_selected_hijri_date,
    set_selected_hijri: set_selected_hijri,
    get_hijri_from_date: get_hijri_from_date,
    get_hijri_weekday_label: get_hijri_weekday_label,
    get_config: get_config,
    get_last_teacher_id: get_last_teacher_id,
    set_last_teacher_id: set_last_teacher_id,
    get_archived_students: get_archived_students,
    set_archived_students: set_archived_students,
    get_archived_teachers: get_archived_teachers,
    set_archived_teachers: set_archived_teachers,
    toggle_archived_student: toggle_archived_student,
    toggle_archived_teacher: toggle_archived_teacher,
    clear_local_csv_cache: clear_local_csv_cache,
    get all_data() {
      return all_data;
    },
  };

  global.Controller = Controller;
})(typeof window !== 'undefined' ? window : this);
