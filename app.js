// Main Application Logic

class HalaqaApp {
    constructor() {
        this.currentView = 'daily-entry';
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.selectedTeacher = '';
        this.students = [];
        this.teachers = [];
        this.entries = new Map();
    }

    async init() {
        try {
            // Initialize database
            await db.init();
            
            // Load initial data
            await this.loadData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show initial view
            this.showView('daily-entry');
            
            // Set initial date
            document.getElementById('entryDate').value = this.selectedDate;
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('حدث خطأ في تحميل التطبيق');
        }
    }

    async loadData() {
        this.students = await db.getActiveStudents();
        this.teachers = await db.getActiveTeachers();
        
        // Load entries for selected date
        await this.loadEntriesForDate(this.selectedDate);
        
        // Update UI
        this.updateTeacherFilter();
        this.renderDailyEntryView();
    }

    async loadEntriesForDate(date) {
        const entries = await db.getEntriesByDate(date);
        this.entries.clear();
        entries.forEach(entry => {
            this.entries.set(entry.studentId, entry);
        });
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menuBtn').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.add('open');
        });

        document.getElementById('closeMenuBtn').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.remove('open');
        });

        // Navigation
        document.querySelectorAll('.side-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.showView(view);
                document.getElementById('sideMenu').classList.remove('open');
            });
        });

        // Date selector
        document.getElementById('entryDate').addEventListener('change', (e) => {
            this.selectedDate = e.target.value;
            this.loadEntriesForDate(this.selectedDate).then(() => {
                this.renderDailyEntryView();
            });
        });

        // Teacher filter
        document.getElementById('teacherFilter').addEventListener('change', (e) => {
            this.selectedTeacher = e.target.value;
            this.renderDailyEntryView();
        });

        // Add student button
        document.getElementById('addStudentBtn').addEventListener('click', () => {
            this.showAddStudentModal();
        });

        // Add teacher button
        document.getElementById('addTeacherBtn').addEventListener('click', () => {
            this.showAddTeacherModal();
        });

        // Import CSV
        document.getElementById('importBtn').addEventListener('click', () => {
            this.importCSV();
        });

        // Export buttons
        document.getElementById('exportCurrentMonthBtn').addEventListener('click', () => {
            this.exportCurrentMonth();
        });

        document.getElementById('exportAllDataBtn').addEventListener('click', () => {
            this.exportAllData();
        });

        // Clear data button
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.confirmClearData();
        });

        // Student search
        document.getElementById('studentSearch').addEventListener('input', (e) => {
            this.searchStudents(e.target.value);
        });

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.closeModal();
            }
        });
    }

    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const viewMap = {
            'daily-entry': 'dailyEntryView',
            'students': 'studentsView',
            'teachers': 'teachersView',
            'import': 'importView',
            'export': 'exportView',
            'settings': 'settingsView'
        };

        const viewId = viewMap[viewName];
        if (viewId) {
            document.getElementById(viewId).classList.add('active');
            this.currentView = viewName;

            // Load view-specific data
            switch (viewName) {
                case 'daily-entry':
                    this.renderDailyEntryView();
                    break;
                case 'students':
                    this.renderStudentsView();
                    break;
                case 'teachers':
                    this.renderTeachersView();
                    break;
            }
        }

        // Update active nav link
        document.querySelectorAll('.side-menu a').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            }
        });
    }

    updateTeacherFilter() {
        const select = document.getElementById('teacherFilter');
        select.innerHTML = '<option value="">جميع الأساتذة</option>';
        
        this.teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = teacher.name;
            select.appendChild(option);
        });
    }

    renderDailyEntryView() {
        const container = document.getElementById('studentsGrid');
        container.innerHTML = '';

        let filteredStudents = this.students;
        if (this.selectedTeacher) {
            filteredStudents = this.students.filter(s => s.teacherId == this.selectedTeacher);
        }

        if (filteredStudents.length === 0) {
            container.innerHTML = '<p class="text-center">لا يوجد طلاب</p>';
            return;
        }

        filteredStudents.forEach(student => {
            const card = this.createStudentCard(student);
            container.appendChild(card);
        });
    }

    createStudentCard(student) {
        const entry = this.entries.get(student.id) || {
            attended: false,
            memorization: 0,
            review: 0
        };

        const teacher = this.teachers.find(t => t.id === student.teacherId);
        const teacherName = teacher ? teacher.name : '';

        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
            <div class="student-card-header">
                <div class="student-info">
                    <h3>${student.name}</h3>
                    <div class="meta">
                        ${student.surah ? `يحفظ إلى: ${student.surah}` : ''} 
                        ${student.age ? `• العمر: ${student.age}` : ''}
                        ${teacherName ? `• الأستاذ: ${teacherName}` : ''}
                    </div>
                </div>
                <div class="attendance-toggle">
                    <label>حضور</label>
                    <input type="checkbox" ${entry.attended ? 'checked' : ''} 
                           data-student-id="${student.id}" class="attendance-checkbox">
                </div>
            </div>
            <div class="student-card-body">
                <div class="input-group">
                    <label>الحفظ (آيات)</label>
                    <input type="number" min="0" step="0.5" value="${entry.memorization || 0}" 
                           data-student-id="${student.id}" data-field="memorization" 
                           class="entry-input" ${!entry.attended ? 'disabled' : ''}>
                </div>
                <div class="input-group">
                    <label>المراجعة (آيات)</label>
                    <input type="number" min="0" step="0.5" value="${entry.review || 0}" 
                           data-student-id="${student.id}" data-field="review" 
                           class="entry-input" ${!entry.attended ? 'disabled' : ''}>
                </div>
            </div>
            <button class="btn btn-success save-btn" data-student-id="${student.id}">حفظ</button>
        `;

        // Add event listeners
        const checkbox = card.querySelector('.attendance-checkbox');
        checkbox.addEventListener('change', (e) => {
            const inputs = card.querySelectorAll('.entry-input');
            inputs.forEach(input => {
                input.disabled = !e.target.checked;
                if (!e.target.checked) {
                    input.value = 0;
                }
            });
        });

        const saveBtn = card.querySelector('.save-btn');
        saveBtn.addEventListener('click', () => {
            this.saveEntry(student.id, card);
        });

        return card;
    }

    async saveEntry(studentId, cardElement) {
        const attended = cardElement.querySelector('.attendance-checkbox').checked;
        const memorization = parseFloat(cardElement.querySelector('[data-field="memorization"]').value) || 0;
        const review = parseFloat(cardElement.querySelector('[data-field="review"]').value) || 0;

        const entryData = {
            studentId: studentId,
            date: this.selectedDate,
            attended: attended,
            memorization: memorization,
            review: review
        };

        try {
            // Check if entry exists
            const existingEntry = this.entries.get(studentId);
            
            if (existingEntry) {
                // Update existing entry
                existingEntry.attended = attended;
                existingEntry.memorization = memorization;
                existingEntry.review = review;
                await db.updateEntry(existingEntry);
            } else {
                // Add new entry
                const id = await db.addEntry(entryData);
                entryData.id = id;
                this.entries.set(studentId, entryData);
            }

            this.showToast('تم الحفظ بنجاح');
            
            // Visual feedback
            const btn = cardElement.querySelector('.save-btn');
            btn.textContent = '✓ تم الحفظ';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-secondary');
            
            setTimeout(() => {
                btn.textContent = 'حفظ';
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-success');
            }, 2000);
        } catch (error) {
            console.error('Error saving entry:', error);
            this.showToast('حدث خطأ في الحفظ');
        }
    }

    renderStudentsView() {
        const container = document.getElementById('studentsList');
        container.innerHTML = '';

        if (this.students.length === 0) {
            container.innerHTML = '<p class="text-center">لا يوجد طلاب</p>';
            return;
        }

        this.students.forEach(student => {
            const item = this.createStudentListItem(student);
            container.appendChild(item);
        });
    }

    createStudentListItem(student) {
        const teacher = this.teachers.find(t => t.id === student.teacherId);
        const teacherName = teacher ? teacher.name : 'غير محدد';

        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <h3>${student.name}</h3>
                <p>الأستاذ: ${teacherName} ${student.surah ? `• يحفظ إلى: ${student.surah}` : ''}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn" data-action="edit" title="تعديل">✏️</button>
                <button class="icon-btn" data-action="transfer" title="نقل">🔄</button>
                <button class="icon-btn danger" data-action="archive" title="أرشفة">🗄️</button>
            </div>
        `;

        // Event listeners
        item.querySelector('[data-action="edit"]').addEventListener('click', () => {
            this.showEditStudentModal(student);
        });

        item.querySelector('[data-action="transfer"]').addEventListener('click', () => {
            this.showTransferStudentModal(student);
        });

        item.querySelector('[data-action="archive"]').addEventListener('click', () => {
            this.confirmArchiveStudent(student);
        });

        return item;
    }

    renderTeachersView() {
        const container = document.getElementById('teachersList');
        container.innerHTML = '';

        if (this.teachers.length === 0) {
            container.innerHTML = '<p class="text-center">لا يوجد أساتذة</p>';
            return;
        }

        this.teachers.forEach(teacher => {
            const item = this.createTeacherListItem(teacher);
            container.appendChild(item);
        });
    }

    createTeacherListItem(teacher) {
        const studentsCount = this.students.filter(s => s.teacherId === teacher.id).length;

        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <h3>${teacher.name}</h3>
                <p>عدد الطلاب: ${studentsCount}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn" data-action="edit" title="تعديل">✏️</button>
                <button class="icon-btn danger" data-action="archive" title="أرشفة">🗄️</button>
            </div>
        `;

        // Event listeners
        item.querySelector('[data-action="edit"]').addEventListener('click', () => {
            this.showEditTeacherModal(teacher);
        });

        item.querySelector('[data-action="archive"]').addEventListener('click', () => {
            this.confirmArchiveTeacher(teacher);
        });

        return item;
    }

    searchStudents(query) {
        const container = document.getElementById('studentsList');
        const items = container.querySelectorAll('.list-item');
        
        items.forEach(item => {
            const name = item.querySelector('h3').textContent;
            if (name.toLowerCase().includes(query.toLowerCase())) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    showAddStudentModal() {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <h2>إضافة طالب جديد</h2>
            <form id="addStudentForm">
                <div class="form-group">
                    <label>الاسم *</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>يحفظ إلى سورة</label>
                    <input type="text" name="surah">
                </div>
                <div class="form-group">
                    <label>العمر</label>
                    <input type="number" name="age" min="0">
                </div>
                <div class="form-group">
                    <label>الأستاذ *</label>
                    <select name="teacherId" required>
                        <option value="">اختر الأستاذ</option>
                        ${this.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">إضافة</button>
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">إلغاء</button>
                </div>
            </form>
        `;

        document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addStudent(new FormData(e.target));
        });

        this.openModal();
    }

    showEditStudentModal(student) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <h2>تعديل بيانات الطالب</h2>
            <form id="editStudentForm">
                <div class="form-group">
                    <label>الاسم *</label>
                    <input type="text" name="name" value="${student.name}" required>
                </div>
                <div class="form-group">
                    <label>يحفظ إلى سورة</label>
                    <input type="text" name="surah" value="${student.surah || ''}">
                </div>
                <div class="form-group">
                    <label>العمر</label>
                    <input type="number" name="age" value="${student.age || ''}" min="0">
                </div>
                <div class="form-group">
                    <label>الأستاذ *</label>
                    <select name="teacherId" required>
                        ${this.teachers.map(t => 
                            `<option value="${t.id}" ${t.id === student.teacherId ? 'selected' : ''}>${t.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">حفظ</button>
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">إلغاء</button>
                </div>
            </form>
        `;

        document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateStudent(student.id, new FormData(e.target));
        });

        this.openModal();
    }

    showTransferStudentModal(student) {
        const currentTeacher = this.teachers.find(t => t.id === student.teacherId);
        
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <h2>نقل الطالب</h2>
            <p>نقل <strong>${student.name}</strong> من الأستاذ <strong>${currentTeacher?.name}</strong> إلى:</p>
            <form id="transferStudentForm">
                <div class="form-group">
                    <label>الأستاذ الجديد *</label>
                    <select name="teacherId" required>
                        <option value="">اختر الأستاذ</option>
                        ${this.teachers.filter(t => t.id !== student.teacherId).map(t => 
                            `<option value="${t.id}">${t.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">نقل</button>
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">إلغاء</button>
                </div>
            </form>
        `;

        document.getElementById('transferStudentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await this.updateStudent(student.id, formData);
        });

        this.openModal();
    }

    async addStudent(formData) {
        try {
            const studentData = {
                name: formData.get('name'),
                surah: formData.get('surah'),
                age: parseInt(formData.get('age')) || 0,
                teacherId: parseInt(formData.get('teacherId'))
            };

            await db.addStudent(studentData);
            await this.loadData();
            this.closeModal();
            this.showToast('تمت إضافة الطالب بنجاح');
        } catch (error) {
            console.error('Error adding student:', error);
            this.showToast('حدث خطأ في إضافة الطالب');
        }
    }

    async updateStudent(id, formData) {
        try {
            const student = await db.get('students', id);
            student.name = formData.get('name');
            student.surah = formData.get('surah');
            student.age = parseInt(formData.get('age')) || 0;
            student.teacherId = parseInt(formData.get('teacherId'));

            await db.update('students', student);
            await this.loadData();
            this.closeModal();
            this.showToast('تم تحديث بيانات الطالب بنجاح');
        } catch (error) {
            console.error('Error updating student:', error);
            this.showToast('حدث خطأ في تحديث بيانات الطالب');
        }
    }

    async confirmArchiveStudent(student) {
        const result = await db.canArchiveStudent(student.id);
        
        let message = `هل أنت متأكد من أرشفة الطالب ${student.name}؟`;
        if (result.warning) {
            message += `\n\n⚠️ ${result.warning}`;
        }

        if (confirm(message)) {
            try {
                await db.archiveStudent(student.id);
                await this.loadData();
                this.showToast('تمت أرشفة الطالب بنجاح');
            } catch (error) {
                console.error('Error archiving student:', error);
                this.showToast('حدث خطأ في أرشفة الطالب');
            }
        }
    }

    showAddTeacherModal() {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <h2>إضافة أستاذ جديد</h2>
            <form id="addTeacherForm">
                <div class="form-group">
                    <label>الاسم *</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">إضافة</button>
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">إلغاء</button>
                </div>
            </form>
        `;

        document.getElementById('addTeacherForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addTeacher(new FormData(e.target));
        });

        this.openModal();
    }

    showEditTeacherModal(teacher) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <h2>تعديل بيانات الأستاذ</h2>
            <form id="editTeacherForm">
                <div class="form-group">
                    <label>الاسم *</label>
                    <input type="text" name="name" value="${teacher.name}" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">حفظ</button>
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">إلغاء</button>
                </div>
            </form>
        `;

        document.getElementById('editTeacherForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateTeacher(teacher.id, new FormData(e.target));
        });

        this.openModal();
    }

    async addTeacher(formData) {
        try {
            const teacherData = {
                name: formData.get('name')
            };

            await db.addTeacher(teacherData);
            await this.loadData();
            this.closeModal();
            this.showToast('تمت إضافة الأستاذ بنجاح');
        } catch (error) {
            console.error('Error adding teacher:', error);
            this.showToast('حدث خطأ في إضافة الأستاذ');
        }
    }

    async updateTeacher(id, formData) {
        try {
            const teacher = await db.get('teachers', id);
            teacher.name = formData.get('name');

            await db.update('teachers', teacher);
            await this.loadData();
            this.closeModal();
            this.showToast('تم تحديث بيانات الأستاذ بنجاح');
        } catch (error) {
            console.error('Error updating teacher:', error);
            this.showToast('حدث خطأ في تحديث بيانات الأستاذ');
        }
    }

    async confirmArchiveTeacher(teacher) {
        try {
            if (confirm(`هل أنت متأكد من أرشفة الأستاذ ${teacher.name}؟`)) {
                await db.archiveTeacher(teacher.id);
                await this.loadData();
                this.showToast('تمت أرشفة الأستاذ بنجاح');
            }
        } catch (error) {
            console.error('Error archiving teacher:', error);
            alert(error.message);
        }
    }

    async importCSV() {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showToast('الرجاء اختيار ملف CSV');
            return;
        }

        this.showLoader();

        try {
            const parser = new CSVParser();
            const data = await parser.parseFile(file);
            
            const stats = await parser.importToDatabase(db);
            
            await this.loadData();
            
            const statusDiv = document.getElementById('importStatus');
            statusDiv.className = 'status-message success';
            statusDiv.textContent = `تم الاستيراد بنجاح: ${stats.teachersCount} أستاذ، ${stats.studentsCount} طالب، ${stats.entriesCount} سجل`;
            
            this.hideLoader();
            this.showToast('تم استيراد البيانات بنجاح');
        } catch (error) {
            console.error('Import error:', error);
            const statusDiv = document.getElementById('importStatus');
            statusDiv.className = 'status-message error';
            statusDiv.textContent = `حدث خطأ: ${error.message}`;
            this.hideLoader();
        }
    }

    async exportCurrentMonth() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        
        try {
            const csv = await exportToCSV(db, month, year);
            const filename = `halaqa-${year}-${String(month).padStart(2, '0')}.csv`;
            downloadCSV(csv, filename);
            this.showToast('تم تصدير البيانات بنجاح');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('حدث خطأ في تصدير البيانات');
        }
    }

    async exportAllData() {
        // Export all data as JSON backup
        try {
            const students = await db.getAll('students');
            const teachers = await db.getAll('teachers');
            const entries = await db.getAll('entries');
            
            const data = {
                students,
                teachers,
                entries,
                exportDate: new Date().toISOString()
            };
            
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `halaqa-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showToast('تم تصدير النسخة الاحتياطية بنجاح');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('حدث خطأ في التصدير');
        }
    }

    confirmClearData() {
        if (confirm('هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
            if (confirm('تأكيد نهائي: سيتم مسح جميع البيانات بشكل دائم!')) {
                this.clearAllData();
            }
        }
    }

    async clearAllData() {
        this.showLoader();
        try {
            await db.clearAllData();
            await this.loadData();
            this.hideLoader();
            this.showToast('تم مسح جميع البيانات');
        } catch (error) {
            console.error('Error clearing data:', error);
            this.hideLoader();
            this.showToast('حدث خطأ في مسح البيانات');
        }
    }

    openModal() {
        document.getElementById('modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
    }

    showLoader() {
        document.getElementById('loader').classList.remove('hidden');
    }

    hideLoader() {
        document.getElementById('loader').classList.add('hidden');
    }

    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HalaqaApp();
    app.init();
});
