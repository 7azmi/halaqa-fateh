// Global state
let db = new DatabaseManager();
let currentYear = 1446;
let currentMonth = 1;
let currentDay = 1;
let statsYear = 1446;
let statsMonth = 1;

// Hijri month names
const hijriMonths = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
    'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

// Initialize app
async function initApp() {
    try {
        const usersResponse = await fetch('data/database/Users.csv');
        const usersText = await usersResponse.text();
        db.loadUsers(usersText);

        // Load sample data for available years/months
        const years = [1445, 1446, 1447];
        for (const year of years) {
            for (let month = 1; month <= 12; month++) {
                try {
                    const response = await fetch(`data/database/${year}/${month}.csv`);
                    if (response.ok) {
                        const text = await response.text();
                        db.loadDailyEntries(year, month, text);
                    }
                } catch (e) {
                    // Month doesn't exist, skip
                }
            }
        }

        // Set current date to latest available data
        const availableYears = db.getAvailableYears();
        if (availableYears.length > 0) {
            currentYear = availableYears[0];
            const availableMonths = db.getAvailableMonths(currentYear);
            if (availableMonths.length > 0) {
                currentMonth = availableMonths[availableMonths.length - 1];
            }
        }
        statsYear = currentYear;
        statsMonth = currentMonth;

        updateCalendarDisplay();
        renderStudentList();
        renderUsersList();
    } catch (error) {
        console.error('Error loading initial data:', error);
        document.getElementById('studentListContainer').innerHTML = 
            '<div class="error">خطأ في تحميل البيانات. يرجى استيراد قاعدة بيانات.</div>';
    }
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'stats') {
        renderStats();
    } else if (tabName === 'users') {
        renderUsersList();
    }
}

// Calendar navigation
function updateCalendarDisplay() {
    const dateStr = `${hijriMonths[currentMonth - 1]} ${currentYear} هـ - يوم ${currentDay}`;
    document.getElementById('currentDate').textContent = dateStr;
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    currentDay = 1;
    updateCalendarDisplay();
    renderStudentList();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    }
    currentDay = 1;
    updateCalendarDisplay();
    renderStudentList();
}

function prevDay() {
    currentDay--;
    if (currentDay < 1) {
        prevMonth();
        currentDay = 29;
    } else {
        updateCalendarDisplay();
        renderStudentList();
    }
}

function nextDay() {
    currentDay++;
    if (currentDay > 30) {
        nextMonth();
        currentDay = 1;
    } else {
        updateCalendarDisplay();
        renderStudentList();
    }
}

function goToToday() {
    const years = db.getAvailableYears();
    if (years.length > 0) {
        currentYear = years[0];
        const months = db.getAvailableMonths(currentYear);
        if (months.length > 0) {
            currentMonth = months[months.length - 1];
            currentDay = 1;
        }
    }
    updateCalendarDisplay();
    renderStudentList();
}

// Render student list
function renderStudentList() {
    const container = document.getElementById('studentListContainer');
    const students = db.getStudents();
    const teachers = db.getTeachers();

    if (students.length === 0) {
        container.innerHTML = '<div class="loading">لا يوجد طلاب. قم بإضافة طلاب من قسم "إدارة المستخدمين"</div>';
        return;
    }

    const statsData = db.getAllStudentsMonthlyStats(currentYear, currentMonth);

    let html = '';
    statsData.forEach(student => {
        const entry = db.getDailyEntry(currentYear, currentMonth, currentDay, student.user_id);
        const isInactive = db.isStudentInactive(student.user_id, currentYear, currentMonth, currentDay);
        
        const expandedId = `student-${student.user_id}`;
        
        html += `
            <div class="student-card ${isInactive ? 'inactive' : ''}" id="${expandedId}">
                <div class="student-header" onclick="toggleStudent('${expandedId}')">
                    <div>
                        <span class="student-name">${student.name}</span>
                        ${isInactive ? '<span class="inactive-badge">غير نشط</span>' : ''}
                    </div>
                    <span class="toggle-icon" id="${expandedId}-icon">▼</span>
                </div>
                
                <div class="student-stats">
                    <div class="stat-item">
                        <div class="stat-label">الحفظ الكلي</div>
                        <div class="stat-value">${student.total_hifz.toFixed(1)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">المراجعة الكلية</div>
                        <div class="stat-value">${student.total_murajaah.toFixed(1)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">أيام الحضور</div>
                        <div class="stat-value">${student.days_present}</div>
                    </div>
                </div>

                <div class="collapsible-content" id="${expandedId}-content">
                    <div class="entry-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>المعلم</label>
                                <select id="teacher-${student.user_id}">
                                    ${teachers.map(t => `
                                        <option value="${t.user_id}" ${entry && entry.teacher_id == t.user_id ? 'selected' : ''}>
                                            ${t.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>الحفظ</label>
                                <input type="number" step="0.5" id="hifz-${student.user_id}" 
                                       value="${entry ? entry.hifz : ''}" placeholder="0.0">
                            </div>
                            <div class="form-group">
                                <label>المراجعة</label>
                                <input type="number" step="0.5" id="murajaah-${student.user_id}" 
                                       value="${entry ? entry.murajaah : ''}" placeholder="0.0">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button class="btn" onclick="saveDailyEntry('${student.user_id}')">حفظ</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleStudent(cardId) {
    const content = document.getElementById(`${cardId}-content`);
    const icon = document.getElementById(`${cardId}-icon`);
    
    content.classList.toggle('expanded');
    icon.classList.toggle('rotated');
}

function saveDailyEntry(studentId) {
    const teacherId = document.getElementById(`teacher-${studentId}`).value;
    const hifz = document.getElementById(`hifz-${studentId}`).value;
    const murajaah = document.getElementById(`murajaah-${studentId}`).value;

    db.createOrUpdateDailyEntry(
        currentYear, 
        currentMonth, 
        currentDay, 
        studentId, 
        teacherId,
        hifz,
        murajaah
    );

    renderStudentList();
    showMessage('تم حفظ البيانات بنجاح', 'success');
}

// Statistics
function statsNavMonth(direction) {
    statsMonth += direction;
    if (statsMonth < 1) {
        statsMonth = 12;
        statsYear--;
    } else if (statsMonth > 12) {
        statsMonth = 1;
        statsYear++;
    }
    renderStats();
}

function renderStats() {
    document.getElementById('statsDate').textContent = `${hijriMonths[statsMonth - 1]} ${statsYear} هـ`;
    
    const container = document.getElementById('statsContainer');
    const studentsStats = db.getAllStudentsMonthlyStats(statsYear, statsMonth);

    if (studentsStats.length === 0) {
        container.innerHTML = '<div class="loading">لا توجد بيانات لهذا الشهر</div>';
        return;
    }

    let html = '<div class="stats-card"><h3>أفضل 10 طلاب</h3><div class="stats-list">';
    studentsStats.slice(0, 10).forEach((student, index) => {
        html += `
            <div class="stats-item">
                <span>${index + 1}. ${student.name}</span>
                <span>الحفظ: ${student.total_hifz.toFixed(1)} | المراجعة: ${student.total_murajaah.toFixed(1)}</span>
            </div>
        `;
    });
    html += '</div></div>';

    const teachers = db.getTeachers();
    html += '<div class="stats-card"><h3>إحصائيات المعلمين</h3><div class="stats-list">';
    teachers.forEach(teacher => {
        const stats = db.getTeacherMonthlyStats(statsYear, statsMonth, teacher.user_id);
        html += `
            <div class="stats-item">
                <span>${teacher.name}</span>
                <span>الطلاب: ${stats.unique_students} | السجلات: ${stats.total_entries}</span>
            </div>
        `;
    });
    html += '</div></div>';

    container.innerHTML = html;
}

// User management
function renderUsersList() {
    const container = document.getElementById('usersListContainer');
    const students = db.getStudents();
    const teachers = db.getTeachers();

    let html = '<h3 style="margin-top: 20px;">الطلاب</h3><div class="student-list">';
    students.forEach(student => {
        html += `
            <div class="student-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="student-name">${student.name}</span>
                        <div style="font-size: 12px; color: #666;">رقم: ${student.user_id}</div>
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        ${student.birth_year ? `المولود: ${student.birth_year}` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    html += '<h3 style="margin-top: 30px;">المعلمون</h3><div class="student-list">';
    teachers.forEach(teacher => {
        html += `
            <div class="student-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="student-name">${teacher.name}</span>
                        <div style="font-size: 12px; color: #666;">رقم: ${teacher.user_id}</div>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

// Add user modal
function showAddUserModal(isTeacher) {
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserBirthYear').value = '';
    document.getElementById('newUserIsTeacher').value = isTeacher;
    document.getElementById('addUserModal').classList.add('active');
}

function closeAddUserModal() {
    document.getElementById('addUserModal').classList.remove('active');
}

function saveNewUser() {
    const name = document.getElementById('newUserName').value.trim();
    const birthYear = document.getElementById('newUserBirthYear').value.trim();
    const isTeacher = document.getElementById('newUserIsTeacher').value === 'true';

    if (!name) {
        alert('يرجى إدخال الاسم');
        return;
    }

    db.createUser(name, birthYear, isTeacher);
    closeAddUserModal();
    renderUsersList();
    showMessage(`تمت إضافة ${isTeacher ? 'المعلم' : 'الطالب'} بنجاح`, 'success');
}

// Import/Export
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('importStatus');
    statusDiv.innerHTML = '<div class="loading">جارٍ استيراد البيانات...</div>';

    try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        const files = {};

        for (const [path, zipEntry] of Object.entries(zipContent.files)) {
            if (!zipEntry.dir && path.endsWith('.csv')) {
                const content = await zipEntry.async('text');
                const cleanPath = path.replace(/^database\//, '');
                files[cleanPath] = content;
            }
        }

        db.importDatabase(files);
        
        const availableYears = db.getAvailableYears();
        if (availableYears.length > 0) {
            currentYear = availableYears[0];
            const availableMonths = db.getAvailableMonths(currentYear);
            if (availableMonths.length > 0) {
                currentMonth = availableMonths[availableMonths.length - 1];
            }
        }
        statsYear = currentYear;
        statsMonth = currentMonth;

        updateCalendarDisplay();
        renderStudentList();
        renderUsersList();
        
        statusDiv.innerHTML = '<div class="success">تم استيراد البيانات بنجاح!</div>';
        setTimeout(() => statusDiv.innerHTML = '', 3000);
    } catch (error) {
        console.error('Import error:', error);
        statusDiv.innerHTML = '<div class="error">خطأ في استيراد البيانات</div>';
    }
}

async function handleExport() {
    const statusDiv = document.getElementById('importStatus');
    statusDiv.innerHTML = '<div class="loading">جارٍ تصدير البيانات...</div>';

    try {
        const zip = new JSZip();
        const files = db.exportDatabase();

        for (const [path, content] of Object.entries(files)) {
            zip.file(`database/${path}`, content);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `halaqa-fateh-backup-${currentYear}-${currentMonth}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        statusDiv.innerHTML = '<div class="success">تم تصدير البيانات بنجاح!</div>';
        setTimeout(() => statusDiv.innerHTML = '', 3000);
    } catch (error) {
        console.error('Export error:', error);
        statusDiv.innerHTML = '<div class="error">خطأ في تصدير البيانات</div>';
    }
}

function showMessage(message, type) {
    const div = document.createElement('div');
    div.className = type;
    div.textContent = message;
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.left = '50%';
    div.style.transform = 'translateX(-50%)';
    div.style.zIndex = '9999';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initApp);