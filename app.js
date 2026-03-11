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
  const mainRoot = document.getElementById('main-root');
  const headerHijriDate = document.getElementById('hijri-date-header');
  const todayBtn = document.getElementById('btn-today');
  const viewDailyBtn = document.getElementById('btn-view-daily');
  const viewStudentsBtn = document.getElementById('btn-view-students');

  const authForm = document.getElementById('auth-form');
  const tokenInput = document.getElementById('token-input');

  const teacherSelect = document.getElementById('teacher-select');
  const teacherButtonsEl = document.getElementById('teacher-buttons');
  const hijriDayInput = document.getElementById('hijri-day');
  const hijriMonthInput = document.getElementById('hijri-month');
  const hijriYearInput = document.getElementById('hijri-year');
  const loadDayBtn = document.getElementById('load-day-btn');
  const clearDayBtn = document.getElementById('clear-day-btn');

  const studentsListEl = document.getElementById('students-list');
  const studentsCountLabel = document.getElementById('students-count-label');
  const toggleEmptyBtn = document.getElementById('toggle-empty-btn');

  const studentsStatsView = document.getElementById('students-stats-view');
  const studentsStatsListEl = document.getElementById('students-stats-list');

  const presentCountEl = document.getElementById('present-count');
  const openSettingsBtn = document.getElementById('open-settings-btn');

  const toastEl = document.getElementById('toast');

  let students = [];
  let teachers = [];
  let showOnlyWithValues = false;
  const studentDefaultTeacher = {};
  let allProgressRows = [];

  function showToast(message) {
    if (!toastEl) return;
    toastEl.innerHTML = `<div class="toast-inner">${String(message).replace(/</g, '&lt;')}</div>`;
    toastEl.classList.add('visible');
    setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 3500);
  }

  function setConnectionStatus(online) {
    if (!connectionStatus) return;
    if (online) {
      connectionStatus.classList.add('hidden');
    } else {
      connectionStatus.textContent = 'بدون إنترنت - يتم الحفظ محليًا';
      connectionStatus.classList.remove('hidden');
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
  }

  function getCurrentHijriDate() {
    const now = new Date();
    try {
      // Use latin digits for easier parsing, but Islamic calendar for accuracy
      const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      });
      const parts = formatter.formatToParts(now);
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
      console.error('Failed to get Hijri date:', err);
      return { day: 1, month: 1, year: 1447 };
    }
  }

  function ensureHijriInputsDefault() {
    if (!hijriDayInput || !hijriMonthInput || !hijriYearInput) return;
    
    const currentDay = hijriDayInput.value ? parseInt(hijriDayInput.value, 10) : 0;
    const currentMonth = hijriMonthInput.value ? parseInt(hijriMonthInput.value, 10) : 0;
    const currentYear = hijriYearInput.value ? parseInt(hijriYearInput.value, 10) : 0;
    
    if (!currentDay || !currentMonth || !currentYear) {
      const d = getCurrentHijriDate();
      console.log('Initializing with Hijri date:', d);
      hijriDayInput.value = String(d.day);
      hijriMonthInput.value = String(d.month);
      hijriYearInput.value = String(d.year);
    }
  }

  function getCurrentHijriString() {
    const day = String(parseInt(hijriDayInput.value || '1', 10)).padStart(2, '0');
    const month = String(parseInt(hijriMonthInput.value || '1', 10)).padStart(2, '0');
    const year = hijriYearInput.value || '1447';
    return `${day}/${month}/${year}`;
  }

  function getSelectedTeacherId() {
    if (!teacherSelect) return null;
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

    const attendBtn = document.createElement('button');
    attendBtn.type = 'button';
    attendBtn.className =
      'attend-toggle inline-flex items-center justify-center mt-1 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100';
    attendBtn.textContent = 'حضور';
    nameCol.appendChild(attendBtn);

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
    if (!studentsListEl) return;
    if (!studentsListEl) return;
    studentsListEl.innerHTML = '';
    let count = 0;
    const currentDate = getCurrentHijriString();
    const pending = getPendingEntries();
    const pendingKey = new Set(
      pending.map((p) => `${p.student_id}|${p.teacher_id}|${p.hijri_date}`)
    );
    const selectedTeacherId = getSelectedTeacherId();

    students.forEach((stu) => {
      const defaultTeacherId = studentDefaultTeacher[stu.id];
      if (selectedTeacherId) {
        // When a teacher is selected, only show students linked to that teacher by daily entries
        if (!defaultTeacherId || defaultTeacherId !== selectedTeacherId) {
          return;
        }
      }
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
    if (studentsCountLabel) studentsCountLabel.textContent = `عدد الطلاب: ${count}`;
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
    if (!studentsListEl) return;
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

    if (presentCountEl) presentCountEl.textContent = `الحاضرون: ${present}`;
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
    const binary = atob(json.content.replace(/\n/g, ''));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const content = new TextDecoder('utf-8').decode(bytes);
    return { text: content, sha: json.sha };
  });

  async function loadStudentsAndTeachers() {
    let studentsCsv = localStorage.getItem(LS_KEYS.students);
    let teachersCsv = localStorage.getItem(LS_KEYS.teachers);
    if (navigator.onLine) {
      try {
        const [sFile, tFile, pFile] = await Promise.all([
          loadCsvFile('students.csv'),
          loadCsvFile('teachers.csv'),
          loadCsvFile('daily_progress.csv'),
        ]);
        studentsCsv = sFile.text;
        teachersCsv = tFile.text;
        localStorage.setItem(LS_KEYS.students, studentsCsv);
        localStorage.setItem(LS_KEYS.teachers, teachersCsv);

        // Build default teacher per student from daily_progress.csv
        const progressParsed = parseCsv(pFile.text);
        allProgressRows = progressParsed.rows || [];
        const countsByStudent = {};
        progressParsed.rows.forEach((r) => {
          const sid = parseInt(r.student_id || '0', 10);
          const tid = parseInt(r.teacher_id || '0', 10);
          if (!sid || !tid) return;
          if (!countsByStudent[sid]) countsByStudent[sid] = {};
          countsByStudent[sid][tid] = (countsByStudent[sid][tid] || 0) + 1;
        });
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
          if (bestTid) {
            studentDefaultTeacher[sid] = bestTid;
          }
        });
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
    if (teacherSelect) {
      teacherSelect.innerHTML = '<option value="">اختر المعلم</option>';
      teachers.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = String(t.id);
        opt.textContent = t.full_name;
        teacherSelect.appendChild(opt);
      });
      const lastTeacher = localStorage.getItem(LS_KEYS.lastTeacherId);
      if (lastTeacher) teacherSelect.value = lastTeacher;
    }

    // Render teacher buttons (chips) instead of dropdown UI
    if (teacherButtonsEl) {
      teacherButtonsEl.innerHTML = '';
      teachers.forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.teacherId = String(t.id);
        btn.className =
          'touch-target px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50';
        btn.textContent = t.full_name;
        teacherButtonsEl.appendChild(btn);
      });
      updateTeacherButtonsActive();
    }
    renderStudents();
    renderStudentStats();
  }

  function collectFormToPending() {
    const teacherId = getSelectedTeacherId();
    if (!teacherId) {
      return false;
    }
    const date = getCurrentHijriString();
    const rows = studentsListEl
      ? Array.from(studentsListEl.querySelectorAll('.student-row'))
      : [];
    const pending = getPendingEntries();
    const byKey = new Map(
      pending.map((p) => [`${p.student_id}|${p.teacher_id}|${p.hijri_date}`, p])
    );

    rows.forEach((row) => {
      const studentId = parseInt(row.dataset.studentId || '0', 10);
      const hifzInput = row.querySelector('.input-hifz');
      const murInput = row.querySelector('.input-muragaa');
      const attendedOnly = row.dataset.attended === '1';
      const hVal = parseFloat((hifzInput && hifzInput.value) || '0') || 0;
      const mVal = parseFloat((murInput && murInput.value) || '0') || 0;
      const key = `${studentId}|${teacherId}|${date}`;
      if (!attendedOnly && !(hifzInput && hifzInput.value) && !(murInput && murInput.value)) {
        return;
      }
      byKey.set(key, {
        student_id: studentId,
        teacher_id: teacherId,
        hifz: attendedOnly ? 0 : hVal,
        muragaa: attendedOnly ? 0 : mVal,
        hijri_date: date,
        notes: '',
      });
    });

    const newPending = Array.from(byKey.values());
    savePendingEntries(newPending);
    recalcPresentCount();
    return true;
  }

  async function syncPendingToGithubInternal(cfg) {
    const pending = getPendingEntries();
    if (!pending.length) {
      return;
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
      allProgressRows = existingRows;
      recalcPresentCount();
      renderStudentStats();
    } catch (err) {
      console.error(err);
    }
  }

  async function backgroundSyncIfPossible() {
    if (!navigator.onLine) return;
    const cfg = getConfig();
    if (!cfg.token) return;
    if (!getPendingEntries().length) return;
    try {
      await syncPendingToGithubInternal(cfg);
    } catch (err) {
      console.warn('خلفية: فشل في المزامنة، سيتم المحاولة لاحقاً.', err);
    }
  }

  function switchToAppView() {
    authView.classList.remove('active');
    authView.classList.add('hidden');
    appView.classList.add('active');
    appView.classList.remove('hidden');
  }

  function switchToAuthView() {
    appView.classList.remove('active');
    appView.classList.add('hidden');
    authView.classList.add('active');
    authView.classList.remove('hidden');
  }

  function initConfigUI() {
    const cfg = getConfig();
    tokenInput.value = cfg.token;
  }

  function initConnectionStatus() {
    setConnectionStatus(navigator.onLine);
    window.addEventListener('online', () => {
      setConnectionStatus(true);
      backgroundSyncIfPossible();
    });
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
    if (!authForm || !tokenInput) return;
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

    if (teacherSelect) {
      teacherSelect.addEventListener('change', () => {
        const val = teacherSelect.value;
        if (val) {
          localStorage.setItem(LS_KEYS.lastTeacherId, val);
        }
        renderStudents();
      });
    }

    if (teacherButtonsEl) {
      teacherButtonsEl.addEventListener('click', (e) => {
        const target = e.target.closest('button[data-teacher-id]');
        if (!target) return;
        const id = target.dataset.teacherId || '';
        teacherSelect.value = id;
        if (id) {
          localStorage.setItem(LS_KEYS.lastTeacherId, id);
        }
        updateTeacherButtonsActive();
        renderStudents();
      });
    }

    [hijriDayInput, hijriMonthInput, hijriYearInput].forEach((input) => {
      if (input) input.addEventListener('change', () => {
        updateHijriLabels();
        renderStudents();
      });
    });

    // Date navigation buttons
    const hijriDayPrev = document.getElementById('hijri-day-prev');
    const hijriDayNext = document.getElementById('hijri-day-next');
    const hijriMonthPrev = document.getElementById('hijri-month-prev');
    const hijriMonthNext = document.getElementById('hijri-month-next');
    const hijriYearPrev = document.getElementById('hijri-year-prev');
    const hijriYearNext = document.getElementById('hijri-year-next');

    if (hijriDayPrev) hijriDayPrev.addEventListener('click', () => {
      const val = parseInt(hijriDayInput.value || '1', 10);
      hijriDayInput.value = Math.max(1, val - 1);
      updateHijriLabels();
      renderStudents();
    });

    if (hijriDayNext) hijriDayNext.addEventListener('click', () => {
      const val = parseInt(hijriDayInput.value || '1', 10);
      hijriDayInput.value = Math.min(30, val + 1);
      updateHijriLabels();
      renderStudents();
    });

    if (hijriMonthPrev) hijriMonthPrev.addEventListener('click', () => {
      const val = parseInt(hijriMonthInput.value || '1', 10);
      if (val > 1) {
        hijriMonthInput.value = val - 1;
      } else {
        hijriMonthInput.value = 12;
        const year = parseInt(hijriYearInput.value || '1447', 10);
        hijriYearInput.value = year - 1;
      }
      updateHijriLabels();
      renderStudents();
    });

    if (hijriMonthNext) hijriMonthNext.addEventListener('click', () => {
      const val = parseInt(hijriMonthInput.value || '1', 10);
      if (val < 12) {
        hijriMonthInput.value = val + 1;
      } else {
        hijriMonthInput.value = 1;
        const year = parseInt(hijriYearInput.value || '1447', 10);
        hijriYearInput.value = year + 1;
      }
      updateHijriLabels();
      renderStudents();
    });

    if (hijriYearPrev) hijriYearPrev.addEventListener('click', () => {
      const val = parseInt(hijriYearInput.value || '1447', 10);
      hijriYearInput.value = Math.max(1440, val - 1);
      updateHijriLabels();
      renderStudents();
    });

    if (hijriYearNext) hijriYearNext.addEventListener('click', () => {
      const val = parseInt(hijriYearInput.value || '1447', 10);
      hijriYearInput.value = Math.min(1500, val + 1);
      updateHijriLabels();
      renderStudents();
    });

    if (studentsListEl) {
      studentsListEl.addEventListener('input', (e) => {
        if (
          e.target.classList.contains('input-hifz') ||
          e.target.classList.contains('input-muragaa')
        ) {
          recalcPresentCount();
          if (collectFormToPending()) {
            backgroundSyncIfPossible();
          }
        }
      });

      studentsListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.attend-toggle');
        if (!btn) return;
        const row = btn.closest('.student-row');
        if (!row) return;
        const currently = row.dataset.attended === '1';
        if (currently) {
          row.dataset.attended = '0';
          row.classList.remove('attended');
          btn.textContent = 'حضور';
        } else {
          row.dataset.attended = '1';
          row.classList.add('attended');
          btn.textContent = 'حاضر';
          const h = row.querySelector('.input-hifz');
          const m = row.querySelector('.input-muragaa');
          if (h) h.value = '';
          if (m) m.value = '';
        }
        recalcPresentCount();
        if (collectFormToPending()) {
          backgroundSyncIfPossible();
        }
      });
    }

    if (toggleEmptyBtn) toggleEmptyBtn.addEventListener('click', () => {
      showOnlyWithValues = !showOnlyWithValues;
      toggleEmptyBtn.textContent = showOnlyWithValues
        ? 'إظهار جميع الطلاب'
        : 'إخفاء الطلاب بدون بيانات';
      renderStudents();
    });

    if (clearDayBtn) clearDayBtn.addEventListener('click', () => {
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

    if (loadDayBtn) loadDayBtn.addEventListener('click', () => {
      renderStudents();
      backgroundSyncIfPossible();
      showToast('تم تحديث القيم بناءً على اليوم المختار.');
    });

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
      switchToAuthView();
      initConfigUI();
    });

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const d = getCurrentHijriDate();
        console.log('Setting today\'s date:', d);
        if (hijriDayInput) {
          hijriDayInput.value = String(d.day);
        }
        if (hijriMonthInput) {
          hijriMonthInput.value = String(d.month);
        }
        if (hijriYearInput) {
          hijriYearInput.value = String(d.year);
        }
        updateHijriLabels();
        setHeaderView('daily');
        renderStudents();
        backgroundSyncIfPossible();
        showToast(`تم التحديث إلى تاريخ اليوم: ${d.day}/${d.month}/${d.year}`);
      });
    }

    if (viewDailyBtn && viewStudentsBtn) {
      viewDailyBtn.addEventListener('click', () => {
        setHeaderView('daily');
      });
      viewStudentsBtn.addEventListener('click', () => {
        setHeaderView('students');
      });
    }
  }

  function updateHijriLabels() {
    const date = getCurrentHijriString();
    const [day] = date.split('/');
    if (document.getElementById('hijri-day-label')) {
      document.getElementById('hijri-day-label').textContent = `اليوم ${parseInt(day, 10)}`;
    }
    if (document.getElementById('hijri-date-label')) {
      document.getElementById('hijri-date-label').textContent = date;
    }
  }

  function updateTeacherButtonsActive() {
    if (!teacherButtonsEl) return;
    const selectedId = teacherSelect.value;
    Array.from(teacherButtonsEl.querySelectorAll('button[data-teacher-id]')).forEach((btn) => {
      if (btn.dataset.teacherId === selectedId) {
        btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-600');
      } else {
        btn.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-600');
        btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
      }
    });
  }

  function setHeaderView(view) {
    if (!viewDailyBtn || !viewStudentsBtn) return;
    const activeClass = 'px-3 py-1.5 rounded-md font-medium bg-white text-emerald-700 shadow-sm';
    const inactiveClass = 'px-3 py-1.5 rounded-md font-medium text-emerald-100 hover:bg-emerald-600/50';
    if (view === 'daily') {
      viewDailyBtn.className = activeClass;
      viewStudentsBtn.className = inactiveClass;
      if (studentsStatsView) studentsStatsView.classList.add('hidden');
      const dailyView = document.getElementById('daily-view');
      if (dailyView) dailyView.classList.remove('hidden');
    } else {
      viewDailyBtn.className = inactiveClass;
      viewStudentsBtn.className = activeClass;
      const dailyView = document.getElementById('daily-view');
      if (dailyView) dailyView.classList.add('hidden');
      if (studentsStatsView) {
        studentsStatsView.classList.remove('hidden');
        renderStudentStats();
      }
    }
  }

  function renderStudentStats() {
    if (!studentsStatsListEl) return;
    studentsStatsListEl.innerHTML = '';
    if (!students.length) return;

    const teacherId = getSelectedTeacherId();

    // Build map of latest entries per (student, teacher, date) from stored progress and pending
    const byKey = new Map();
    allProgressRows.forEach((r) => {
      const sid = parseInt(r.student_id || '0', 10);
      const tid = parseInt(r.teacher_id || '0', 10);
      if (!sid || !tid) return;
      const key = `${sid}|${tid}|${r.hijri_date}`;
      byKey.set(key, {
        student_id: sid,
        teacher_id: tid,
        hifz: parseFloat(r.hifz || '0') || 0,
        muragaa: parseFloat(r.muragaa || '0') || 0,
        hijri_date: r.hijri_date,
      });
    });

    getPendingEntries().forEach((p) => {
      const sid = parseInt(p.student_id || '0', 10);
      const tid = parseInt(p.teacher_id || '0', 10);
      if (!sid || !tid) return;
      const key = `${sid}|${tid}|${p.hijri_date}`;
      byKey.set(key, {
        student_id: sid,
        teacher_id: tid,
        hifz: parseFloat(p.hifz || 0) || 0,
        muragaa: parseFloat(p.muragaa || 0) || 0,
        hijri_date: p.hijri_date,
      });
    });

    const statsByStudent = {};
    byKey.forEach((entry) => {
      if (teacherId && entry.teacher_id !== teacherId) return;
      const sid = entry.student_id;
      if (!statsByStudent[sid]) {
        statsByStudent[sid] = {
          hifz: 0,
          muragaa: 0,
          days: new Set(),
        };
      }
      statsByStudent[sid].hifz += entry.hifz;
      statsByStudent[sid].muragaa += entry.muragaa;
      statsByStudent[sid].days.add(entry.hijri_date);
    });

    const items = students
      .map((stu) => {
        const s = statsByStudent[stu.id];
        if (!s) return null;
        return {
          student: stu,
          hifz: s.hifz,
          muragaa: s.muragaa,
          days: s.days.size,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.hifz + b.muragaa - (a.hifz + a.muragaa));

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'text-xs text-slate-500';
      empty.textContent = 'لا توجد بيانات إحصائية بعد لهذه الحلقة.';
      studentsStatsListEl.appendChild(empty);
      return;
    }

    items.forEach(({ student, hifz, muragaa, days }) => {
      const row = document.createElement('div');
      row.className =
        'flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white';

      const name = document.createElement('div');
      name.className = 'flex flex-col';
      const title = document.createElement('div');
      title.className = 'font-semibold text-slate-800 text-sm';
      title.textContent = student.full_name;
      const subtitle = document.createElement('div');
      subtitle.className = 'text-[11px] text-slate-400';
      subtitle.textContent = `أيام الحضور: ${days}`;
      name.appendChild(title);
      name.appendChild(subtitle);

      const stats = document.createElement('div');
      stats.className = 'flex items-center gap-2 text-[11px]';

      const chipHifz = document.createElement('div');
      chipHifz.className =
        'px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100';
      chipHifz.textContent = `حفظ: ${hifz}`;

      const chipMur = document.createElement('div');
      chipMur.className =
        'px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100';
      chipMur.textContent = `مراجعة: ${muragaa}`;

      stats.appendChild(chipHifz);
      stats.appendChild(chipMur);

      row.appendChild(name);
      row.appendChild(stats);
      studentsStatsListEl.appendChild(row);
    });
  }

  function bootstrap() {
    initConnectionStatus();
    initConfigUI();
    ensureHijriInputsDefault();
    savePendingEntries(getPendingEntries());

    // Set header hijri date text
    try {
      const hijriHeaderFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const label = hijriHeaderFormatter.format(new Date());
      if (headerHijriDate) headerHijriDate.textContent = label;
    } catch {
      if (headerHijriDate) headerHijriDate.textContent = 'التاريخ الهجري';
    }
    updateHijriLabels();

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

