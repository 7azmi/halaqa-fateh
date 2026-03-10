(() => {
  const LS_KEYS = {
    token: 'hf_github_token',
    pending: 'hf_pending_entries_v1',
    cacheMeta: 'hf_cache_meta_v1',
    students: 'hf_students_csv_v1',
    teachers: 'hf_teachers_csv_v1',
    lastTeacherId: 'hf_last_teacher_id',
  };

  const DEFAULT_OWNER = '7azmi';
  const DEFAULT_REPO = 'halaqa-fateh';
  const DEFAULT_BRANCH = 'main';

  const authView = document.getElementById('auth-view');
  const appView = document.getElementById('app-view');
  const connectionStatus = document.getElementById('connection-status');

  const authForm = document.getElementById('auth-form');
  const tokenInput = document.getElementById('token-input');

  const teacherSelect = document.getElementById('teacher-select');
  const hijriDayInput = document.getElementById('hijri-day');
  const hijriMonthInput = document.getElementById('hijri-month');
  const hijriYearInput = document.getElementById('hijri-year');
  const loadDayBtn = document.getElementById('load-day-btn');
  const clearDayBtn = document.getElementById('clear-day-btn');

  const studentsListEl = document.getElementById('students-list');
  const studentsCountLabel = document.getElementById('students-count-label');
  const toggleEmptyBtn = document.getElementById('toggle-empty-btn');

  const presentCountEl = document.getElementById('present-count');
  const pendingCountEl = document.getElementById('pending-count');
  const saveLocalBtn = document.getElementById('save-local-btn');
  const syncBtn = document.getElementById('sync-btn');
  const openSettingsBtn = document.getElementById('open-settings-btn');

  const toastEl = document.getElementById('toast');

  let students = [];
  let teachers = [];
  let showOnlyWithValues = false;

  function showToast(message) {
    toastEl.innerHTML = `<div class=\"toast-inner\">${message}</div>`;
    toastEl.classList.add('visible');
    setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 3500);
  }

  function setConnectionStatus(online) {
    if (online) {
      connectionStatus.textContent = 'متصل بالإنترنت';
      connectionStatus.classList.remove('offline');
      connectionStatus.classList.add('online');
    } else {
      connectionStatus.textContent = 'لا يوجد اتصال بالإنترنت - يمكن المتابعة والعمل محليًا';
      connectionStatus.classList.remove('online');
      connectionStatus.classList.add('offline');
    }
  }

  function safeJSONParse(value, fallback) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function getConfig() {
    return {
      token: localStorage.getItem(LS_KEYS.token) || '',
      owner: DEFAULT_OWNER,
      repo: DEFAULT_REPO,
      branch: DEFAULT_BRANCH,
    };
  }

  function saveConfig(cfg) {
    localStorage.setItem(LS_KEYS.token, cfg.token);
  }

  function getPendingEntries() {
    return safeJSONParse(localStorage.getItem(LS_KEYS.pending), []);
  }

  function savePendingEntries(entries) {
    localStorage.setItem(LS_KEYS.pending, JSON.stringify(entries));
    pendingCountEl.textContent = `سجلات غير مُرسَلة: ${entries.length}`;
  }

  function getCurrentHijriDate() {
    const now = new Date();
    const approxYear = 1447;
    const approxMonth = 8;
    const approxDay = now.getDate();
    return { day: approxDay, month: approxMonth, year: approxYear };
  }

  function ensureHijriInputsDefault() {
    if (!hijriDayInput.value || !hijriMonthInput.value || !hijriYearInput.value) {
      const d = getCurrentHijriDate();
      hijriDayInput.value = d.day;
      hijriMonthInput.value = d.month;
      hijriYearInput.value = d.year;
    }
  }

  function getCurrentHijriString() {
    const day = String(parseInt(hijriDayInput.value || '1', 10)).padStart(2, '0');
    const month = String(parseInt(hijriMonthInput.value || '1', 10)).padStart(2, '0');
    const year = hijriYearInput.value || '1447';
    return `${day}/${month}/${year}`;
  }

  function getSelectedTeacherId() {
    const val = teacherSelect.value;
    return val ? parseInt(val, 10) : null;
  }

  function buildStudentRow(stu) {
    const row = document.createElement('div');
    row.className = 'student-row';
    row.dataset.studentId = String(stu.id);

    const nameCol = document.createElement('div');
    nameCol.className = 'student-meta';
    const nameEl = document.createElement('div');
    nameEl.className = 'student-name';
    nameEl.textContent = stu.full_name;
    const extraEl = document.createElement('div');
    extraEl.className = 'student-extra';
    extraEl.textContent = `سنة الميلاد: ${stu.hijri_birth_year || 'غير محددة'}`;
    nameCol.appendChild(nameEl);
    nameCol.appendChild(extraEl);

    const hifzCol = document.createElement('div');
    hifzCol.className = 'student-inputs';
    const hifzLabel = document.createElement('label');
    hifzLabel.textContent = 'الحفظ (جديد)';
    const hifzInput = document.createElement('input');
    hifzInput.type = 'number';
    hifzInput.step = '0.5';
    hifzInput.min = '0';
    hifzInput.inputMode = 'decimal';
    hifzInput.className = 'input-hifz';
    hifzCol.appendChild(hifzLabel);
    hifzCol.appendChild(hifzInput);

    const murCol = document.createElement('div');
    murCol.className = 'student-inputs';
    const murLabel = document.createElement('label');
    murLabel.textContent = 'المراجعة';
    const murInput = document.createElement('input');
    murInput.type = 'number';
    murInput.step = '0.5';
    murInput.min = '0';
    murInput.inputMode = 'decimal';
    murInput.className = 'input-muragaa';
    murCol.appendChild(murLabel);
    murCol.appendChild(murInput);

    row.appendChild(nameCol);
    row.appendChild(hifzCol);
    row.appendChild(murCol);

    return row;
  }

  function renderStudents() {
    studentsListEl.innerHTML = '';
    let count = 0;
    const currentDate = getCurrentHijriString();
    const pending = getPendingEntries();
    const pendingKey = new Set(
      pending.map((p) => `${p.student_id}|${p.teacher_id}|${p.hijri_date}`)
    );
    const selectedTeacherId = getSelectedTeacherId();

    students.forEach((stu) => {
      const row = buildStudentRow(stu);
      const key = `${stu.id}|${selectedTeacherId}|${currentDate}`;
      const hasPending = pendingKey.has(key);
      if (hasPending) {
        row.classList.add('pending-local');
      }
      if (showOnlyWithValues) {
        const existing = findExistingEntry(stu.id, selectedTeacherId, currentDate, pending);
        if (!existing) {
          return;
        }
      }
      studentsListEl.appendChild(row);
      count += 1;
    });
    studentsCountLabel.textContent = `عدد الطلاب: ${count}`;
    recalcPresentCount();
  }

  function findExistingEntry(studentId, teacherId, date, pendingEntries) {
    const allPending = pendingEntries || getPendingEntries();
    const fromPending = allPending.find(
      (p) =>
        String(p.student_id) === String(studentId) &&
        String(p.teacher_id) === String(teacherId) &&
        p.hijri_date === date
    );
    if (fromPending) return fromPending;
    return null;
  }

  function recalcPresentCount() {
    const rows = Array.from(studentsListEl.querySelectorAll('.student-row'));
    const currentDate = getCurrentHijriString();
    const selectedTeacherId = getSelectedTeacherId();
    const pending = getPendingEntries();
    let present = 0;

    rows.forEach((row) => {
      const studentId = parseInt(row.dataset.studentId || '0', 10);
      const hifzInput = row.querySelector('.input-hifz');
      const murInput = row.querySelector('.input-muragaa');
      const hVal = parseFloat(hifzInput.value || '0') || 0;
      const mVal = parseFloat(murInput.value || '0') || 0;
      const hasLocallyEntered = hVal !== 0 || mVal !== 0;
      const hasPending = !!findExistingEntry(studentId, selectedTeacherId, currentDate, pending);
      if (hasLocallyEntered || hasPending) {
        present += 1;
        row.classList.add('attended');
      } else {
        row.classList.remove('attended');
      }
    });

    presentCountEl.textContent = `الحاضرون: ${present}`;
  }

  function withConfigCheck(fn) {
    return async (...args) => {
      const cfg = getConfig();
      if (!cfg.token) {
        showToast('الرجاء إعداد رمز الدخول أولاً.');
        return;
      }
      return fn(cfg, ...args);
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
      throw new Error(`خطأ من GitHub: ${res.status} - ${text}`);
    }
    return res.json();
  }

  function parseCsv(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
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

  const loadCsvFile = withConfigCheck(async (cfg, filename) => {
    const path = `/repos/${cfg.owner}/${cfg.repo}/contents/data/${filename}?ref=${cfg.branch}`;
    const json = await githubRequest(cfg, path);
    const content = atob(json.content.replace(/\\n/g, ''));
    return { text: content, sha: json.sha };
  });

  async function loadStudentsAndTeachers() {
    let studentsCsv = localStorage.getItem(LS_KEYS.students);
    let teachersCsv = localStorage.getItem(LS_KEYS.teachers);
    if (navigator.onLine) {
      try {
        const [sFile, tFile] = await Promise.all([
          loadCsvFile('students.csv'),
          loadCsvFile('teachers.csv'),
        ]);
        studentsCsv = sFile.text;
        teachersCsv = tFile.text;
        localStorage.setItem(LS_KEYS.students, studentsCsv);
        localStorage.setItem(LS_KEYS.teachers, teachersCsv);
      } catch (err) {
        console.warn('تعذر تحميل بيانات الطلاب/المعلمين من المستودع، سيتم استخدام النسخة المخزنة محليًا إن وجدت.', err);
        showToast('تعذر الوصول للمستودع، سيتم استخدام البيانات المخزنة محليًا إن وجدت.');
      }
    }
    if (!studentsCsv || !teachersCsv) {
      showToast('لا توجد بيانات طلاب/معلمين محلية بعد. تأكد من الاتصال بالإنترنت أولاً.');
      return;
    }
    const sParsed = parseCsv(studentsCsv);
    const tParsed = parseCsv(teachersCsv);
    students = sParsed.rows.map((r) => ({
      id: parseInt(r.id, 10),
      full_name: r.full_name,
      hijri_birth_year: r.hijri_birth_year || '',
    }));
    teachers = tParsed.rows.map((r) => ({
      id: parseInt(r.id, 10),
      full_name: r.full_name,
    }));
    teacherSelect.innerHTML = '<option value=\"\">اختر المعلم</option>';
    teachers.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = String(t.id);
      opt.textContent = t.full_name;
      teacherSelect.appendChild(opt);
    });
    const lastTeacher = localStorage.getItem(LS_KEYS.lastTeacherId);
    if (lastTeacher) {
      teacherSelect.value = lastTeacher;
    }
    renderStudents();
  }

  async function saveLocalFromForm() {
    const teacherId = getSelectedTeacherId();
    if (!teacherId) {
      showToast('الرجاء اختيار المعلم أولاً.');
      return;
    }
    const date = getCurrentHijriString();
    const rows = Array.from(studentsListEl.querySelectorAll('.student-row'));
    const pending = getPendingEntries();
    const byKey = new Map(
      pending.map((p) => [`${p.student_id}|${p.teacher_id}|${p.hijri_date}`, p])
    );

    rows.forEach((row) => {
      const studentId = parseInt(row.dataset.studentId || '0', 10);
      const hifzInput = row.querySelector('.input-hifz');
      const murInput = row.querySelector('.input-muragaa');
      const hVal = parseFloat(hifzInput.value || '0') || 0;
      const mVal = parseFloat(murInput.value || '0') || 0;
      const key = `${studentId}|${teacherId}|${date}`;
      if (!hifzInput.value && !murInput.value) {
        return;
      }
      byKey.set(key, {
        student_id: studentId,
        teacher_id: teacherId,
        hifz: hVal,
        muragaa: mVal,
        hijri_date: date,
        notes: '',
      });
    });

    const newPending = Array.from(byKey.values());
    savePendingEntries(newPending);
    recalcPresentCount();
      showToast('تم حفظ بيانات اليوم محليًا. يمكن مزامنتها لاحقًا عند توفر الاتصال.');
  }

  async function syncPendingToGithubInternal(cfg, { silent } = {}) {
    const pending = getPendingEntries();
    if (!pending.length) {
      if (!silent) showToast('لا توجد سجلات غير مُرسَلة.');
      return;
    }
    if (!silent) {
      syncBtn.disabled = true;
      saveLocalBtn.disabled = true;
      showToast('جاري مزامنة السجلات مع المستودع...');
    }

    try {
      const file = await loadCsvFile('daily_progress.csv');
      const parsed = parseCsv(file.text);
      const existingRows = parsed.rows;
      const headers = parsed.headers;
      if (!headers.length) {
        headers.push('student_id', 'teacher_id', 'hifz', 'muragaa', 'hijri_date', 'notes');
      }
      const indexByKey = new Map();
      existingRows.forEach((r, idx) => {
        const key = `${r.student_id}|${r.teacher_id}|${r.hijri_date}`;
        indexByKey.set(key, idx);
      });
      pending.forEach((p) => {
        const key = `${p.student_id}|${p.teacher_id}|${p.hijri_date}`;
        if (indexByKey.has(key)) {
          const idx = indexByKey.get(key);
          existingRows[idx] = {
            student_id: String(p.student_id),
            teacher_id: String(p.teacher_id),
            hifz: String(p.hifz),
            muragaa: String(p.muragaa),
            hijri_date: p.hijri_date,
            notes: p.notes || '',
          };
        } else {
          existingRows.push({
            student_id: String(p.student_id),
            teacher_id: String(p.teacher_id),
            hifz: String(p.hifz),
            muragaa: String(p.muragaa),
            hijri_date: p.hijri_date,
            notes: p.notes || '',
          });
        }
      });

      const newContent = stringifyCsv(headers, existingRows);
      const b64 = btoa(unescape(encodeURIComponent(newContent)));

      const path = `/repos/${cfg.owner}/${cfg.repo}/contents/data/daily_progress.csv`;
      await githubRequest(cfg, path, {
        method: 'PUT',
        body: {
          message: 'Add daily progress entries from حلقة الفتح tool',
          content: b64,
          sha: file.sha,
          branch: cfg.branch,
        },
      });

      savePendingEntries([]);
      recalcPresentCount();
      if (!silent) showToast('تمت مزامنة البيانات بنجاح.');
    } catch (err) {
      console.error(err);
      if (!silent) showToast('فشلت المزامنة مع المستودع. ستبقى البيانات محفوظة محليًا.');
    } finally {
      if (!silent) {
        syncBtn.disabled = false;
        saveLocalBtn.disabled = false;
      }
    }
  }

  const syncPendingToGithub = withConfigCheck((cfg) =>
    syncPendingToGithubInternal(cfg, { silent: false })
  );

  async function backgroundSyncIfPossible() {
    if (!navigator.onLine) return;
    const cfg = getConfig();
    if (!cfg.token) return;
    if (!getPendingEntries().length) return;
    try {
      await syncPendingToGithubInternal(cfg, { silent: true });
    } catch (err) {
      console.warn('خلفية: فشل في المزامنة، سيتم المحاولة لاحقاً.', err);
    }
  }

  function switchToAppView() {
    authView.classList.remove('active');
    appView.classList.add('active');
  }

  function switchToAuthView() {
    appView.classList.remove('active');
    authView.classList.add('active');
  }

  function initConfigUI() {
    const cfg = getConfig();
    tokenInput.value = cfg.token;
  }

  function initConnectionStatus() {
    setConnectionStatus(navigator.onLine);
    window.addEventListener('online', () => setConnectionStatus(true));
    window.addEventListener('offline', () => setConnectionStatus(false));
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('sw.js')
        .catch((err) => console.warn('SW registration failed', err));
    }
  }

  function bindEvents() {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cfg = {
        token: tokenInput.value.trim(),
      };
      if (!cfg.token) {
        showToast('الرجاء إدخال رمز الدخول الشخصي.');
        return;
      }
      saveConfig(cfg);
      localStorage.setItem(LS_KEYS.students, '');
      localStorage.setItem(LS_KEYS.teachers, '');
      switchToAppView();
      loadStudentsAndTeachers();
      showToast('تم حفظ الإعدادات. يمكنك الآن البدء في إدخال بيانات الطلاب.');
    });

    teacherSelect.addEventListener('change', () => {
      const val = teacherSelect.value;
      if (val) {
        localStorage.setItem(LS_KEYS.lastTeacherId, val);
      }
      renderStudents();
    });

    [hijriDayInput, hijriMonthInput, hijriYearInput].forEach((input) => {
      input.addEventListener('change', () => {
        renderStudents();
      });
    });

    studentsListEl.addEventListener('input', (e) => {
      if (
        e.target.classList.contains('input-hifz') ||
        e.target.classList.contains('input-muragaa')
      ) {
        recalcPresentCount();
      }
    });

    toggleEmptyBtn.addEventListener('click', () => {
      showOnlyWithValues = !showOnlyWithValues;
      toggleEmptyBtn.textContent = showOnlyWithValues
        ? 'إظهار جميع الطلاب'
        : 'إخفاء الطلاب بدون بيانات';
      renderStudents();
    });

    clearDayBtn.addEventListener('click', () => {
      const rows = Array.from(studentsListEl.querySelectorAll('.student-row'));
      rows.forEach((row) => {
        const h = row.querySelector('.input-hifz');
        const m = row.querySelector('.input-muragaa');
        if (h) h.value = '';
        if (m) m.value = '';
        row.classList.remove('attended');
      });
      recalcPresentCount();
      showToast('تم مسح القيم الظاهرة لهذا اليوم (محليًا فقط).');
    });

    loadDayBtn.addEventListener('click', () => {
      renderStudents();
      backgroundSyncIfPossible();
      showToast('تم تحديث القيم بناءً على اليوم المختار.');
    });

    saveLocalBtn.addEventListener('click', () => {
      saveLocalFromForm();
    });

    syncBtn.addEventListener('click', () => {
      syncPendingToGithub();
    });

    openSettingsBtn.addEventListener('click', () => {
      switchToAuthView();
      initConfigUI();
    });
  }

  function bootstrap() {
    initConnectionStatus();
    initConfigUI();
    ensureHijriInputsDefault();
    savePendingEntries(getPendingEntries());

    const cfg = getConfig();
    if (cfg.token) {
      switchToAppView();
      loadStudentsAndTeachers();
    } else {
      switchToAuthView();
    }

    bindEvents();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();

