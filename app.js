// --- Data Manager Module ---
const DataManager = {
    users: [],
    teachers: [],
    students: [],
    monthlyData: {},
    currentHijriDate: null,

    async init() {
        await this.loadUsers();
        this.currentHijriDate = this.getCurrentHijriDate();
    },

    async loadUsers() {
        try {
            const response = await fetch('data/database/Users.csv');
            const text = await response.text();
            const lines = text.trim().split('\n');
            
            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',');
                const userId = parseInt(parts[0]);
                const name = parts[1];
                const birthYear = parts[2] || '';
                
                const user = { id: userId, name, birthYear, archived: false };
                this.users.push(user);
                
                if (userId < 0) {
                    this.teachers.push(user);
                } else {
                    this.students.push(user);
                }
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    },

    async loadMonthData(year, month) {
        const key = `${year}-${month}`;
        if (this.monthlyData[key]) {
            return this.monthlyData[key];
        }

        try {
            const response = await fetch(`data/database/${year}/${month}.csv`);
            const text = await response.text();
            const lines = text.trim().split('\n');
            
            const data = {};
            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',');
                const studentId = parseInt(parts[0]);
                const teacherId = parseInt(parts[1]);
                const day = parseInt(parts[2]);
                const hifz = parts[3] || '';
                const murajaah = parts[4] || '';
                
                if (!data[studentId]) {
                    data[studentId] = {};
                }
                
                data[studentId][day] = {
                    teacherId,
                    hifz,
                    muragaa: murajaah,
                    attendedOnly: false
                };
            }
            
            this.monthlyData[key] = data;
            return data;
        } catch (error) {
            console.error(`Error loading month data ${year}/${month}:`, error);
            this.monthlyData[key] = {};
            return {};
        }
    },

    async saveMonthData(year, month, data) {
        const key = `${year}-${month}`;
        this.monthlyData[key] = data;
        
        // Convert to CSV format
        let csv = 'student_id,teacher_id,day,hifz,murajaah\n';
        
        for (const [studentId, days] of Object.entries(data)) {
            for (const [day, entry] of Object.entries(days)) {
                if (entry.hifz || entry.muragaa || entry.attendedOnly) {
                    const teacherId = entry.teacherId || -1;
                    const hifz = entry.hifz || '';
                    const muragaa = entry.muragaa || '';
                    csv += `${studentId},${teacherId},${day},${hifz},${muragaa}\n`;
                }
            }
        }
        
        // Store in localStorage for now (since we can't write files directly)
        localStorage.setItem(`halqa_month_${key}`, csv);
        showSaveIndicator();
    },

    getCurrentHijriDate() {
        try {
            const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric'
            });
            const parts = formatter.formatToParts(new Date());
            
            const yearPart = parts.find(p => p.type === 'year');
            const monthPart = parts.find(p => p.type === 'month');
            const dayPart = parts.find(p => p.type === 'day');
            
            let year = yearPart ? parseInt(yearPart.value) : 1447;
            let month = monthPart ? parseInt(monthPart.value) : 5;
            let day = dayPart ? parseInt(dayPart.value) : 1;
            
            // Validate the parsed values
            if (isNaN(year) || year < 1400 || year > 1500) year = 1447;
            if (isNaN(month) || month < 1 || month > 12) month = 5;
            if (isNaN(day) || day < 1 || day > 30) day = 1;
            
            console.log('Hijri date parsed:', { year, month, day });
            return { year, month, day };
        } catch (error) {
            console.error('Error parsing Hijri date:', error);
            // Return current known date as fallback
            return { year: 1447, month: 5, day: 1 };
        }
    },

    getHijriDateString() {
        return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date());
    },

    isMonthEditable(year, month) {
        const current = this.currentHijriDate;
        if (year === current.year && month === current.month) return true;
        
        // Previous month
        let prevMonth = current.month - 1;
        let prevYear = current.year;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear--;
        }
        if (year === prevYear && month === prevMonth) return true;
        
        // Next month
        let nextMonth = current.month + 1;
        let nextYear = current.year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }
        if (year === nextYear && month === nextMonth) return true;
        
        return false;
    },

    async addStudent(name, birthYear = '') {
        const newId = Math.max(...this.students.map(s => s.id), 0) + 1;
        const student = { id: newId, name, birthYear, archived: false };
        this.students.push(student);
        this.users.push(student);
        await this.saveUsers();
        return student;
    },

    async addTeacher(name) {
        const newId = Math.min(...this.teachers.map(t => t.id), -1) - 1;
        const teacher = { id: newId, name, birthYear: '', archived: false };
        this.teachers.push(teacher);
        this.users.push(teacher);
        await this.saveUsers();
        return teacher;
    },

    async toggleArchiveUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.archived = !user.archived;
            await this.saveUsers();
        }
    },

    async saveUsers() {
        let csv = 'user_id,name,birth_year\n';
        for (const user of this.users) {
            csv += `${user.id},${user.name},${user.birthYear || ''}\n`;
        }
        localStorage.setItem('halqa_users', csv);
        showSaveIndicator();
    },

    getActiveStudents() {
        return this.students.filter(s => !s.archived);
    },

    getArchivedStudents() {
        return this.students.filter(s => s.archived);
    },

    getActiveTeachers() {
        return this.teachers.filter(t => !t.archived);
    }
};

// --- App State ---
let state = {
    view: 'daily', // 'daily' or 'students'
    selectedYear: null,
    selectedMonth: null,
    selectedDay: 1,
    selectedTeacher: 'all',
    data: {} // Current month data
};

// --- Utility Functions ---
function showSaveIndicator() {
    const el = document.getElementById('offline-indicator');
    el.classList.remove('opacity-0');
    setTimeout(() => el.classList.add('opacity-0'), 2000);
}

// --- Initialization ---
async function init() {
    await DataManager.init();
    
    // Set initial date to current Hijri date
    const current = DataManager.currentHijriDate;
    state.selectedYear = current.year;
    state.selectedMonth = current.month;
    state.selectedDay = current.day;
    
    // Load current month data
    state.data = await DataManager.loadMonthData(state.selectedYear, state.selectedMonth);
    
    document.getElementById('hijri-date').textContent = DataManager.getHijriDateString();
    document.getElementById('month-year').textContent = getMonthYearText();
    
    render();
}

function getMonthYearText() {
    const monthNames = [
        'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
        'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];
    return `${monthNames[state.selectedMonth - 1]} ${state.selectedYear}`;
}

// --- Navigation Actions ---
async function goToPreviousMonth() {
    state.selectedMonth--;
    if (state.selectedMonth < 1) {
        state.selectedMonth = 12;
        state.selectedYear--;
    }
    state.data = await DataManager.loadMonthData(state.selectedYear, state.selectedMonth);
    document.getElementById('month-year').textContent = getMonthYearText();
    render();
}

async function goToNextMonth() {
    state.selectedMonth++;
    if (state.selectedMonth > 12) {
        state.selectedMonth = 1;
        state.selectedYear++;
    }
    state.data = await DataManager.loadMonthData(state.selectedYear, state.selectedMonth);
    document.getElementById('month-year').textContent = getMonthYearText();
    render();
}

async function goToToday() {
    const current = DataManager.currentHijriDate;
    state.selectedYear = current.year;
    state.selectedMonth = current.month;
    state.selectedDay = current.day;
    state.data = await DataManager.loadMonthData(state.selectedYear, state.selectedMonth);
    document.getElementById('month-year').textContent = getMonthYearText();
    if (state.view === 'students') {
        state.view = 'daily';
    }
    render();
}

// --- View Actions ---
function switchView(view) {
    state.view = view;
    render();
}

function setTeacher(teacher) {
    state.selectedTeacher = teacher;
    render();
}

function setDay(day) {
    state.selectedDay = day;
    render();
}

// --- Data Actions ---
function updateScore(studentId, day, type, value) {
    if (!state.data[studentId]) state.data[studentId] = {};
    if (!state.data[studentId][day]) {
        state.data[studentId][day] = { teacherId: -1, hifz: '', muragaa: '', attendedOnly: false };
    }

    const entry = state.data[studentId][day];

    if (type === 'attendedOnly') {
        entry.attendedOnly = value;
        if (value) {
            entry.hifz = '';
            entry.muragaa = '';
        }
    } else {
        entry[type] = value;
        if (value !== '' && value !== null) {
            entry.attendedOnly = false;
        }
    }

    DataManager.saveMonthData(state.selectedYear, state.selectedMonth, state.data);
    render();
}

// --- User Management ---
async function showAddStudentDialog() {
    const name = prompt('اسم الطالب الجديد:');
    if (name && name.trim()) {
        await DataManager.addStudent(name.trim());
        render();
    }
}

async function showAddTeacherDialog() {
    const name = prompt('اسم الشيخ الجديد:');
    if (name && name.trim()) {
        await DataManager.addTeacher(name.trim());
        render();
    }
}

async function toggleArchiveStudent(studentId) {
    await DataManager.toggleArchiveUser(studentId);
    render();
}

// --- Rendering ---
function render() {
    updateHeader();
    const main = document.getElementById('main-content');
    main.innerHTML = '';

    if (state.view === 'daily') {
        renderDailyView(main);
    } else {
        renderStudentsView(main);
    }
}

function updateHeader() {
    const btnDaily = document.getElementById('btn-view-daily');
    const btnStudents = document.getElementById('btn-view-students');

    const activeClass = 'bg-white text-emerald-700 shadow-sm';
    const inactiveClass = 'text-emerald-100 hover:bg-emerald-600/50';

    if (state.view === 'daily') {
        btnDaily.className = `px-3 py-1.5 rounded-md text-sm transition-all font-medium ${activeClass}`;
        btnStudents.className = `px-3 py-1.5 rounded-md text-sm transition-all font-medium ${inactiveClass}`;
    } else {
        btnDaily.className = `px-3 py-1.5 rounded-md text-sm transition-all font-medium ${inactiveClass}`;
        btnStudents.className = `px-3 py-1.5 rounded-md text-sm transition-all font-medium ${activeClass}`;
    }
}

function renderDailyView(container) {
    const isEditable = DataManager.isMonthEditable(state.selectedYear, state.selectedMonth);
    
    // Month Navigator
    const monthNav = document.createElement('div');
    monthNav.className = 'flex items-center justify-between mb-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100 sticky top-20 z-40';
    monthNav.innerHTML = `
        <button onclick="goToPreviousMonth()" class="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <div class="text-center">
            <div class="text-sm font-bold text-emerald-600" id="month-year-display">${getMonthYearText()}</div>
            ${!isEditable ? '<div class="text-xs text-amber-600">للعرض فقط</div>' : ''}
        </div>
        <button onclick="goToNextMonth()" class="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
    `;
    container.appendChild(monthNav);

    // Day Selector
    const dayNav = document.createElement('div');
    dayNav.className = 'flex items-center justify-between mb-6 bg-white p-2 rounded-xl shadow-sm border border-slate-100';
    dayNav.innerHTML = `
        <button onclick="setDay(${Math.max(1, state.selectedDay - 1)})" class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-30" ${state.selectedDay <= 1 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <div class="text-center">
            <div class="text-xs text-slate-500 font-medium">اليوم المحدد</div>
            <div class="text-xl font-bold text-emerald-600">اليوم ${state.selectedDay}</div>
        </div>
        <button onclick="setDay(${Math.min(30, state.selectedDay + 1)})" class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-30" ${state.selectedDay >= 30 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
    `;
    container.appendChild(dayNav);

    // Teacher Filter
    const filter = document.createElement('div');
    filter.className = 'flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2';
    
    let filterHTML = `<button onclick="setTeacher('all')" class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${state.selectedTeacher === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}">الكل</button>`;
    
    DataManager.getActiveTeachers().forEach(teacher => {
        filterHTML += `<button onclick="setTeacher(${teacher.id})" class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${state.selectedTeacher === teacher.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}">حلقة ${teacher.name}</button>`;
    });
    
    filter.innerHTML = filterHTML;
    container.appendChild(filter);

    // Students List
    const studentsList = document.createElement('div');
    studentsList.className = 'space-y-3';

    let filteredStudents = DataManager.getActiveStudents();
    if (state.selectedTeacher !== 'all') {
        filteredStudents = filteredStudents.filter(s => {
            const entry = state.data[s.id]?.[state.selectedDay];
            return entry?.teacherId === state.selectedTeacher;
        });
    }

    // Sort: active students on top
    filteredStudents.sort((a, b) => {
        const aHasData = state.data[a.id]?.[state.selectedDay];
        const bHasData = state.data[b.id]?.[state.selectedDay];
        if (aHasData && !bHasData) return -1;
        if (!aHasData && bHasData) return 1;
        return 0;
    });

    filteredStudents.forEach(student => {
        const entry = state.data[student.id]?.[state.selectedDay] || { teacherId: -1, hifz: '', muragaa: '', attendedOnly: false };
        const isAttendedOnly = entry.attendedOnly;

        const card = document.createElement('div');
        card.className = `bg-white rounded-xl p-4 shadow-sm border transition-all ${isAttendedOnly ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100'}`;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                        ${student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                        <div class="font-bold text-slate-800">${student.name}</div>
                    </div>
                </div>
                ${isEditable ? `
                <button onclick="updateScore(${student.id}, ${state.selectedDay}, 'attendedOnly', ${!isAttendedOnly})"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isAttendedOnly ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}">
                    ${isAttendedOnly ?
                        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> حاضر` :
                        'حضور فقط'}
                </button>
                ` : ''}
            </div>

            ${isAttendedOnly ? `
                <div class="text-center py-2 text-sm text-emerald-600 font-medium bg-emerald-100/50 rounded-lg">
                    تم تسجيل الحضور
                </div>
            ` : `
                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                        <label class="text-xs font-medium text-slate-500 block">الحفظ</label>
                        <input type="number" inputmode="decimal" step="0.5" placeholder="-"
                            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            value="${entry.hifz}"
                            onchange="updateScore(${student.id}, ${state.selectedDay}, 'hifz', this.value)"
                            ${!isEditable ? 'disabled' : ''}
                        >
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-xs font-medium text-slate-500 block">المراجعة</label>
                        <input type="number" inputmode="decimal" step="0.5" placeholder="-"
                            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value="${entry.muragaa}"
                            onchange="updateScore(${student.id}, ${state.selectedDay}, 'muragaa', this.value)"
                            ${!isEditable ? 'disabled' : ''}
                        >
                    </div>
                </div>
            `}
        `;
        studentsList.appendChild(card);
    });

    container.appendChild(studentsList);
    
    // Add Student Button
    if (isEditable) {
        const addButton = document.createElement('div');
        addButton.className = 'mt-6 text-center';
        addButton.innerHTML = `
            <button onclick="showAddStudentDialog()" class="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md">
                + إضافة طالب جديد
            </button>
        `;
        container.appendChild(addButton);
    }
}

function renderStudentsView(container) {
    // Teacher Filter
    const filter = document.createElement('div');
    filter.className = 'flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2';
    
    let filterHTML = `<button onclick="setTeacher('all')" class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${state.selectedTeacher === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}">الكل</button>`;
    
    DataManager.getActiveTeachers().forEach(teacher => {
        filterHTML += `<button onclick="setTeacher(${teacher.id})" class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${state.selectedTeacher === teacher.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}">حلقة ${teacher.name}</button>`;
    });
    
    filter.innerHTML = filterHTML;
    container.appendChild(filter);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 gap-4';

    let filteredStudents = DataManager.getActiveStudents();
    if (state.selectedTeacher !== 'all') {
        // Filter by teacher from current month data
        filteredStudents = filteredStudents.filter(s => {
            if (!state.data[s.id]) return false;
            const days = Object.values(state.data[s.id]);
            return days.some(day => day.teacherId === state.selectedTeacher);
        });
    }

    filteredStudents.forEach(student => {
        // Calculate stats for current month
        let totalHifz = 0;
        let totalMuragaa = 0;
        let attendanceDays = 0;

        if (state.data[student.id]) {
            Object.values(state.data[student.id]).forEach(day => {
                const h = parseFloat(day.hifz) || 0;
                const m = parseFloat(day.muragaa) || 0;
                totalHifz += h;
                totalMuragaa += m;
                if (h > 0 || m > 0 || day.attendedOnly) {
                    attendanceDays++;
                }
            });
        }

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl p-5 shadow-sm border border-slate-100 slide-enter';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg text-slate-800">${student.name}</h3>
                </div>
                <div class="flex gap-2">
                    <div class="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                        ${attendanceDays} يوم حضور
                    </div>
                    <button onclick="toggleArchiveStudent(${student.id})" class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-amber-200 transition-colors">
                        أرشفة
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <div class="text-xs text-emerald-600 mb-1 font-medium">مجموع الحفظ</div>
                    <div class="text-2xl font-bold text-emerald-700">${totalHifz}</div>
                </div>
                <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div class="text-xs text-blue-600 mb-1 font-medium">مجموع المراجعة</div>
                    <div class="text-2xl font-bold text-blue-700">${totalMuragaa}</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
    
    // Add buttons
    const buttonRow = document.createElement('div');
    buttonRow.className = 'mt-6 flex gap-3 justify-center';
    buttonRow.innerHTML = `
        <button onclick="showAddStudentDialog()" class="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md">
            + إضافة طالب
        </button>
        <button onclick="showAddTeacherDialog()" class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md">
            + إضافة شيخ
        </button>
    `;
    container.appendChild(buttonRow);
    
    // Show archived students if any
    const archivedStudents = DataManager.getArchivedStudents();
    if (archivedStudents.length > 0) {
        const archivedSection = document.createElement('div');
        archivedSection.className = 'mt-8 pt-6 border-t border-slate-200';
        archivedSection.innerHTML = '<h3 class="font-bold text-slate-600 mb-4">الطلاب المؤرشفون</h3>';
        
        const archivedGrid = document.createElement('div');
        archivedGrid.className = 'grid grid-cols-1 gap-3';
        
        archivedStudents.forEach(student => {
            const card = document.createElement('div');
            card.className = 'bg-slate-50 rounded-lg p-4 border border-slate-200';
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-slate-600">${student.name}</span>
                    <button onclick="toggleArchiveStudent(${student.id})" class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-emerald-200 transition-colors">
                        استعادة
                    </button>
                </div>
            `;
            archivedGrid.appendChild(card);
        });
        
        archivedSection.appendChild(archivedGrid);
        container.appendChild(archivedSection);
    }
}

// Start app
init();
