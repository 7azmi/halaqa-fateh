// Database management using IndexedDB for offline storage

class Database {
    constructor() {
        this.dbName = 'HalaqaFatehDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Students store
                if (!db.objectStoreNames.contains('students')) {
                    const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
                    studentStore.createIndex('name', 'name', { unique: false });
                    studentStore.createIndex('teacherId', 'teacherId', { unique: false });
                    studentStore.createIndex('archived', 'archived', { unique: false });
                }

                // Teachers store
                if (!db.objectStoreNames.contains('teachers')) {
                    const teacherStore = db.createObjectStore('teachers', { keyPath: 'id', autoIncrement: true });
                    teacherStore.createIndex('name', 'name', { unique: false });
                    teacherStore.createIndex('archived', 'archived', { unique: false });
                }

                // Daily entries store
                if (!db.objectStoreNames.contains('entries')) {
                    const entryStore = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
                    entryStore.createIndex('studentId', 'studentId', { unique: false });
                    entryStore.createIndex('date', 'date', { unique: false });
                    entryStore.createIndex('studentDate', ['studentId', 'date'], { unique: true });
                }
            };
        });
    }

    // Generic CRUD operations
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Student-specific methods
    async addStudent(student) {
        const studentData = {
            name: student.name,
            surah: student.surah || '',
            age: student.age || 0,
            teacherId: student.teacherId,
            archived: false,
            createdAt: new Date().toISOString()
        };
        return this.add('students', studentData);
    }

    async getActiveStudents() {
        const students = await this.getAll('students');
        return students.filter(s => !s.archived);
    }

    async getStudentsByTeacher(teacherId) {
        return this.getByIndex('students', 'teacherId', teacherId);
    }

    async archiveStudent(id) {
        const student = await this.get('students', id);
        if (student) {
            student.archived = true;
            return this.update('students', student);
        }
    }

    async canArchiveStudent(id) {
        // Check if student has any entries in the current month
        const entries = await this.getByIndex('entries', 'studentId', id);
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const recentEntries = entries.filter(e => e.date.startsWith(currentMonth));
        return {
            canArchive: true,
            warning: recentEntries.length > 0 ? `هذا الطالب لديه ${recentEntries.length} سجل في الشهر الحالي` : null
        };
    }

    // Teacher-specific methods
    async addTeacher(teacher) {
        const teacherData = {
            name: teacher.name,
            archived: false,
            createdAt: new Date().toISOString()
        };
        return this.add('teachers', teacherData);
    }

    async getActiveTeachers() {
        const teachers = await this.getAll('teachers');
        return teachers.filter(t => !t.archived);
    }

    async archiveTeacher(id) {
        // Check if teacher has any active students
        const students = await this.getStudentsByTeacher(id);
        const activeStudents = students.filter(s => !s.archived);
        
        if (activeStudents.length > 0) {
            throw new Error(`لا يمكن أرشفة هذا الأستاذ لأن لديه ${activeStudents.length} طالب نشط`);
        }

        const teacher = await this.get('teachers', id);
        if (teacher) {
            teacher.archived = true;
            return this.update('teachers', teacher);
        }
    }

    async transferStudents(fromTeacherId, toTeacherId) {
        const students = await this.getStudentsByTeacher(fromTeacherId);
        const promises = students.map(student => {
            student.teacherId = toTeacherId;
            return this.update('students', student);
        });
        return Promise.all(promises);
    }

    // Entry-specific methods
    async addEntry(entry) {
        const entryData = {
            studentId: entry.studentId,
            date: entry.date,
            attended: entry.attended || false,
            memorization: entry.memorization || 0,
            review: entry.review || 0,
            createdAt: new Date().toISOString()
        };
        return this.add('entries', entryData);
    }

    async getEntryByStudentAndDate(studentId, date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index('studentDate');
            const request = index.get([studentId, date]);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getEntriesByDate(date) {
        return this.getByIndex('entries', 'date', date);
    }

    async getEntriesByStudent(studentId) {
        return this.getByIndex('entries', 'studentId', studentId);
    }

    async getEntriesInRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index('date');
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateEntry(entry) {
        return this.update('entries', entry);
    }

    // Bulk operations for import
    async bulkAddStudents(students) {
        const promises = students.map(student => this.addStudent(student));
        return Promise.all(promises);
    }

    async bulkAddTeachers(teachers) {
        const promises = teachers.map(teacher => this.addTeacher(teacher));
        return Promise.all(promises);
    }

    async bulkAddEntries(entries) {
        const promises = entries.map(entry => this.addEntry(entry));
        return Promise.all(promises);
    }

    // Clear all data
    async clearAllData() {
        const stores = ['students', 'teachers', 'entries'];
        const promises = stores.map(storeName => {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
        return Promise.all(promises);
    }
}

// Create global database instance
const db = new Database();
