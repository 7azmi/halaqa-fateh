(() => {
  if (typeof Controller === 'undefined') {
    console.error('Controller must be loaded before app.js');
    return;
  }

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
  const backToAppBtn = document.getElementById('back-to-app-btn');

  const teacherSelect = document.getElementById('teacher-select');
  const teacherButtonsEl = document.getElementById('teacher-buttons');
  const hijriDayInput = document.getElementById('hijri-day');
  const hijriMonthInput = document.getElementById('hijri-month');
  const hijriYearInput = document.getElementById('hijri-year');
  const loadDayBtn = document.getElementById('load-day-btn');

  const studentsListEl = document.getElementById('students-list');
  const studentsCountLabel = document.getElementById('students-count-label');
  const toggleEmptyBtn = document.getElementById('toggle-empty-btn');

  const studentsStatsView = document.getElementById('students-stats-view');
  const studentsStatsListEl = document.getElementById('students-stats-list');

  const presentCountEl = document.getElementById('present-count');
  const openSettingsBtn = document.getElementById('open-settings-btn');

  const toastEl = document.getElementById('toast');

  let showOnlyWithValues = false;
  let currentRealDate = new Date();

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

  function ensureHijriInputsDefault() {
    if (!hijriDayInput || !hijriMonthInput || !hijriYearInput) return;
    const currentDay = hijriDayInput.value ? parseInt(hijriDayInput.value, 10) : 0;
    const currentMonth = hijriMonthInput.value ? parseInt(hijriMonthInput.value, 10) : 0;
    const currentYear = hijriYearInput.value ? parseInt(hijriYearInput.value, 10) : 0;
    if (!currentDay || !currentMonth || !currentYear) {
      const d = Controller.get_hijri_from_date(new Date());
      hijriDayInput.value = String(d.day);
      hijriMonthInput.value = String(d.month);
      hijriYearInput.value = String(d.year);
      Controller.set_selected_hijri(d.day, d.month, d.year);
    }
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
    const ageLabel = getStudentAgeLabel(stu);
    extraEl.textContent = ageLabel;
    nameCol.appendChild(nameEl);
    nameCol.appendChild(extraEl);

    const attendBtn = document.createElement('button');
    attendBtn.type = 'button';
    attendBtn.className =
      'attend-toggle inline-flex items-center justify-center mt-1 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100';
    attendBtn.textContent = 'حضور فقط';
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

  function attachTeacherMappingUI(row, stu) {
    const meta = row.querySelector('.student-meta');
    if (!meta) return;
    const studentDefaultTeacher = Controller.get_student_default_teacher_map();
    const currentTid = studentDefaultTeacher[stu.id];
    const container = document.createElement('div');
    container.className = 'mt-1 flex items-center gap-1 text-[10px] text-slate-500';

    const label = document.createElement('span');
    label.textContent = 'الحلقة:';
    container.appendChild(label);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.dataset.studentId = String(stu.id);
    chip.className =
      'student-teacher-chip px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-[10px] text-slate-700 hover:bg-emerald-50';

    if (currentTid) {
      const teachers = Controller.get_teachers();
      const teacher = teachers.find((t) => t.id === currentTid);
      chip.textContent = teacher ? teacher.full_name : 'غير محددة';
    } else {
      chip.textContent = 'غير محددة';
    }

    container.appendChild(chip);
    meta.appendChild(container);
  }

  function renderStudents() {
    if (!studentsListEl) return;
    studentsListEl.innerHTML = '';
    let count = 0;
    const currentDate = Controller.get_selected_hijri_date();
    const pending = Controller.get_pending_entries();
    const pendingKey = new Set(
      pending.map((p) => `${p.student_id}|${p.teacher_id}|${p.hijri_date}`)
    );
    const selectedTeacherId = getSelectedTeacherId();
    const students = Controller.get_students();
    const studentDefaultTeacher = Controller.get_student_default_teacher_map();

    students.forEach((stu) => {
      const defaultTeacherId = studentDefaultTeacher[stu.id];
      if (selectedTeacherId) {
        // When a teacher is selected, only show students linked to that teacher by daily entries
        if (!defaultTeacherId || defaultTeacherId !== selectedTeacherId) {
          return;
        }
      }

      const row = buildStudentRow(stu);
      attachTeacherMappingUI(row, stu);

      const key = `${stu.id}|${selectedTeacherId}|${currentDate}`;
      const hasPending = pendingKey.has(key);
      if (hasPending) {
        row.classList.add('pending-local');
      }

      const existing = Controller.find_existing_entry(stu.id, selectedTeacherId, currentDate);
      if (existing && selectedTeacherId) {
        const hifzInput = row.querySelector('.input-hifz');
        const murInput = row.querySelector('.input-muragaa');
        const attendBtn = row.querySelector('.attend-toggle');
        const hVal = parseFloat(existing.hifz || '0') || 0;
        const mVal = parseFloat(existing.muragaa || '0') || 0;

        if (hifzInput) hifzInput.value = hVal ? String(hVal) : '';
        if (murInput) murInput.value = mVal ? String(mVal) : '';

        if (hVal !== 0 || mVal !== 0) {
          row.dataset.attended = '1';
          row.classList.add('attended');
          if (attendBtn) attendBtn.textContent = 'حاضر';
        } else {
          row.dataset.attended = '1';
          row.classList.add('attended');
          if (attendBtn) attendBtn.textContent = 'حضور فقط';
        }
      }

      if (showOnlyWithValues) {
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

  function recalcPresentCount() {
    if (!studentsListEl) return;
    const rows = Array.from(studentsListEl.querySelectorAll('.student-row'));
    const currentDate = Controller.get_selected_hijri_date();
    const selectedTeacherId = getSelectedTeacherId();
    let present = 0;

    rows.forEach((row) => {
      const studentId = parseInt(row.dataset.studentId || '0', 10);
      const hifzInput = row.querySelector('.input-hifz');
      const murInput = row.querySelector('.input-muragaa');
      const hVal = parseFloat(hifzInput?.value || '0') || 0;
      const mVal = parseFloat(murInput?.value || '0') || 0;
      const hasLocallyEntered = hVal !== 0 || mVal !== 0;
      const hasPending = !!Controller.find_existing_entry(studentId, selectedTeacherId, currentDate);
      if (hasLocallyEntered || hasPending) {
        present += 1;
        row.classList.add('attended');
      } else {
        row.classList.remove('attended');
      }
    });

    if (presentCountEl) presentCountEl.textContent = `الحاضرون: ${present}`;
  }

  async function loadStudentsAndTeachers() {
    if (!Controller.is_authenticated()) {
      showToast('الرجاء إعداد رمز الدخول أولاً.');
      return;
    }
    try {
      await Controller.load_data();
    } catch (err) {
      console.warn('تعذر تحميل بيانات الطلاب/المعلمين من المستودع، سيتم استخدام النسخة المخزنة محليًا إن وجدت.', err);
      showToast('تعذر الوصول للمستودع، سيتم استخدام البيانات المخزنة محليًا إن وجدت.');
    }
    const students = Controller.get_students();
    const teachers = Controller.get_teachers();
    if (!students.length && !teachers.length) {
      showToast('لا توجد بيانات طلاب/معلمين محلية بعد. تأكد من الاتصال بالإنترنت أولاً.');
    }
    if (teacherSelect) {
      teacherSelect.innerHTML = '<option value="">اختر المعلم</option>';
      teachers.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = String(t.id);
        opt.textContent = t.full_name;
        teacherSelect.appendChild(opt);
      });
      const lastTeacher = Controller.get_last_teacher_id();
      if (lastTeacher) teacherSelect.value = lastTeacher;
    }

    if (teacherButtonsEl) {
      teacherButtonsEl.innerHTML = '';

      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.dataset.teacherId = '';
      allBtn.className =
        'touch-target px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50';
      allBtn.textContent = 'الكل';
      teacherButtonsEl.appendChild(allBtn);

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
    renderSettingsManagement();
  }

  function collectFormToPending() {
    const teacherId = getSelectedTeacherId();
    if (!teacherId) return false;
    const date = Controller.get_selected_hijri_date();
    const rows = studentsListEl
      ? Array.from(studentsListEl.querySelectorAll('.student-row'))
      : [];
    const pending = Controller.get_pending_entries();
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
    Controller.set_pending_entries(newPending);
    recalcPresentCount();
    return true;
  }

  async function backgroundSyncIfPossible() {
    if (!Controller.is_online()) return;
    if (!Controller.get_pending_entries().length) return;
    try {
      await Controller.sync_data();
      recalcPresentCount();
      renderStudentStats();
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
    const cfg = Controller.get_config();
    if (tokenInput) tokenInput.value = cfg.token || '';
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
      const token = tokenInput.value.trim();
      if (!token) {
        showToast('الرجاء إدخال رمز الدخول الشخصي.');
        return;
      }
      Controller.store_github_token_locally(token);
      Controller.clear_local_csv_cache();
      switchToAppView();
      loadStudentsAndTeachers();
      showToast('تم حفظ الإعدادات. يمكنك الآن البدء في إدخال بيانات الطلاب.');
    });

    if (backToAppBtn) {
      backToAppBtn.addEventListener('click', () => {
        if (!Controller.is_authenticated()) {
          showToast('الرجاء إدخال رمز الدخول أولاً.');
          return;
        }
        switchToAppView();
        const students = Controller.get_students();
        const teachers = Controller.get_teachers();
        if (!students.length || !teachers.length) {
          loadStudentsAndTeachers();
        }
      });
    }

    if (teacherSelect) {
      teacherSelect.addEventListener('change', () => {
        const val = teacherSelect.value;
        if (val) Controller.set_last_teacher_id(val);
        renderStudents();
      });
    }

    if (teacherButtonsEl) {
      teacherButtonsEl.addEventListener('click', (e) => {
        const target = e.target.closest('button[data-teacher-id]');
        if (!target) return;
        const id = target.dataset.teacherId || '';
        teacherSelect.value = id;
        if (id) Controller.set_last_teacher_id(id);
        updateTeacherButtonsActive();
        renderStudents();
      });
    }

    [hijriDayInput, hijriMonthInput, hijriYearInput].forEach((input) => {
      if (input) input.addEventListener('change', () => {
        if (hijriDayInput && hijriMonthInput && hijriYearInput) {
          Controller.set_selected_hijri(hijriDayInput.value, hijriMonthInput.value, hijriYearInput.value);
        }
        updateHijriLabels();
        renderStudents();
      });
    });

    const datePrevBtn = document.getElementById('date-prev-btn');
    const dateNextBtn = document.getElementById('date-next-btn');
    const datePillButton = document.getElementById('hijri-date-container');
    const datePanel = document.getElementById('date-picker-panel');
    const pickerMonth = document.getElementById('picker-month');
    const pickerYear = document.getElementById('picker-year');
    const pickerApply = document.getElementById('picker-apply');

    function setDateFromReal(date) {
      currentRealDate = date;
      const d = Controller.get_hijri_from_date(date);
      if (hijriDayInput) hijriDayInput.value = String(d.day);
      if (hijriMonthInput) hijriMonthInput.value = String(d.month);
      if (hijriYearInput) hijriYearInput.value = String(d.year);
      Controller.set_selected_hijri(d.day, d.month, d.year);
      updateHijriLabels();
      renderStudents();
    }

    if (datePrevBtn) {
      datePrevBtn.addEventListener('click', () => {
        const d = new Date(currentRealDate.getTime());
        d.setDate(d.getDate() - 1);
        setDateFromReal(d);
      });
    }

    if (dateNextBtn) {
      dateNextBtn.addEventListener('click', () => {
        const d = new Date(currentRealDate.getTime());
        d.setDate(d.getDate() + 1);
        setDateFromReal(d);
      });
    }

    if (datePillButton && datePanel && pickerMonth && pickerYear) {
      datePillButton.addEventListener('click', () => {
        const isHidden = datePanel.classList.contains('hidden');
        if (isHidden) {
          // Initialize selects with current values
          if (hijriMonthInput && hijriMonthInput.value) {
            pickerMonth.value = String(parseInt(hijriMonthInput.value, 10));
          }
          if (hijriYearInput && hijriYearInput.value) {
            pickerYear.value = String(parseInt(hijriYearInput.value, 10));
          }
          datePanel.classList.remove('hidden');
          datePillButton.classList.add('invisible');
        } else {
          datePanel.classList.add('hidden');
          datePillButton.classList.remove('invisible');
        }
      });
    }

    if (pickerApply && pickerMonth && pickerYear) {
      pickerApply.addEventListener('click', () => {
        const targetMonth = parseInt(pickerMonth.value, 10);
        const targetYear = parseInt(pickerYear.value, 10);
        if (!targetMonth || !targetYear) {
          datePanel.classList.add('hidden');
          return;
        }

        const base = new Date();
        let found = null;
        for (let offset = -730; offset <= 730; offset += 1) {
          const d = new Date(base.getTime());
          d.setDate(d.getDate() + offset);
          const h = Controller.get_hijri_from_date(d);
          if (h.year === targetYear && h.month === targetMonth && h.day === 1) {
            found = d;
            break;
          }
        }

        if (found) {
          setDateFromReal(found);
        } else {
          currentRealDate = null;
          if (hijriDayInput) hijriDayInput.value = '1';
          if (hijriMonthInput) hijriMonthInput.value = String(targetMonth);
          if (hijriYearInput) hijriYearInput.value = String(targetYear);
          Controller.set_selected_hijri(1, targetMonth, targetYear);
          updateHijriLabels();
          renderStudents();
        }

        datePanel.classList.add('hidden');
        if (datePillButton) {
          datePillButton.classList.remove('invisible');
        }
      });
    }

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
        const teacherChip = e.target.closest('.student-teacher-chip');
        if (teacherChip) {
          const sid = parseInt(teacherChip.dataset.studentId || '0', 10);
          if (!sid) return;

          const select = document.createElement('select');
          select.className =
            'student-teacher-select text-[10px] px-2 py-0.5 rounded-full border border-emerald-400 bg-white text-slate-800';

          const noneOption = document.createElement('option');
          noneOption.value = '';
          noneOption.textContent = 'غير محددة';
          select.appendChild(noneOption);

          const teachers = Controller.get_teachers();
          teachers.forEach((t) => {
            const opt = document.createElement('option');
            opt.value = String(t.id);
            opt.textContent = t.full_name;
            select.appendChild(opt);
          });

          const studentDefaultTeacher = Controller.get_student_default_teacher_map();
          const currentTid = studentDefaultTeacher[sid];
          if (currentTid) select.value = String(currentTid);

          teacherChip.replaceWith(select);
          select.focus();

          const finalize = () => {
            const val = select.value;
            const overrides = { ...Controller.get_student_teacher_overrides() };
            if (val) {
              const tid = parseInt(val, 10);
              if (tid) overrides[String(sid)] = tid;
            } else {
              delete overrides[String(sid)];
            }
            Controller.set_student_teacher_overrides(overrides);
            renderStudents();
            renderStudentStats();
          };

          select.addEventListener('change', finalize, { once: true });
          select.addEventListener('blur', finalize, { once: true });

          return;
        }

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

    if (loadDayBtn) loadDayBtn.addEventListener('click', () => {
      renderStudents();
      backgroundSyncIfPossible();
      showToast('تم تحديث القيم بناءً على اليوم المختار.');
    });

    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => {
        initConfigUI();
        if (!Controller.is_authenticated()) {
          switchToAuthView();
          showToast('أدخل رمز الدخول أولاً لتهيئة الاتصال.');
          return;
        }
        switchToAuthView();
        const students = Controller.get_students();
        const teachers = Controller.get_teachers();
        if (!students.length || !teachers.length) {
          loadStudentsAndTeachers();
        } else {
          renderSettingsManagement();
        }
      });
    }

    const settingsPanel = document.getElementById('auth-view');
    if (settingsPanel) {
      settingsPanel.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !btn.dataset || !btn.dataset.type || !btn.dataset.id) return;
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        if (type !== 'student' && type !== 'teacher') return;
        if (type === 'student') Controller.toggle_archived_student(id);
        else if (type === 'teacher') Controller.toggle_archived_teacher(id);
        loadStudentsAndTeachers();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const realToday = new Date();
        currentRealDate = realToday;
        const d = Controller.get_hijri_from_date(realToday);
        if (hijriDayInput) hijriDayInput.value = String(d.day);
        if (hijriMonthInput) hijriMonthInput.value = String(d.month);
        if (hijriYearInput) hijriYearInput.value = String(d.year);
        Controller.set_selected_hijri(d.day, d.month, d.year);
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
    const date = Controller.get_selected_hijri_date();
    const [day] = date.split('/');
    if (document.getElementById('hijri-day-label')) {
      document.getElementById('hijri-day-label').textContent = `اليوم ${parseInt(day, 10)}`;
    }
    const pill = document.getElementById('hijri-date-pill');
    if (pill) pill.textContent = date;
    const weekdaySpan = document.getElementById('hijri-weekday-pill');
    if (weekdaySpan) {
      weekdaySpan.textContent = currentRealDate
        ? Controller.get_hijri_weekday_label(currentRealDate)
        : '—';
    }
  }

  function updateTeacherButtonsActive() {
    if (!teacherButtonsEl) return;
    const selectedId = teacherSelect.value;
    Array.from(teacherButtonsEl.querySelectorAll('button[data-teacher-id]')).forEach((btn) => {
      if (btn.dataset.teacherId === selectedId) {
        btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
        btn.classList.add('bg-emerald-100', 'text-emerald-800', 'border-emerald-500');
      } else {
        btn.classList.remove('bg-emerald-100', 'text-emerald-800', 'border-emerald-500');
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

  function getStudentAgeLabel(stu) {
    if (!stu.hijri_birth_year) return 'العمر: غير محدد';
    const birthYear = parseInt(stu.hijri_birth_year, 10);
    if (!birthYear) return 'العمر: غير محدد';
    const nowStr = Controller.get_current_local_hijri_date();
    const parts = nowStr.split('/');
    const nowYear = parseInt(parts[2], 10) || 1447;
    const age = nowYear - birthYear;
    if (age < 0 || age > 80) return 'العمر: غير محدد';
    return `العمر: ${age} سنة`;
  }

  function renderSettingsManagement() {
    const studentsContainer = document.getElementById('settings-students-list');
    const teachersContainer = document.getElementById('settings-teachers-list');
    if (!studentsContainer || !teachersContainer) return;

    const archivedStudents = new Set(Controller.get_archived_students().map((id) => String(id)));
    const archivedTeachers = new Set(Controller.get_archived_teachers().map((id) => String(id)));
    const students = Controller.get_students();
    const teachers = Controller.get_teachers();

    studentsContainer.innerHTML = '';
    teachersContainer.innerHTML = '';

    if (!students.length) {
      const empty = document.createElement('div');
      empty.className = 'text-[11px] text-slate-400';
      empty.textContent = 'لا توجد بيانات طلاب بعد.';
      studentsContainer.appendChild(empty);
    } else {
      students.forEach((s) => {
        const row = document.createElement('div');
        row.className =
          'flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white border border-slate-200';
        const name = document.createElement('span');
        name.textContent = s.full_name;
        name.className = 'truncate';
        const btn = document.createElement('button');
        const isArchived = archivedStudents.has(String(s.id));
        btn.dataset.type = 'student';
        btn.dataset.id = String(s.id);
        btn.className =
          'px-2 py-0.5 rounded-full text-[10px] border ' +
          (isArchived
            ? 'bg-slate-100 text-slate-600 border-slate-300'
            : 'bg-amber-50 text-amber-700 border-amber-200');
        btn.textContent = isArchived ? 'مُؤرشف' : 'أرشفة';
        row.appendChild(name);
        row.appendChild(btn);
        studentsContainer.appendChild(row);
      });
    }

    if (!teachers.length) {
      const empty = document.createElement('div');
      empty.className = 'text-[11px] text-slate-400';
      empty.textContent = 'لا توجد بيانات معلمين بعد.';
      teachersContainer.appendChild(empty);
    } else {
      teachers.forEach((t) => {
        const row = document.createElement('div');
        row.className =
          'flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white border border-slate-200';
        const name = document.createElement('span');
        name.textContent = t.full_name;
        name.className = 'truncate';
        const btn = document.createElement('button');
        const isArchived = archivedTeachers.has(String(t.id));
        btn.dataset.type = 'teacher';
        btn.dataset.id = String(t.id);
        btn.className =
          'px-2 py-0.5 rounded-full text-[10px] border ' +
          (isArchived
            ? 'bg-slate-100 text-slate-600 border-slate-300'
            : 'bg-amber-50 text-amber-700 border-amber-200');
        btn.textContent = isArchived ? 'مُؤرشف' : 'أرشفة';
        row.appendChild(name);
        row.appendChild(btn);
        teachersContainer.appendChild(row);
      });
    }
  }

  function renderStudentStats() {
    if (!studentsStatsListEl) return;
    studentsStatsListEl.innerHTML = '';
    const students = Controller.get_students();
    if (!students.length) return;

    const teacherId = getSelectedTeacherId();
    const allProgressRows = Controller.get_daily_progress_rows();
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

    Controller.get_pending_entries().forEach((p) => {
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
      // Round totals to nearest 0.5 and avoid long floating numbers
      const roundedHifz = Math.round(hifz * 2) / 2;
      const roundedMur = Math.round(muragaa * 2) / 2;

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
      chipHifz.textContent = `حفظ: ${roundedHifz}`;

      const chipMur = document.createElement('div');
      chipMur.className =
        'px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100';
      chipMur.textContent = `مراجعة: ${roundedMur}`;

      stats.appendChild(chipHifz);
      stats.appendChild(chipMur);

      row.appendChild(name);
      row.appendChild(stats);
      studentsStatsListEl.appendChild(row);
    });
  }

  function bootstrap() {
    setConnectionStatus(Controller.is_online());
    window.addEventListener('online', () => {
      setConnectionStatus(true);
      backgroundSyncIfPossible();
    });
    window.addEventListener('offline', () => setConnectionStatus(false));

    initConfigUI();
    ensureHijriInputsDefault();

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

    if (Controller.is_authenticated()) {
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

