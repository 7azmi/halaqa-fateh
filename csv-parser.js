// CSV Parser for importing data from existing sheets

class CSVParser {
    constructor() {
        this.teachers = new Map();
        this.students = [];
        this.entries = [];
    }

    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    this.parseCSV(text);
                    resolve({
                        teachers: Array.from(this.teachers.values()),
                        students: this.students,
                        entries: this.entries
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file, 'UTF-8');
        });
    }

    parseCSV(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length < 3) {
            throw new Error('ملف CSV غير صالح');
        }

        // First line contains day numbers
        const dayNumbers = this.parseCSVLine(lines[0]);
        
        // Second line contains headers
        const headers = this.parseCSVLine(lines[1]);
        
        // Extract month/year from filename or use current date
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        // Process student rows (skip first 2 header lines and empty lines)
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i];
            if (!line || line.trim() === '' || this.isEmptyRow(line)) {
                continue;
            }

            const values = this.parseCSVLine(line);
            
            if (values.length < 4) continue;

            const studentName = values[0]?.trim();
            const surah = values[1]?.trim();
            const age = parseInt(values[2]) || 0;
            const teacherName = values[3]?.trim();

            if (!studentName || !teacherName) continue;

            // Add teacher if not exists
            if (!this.teachers.has(teacherName)) {
                this.teachers.set(teacherName, {
                    name: teacherName,
                    originalName: teacherName
                });
            }

            // Add student
            const student = {
                name: studentName,
                surah: surah,
                age: age,
                teacherName: teacherName,
                originalRow: i
            };
            this.students.push(student);

            // Parse daily entries (starting from column 4)
            // Format: attendance (index 4), then pairs of (memorization, review) for each day
            let columnIndex = 4;
            const totalAttendance = parseFloat(values[columnIndex]) || 0;
            columnIndex++;

            // Skip the next column which is total memorization
            columnIndex++;

            // Skip the next column which is total review  
            columnIndex++;

            // Now parse daily entries
            // Each day has 2 columns: memorization, review
            let dayIndex = 1;
            while (columnIndex < values.length && dayIndex <= 30) {
                const memorization = parseFloat(values[columnIndex]) || 0;
                const review = parseFloat(values[columnIndex + 1]) || 0;
                
                // Only add entry if there's some data
                if (memorization > 0 || review > 0) {
                    const entryDate = `${year}-${String(month).padStart(2, '0')}-${String(dayIndex).padStart(2, '0')}`;
                    
                    this.entries.push({
                        studentName: studentName,
                        teacherName: teacherName,
                        date: entryDate,
                        attended: true,
                        memorization: memorization,
                        review: review,
                        originalRow: i,
                        day: dayIndex
                    });
                }
                
                columnIndex += 2;
                dayIndex++;
            }
        }
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    isEmptyRow(line) {
        const values = this.parseCSVLine(line);
        return values.every(v => !v || v.trim() === '');
    }

    async importToDatabase(database) {
        try {
            // First, import teachers and create a mapping
            const teacherMap = new Map();
            for (const teacher of this.teachers.values()) {
                const teacherId = await database.addTeacher(teacher);
                teacherMap.set(teacher.name, teacherId);
            }

            // Then import students with teacher IDs
            const studentMap = new Map();
            for (const student of this.students) {
                const teacherId = teacherMap.get(student.teacherName);
                const studentData = {
                    name: student.name,
                    surah: student.surah,
                    age: student.age,
                    teacherId: teacherId
                };
                const studentId = await database.addStudent(studentData);
                studentMap.set(`${student.name}_${student.teacherName}`, studentId);
            }

            // Finally import entries with student IDs
            for (const entry of this.entries) {
                const studentId = studentMap.get(`${entry.studentName}_${entry.teacherName}`);
                if (studentId) {
                    const entryData = {
                        studentId: studentId,
                        date: entry.date,
                        attended: entry.attended,
                        memorization: entry.memorization,
                        review: entry.review
                    };
                    
                    // Check if entry already exists for this student and date
                    try {
                        await database.addEntry(entryData);
                    } catch (error) {
                        // Entry might already exist, skip it
                        console.log('Entry already exists, skipping:', entry.date, entry.studentName);
                    }
                }
            }

            return {
                teachersCount: this.teachers.size,
                studentsCount: this.students.length,
                entriesCount: this.entries.length
            };
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }
}

// Export function for generating CSV from current data
async function exportToCSV(database, month, year) {
    const students = await database.getActiveStudents();
    const teachers = await database.getActiveTeachers();
    
    // Create teacher map
    const teacherMap = new Map();
    teachers.forEach(t => teacherMap.set(t.id, t.name));

    // Get entries for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const entries = await database.getEntriesInRange(startDate, endDate);

    // Create entries map by student and day
    const entriesMap = new Map();
    entries.forEach(entry => {
        const day = parseInt(entry.date.split('-')[2]);
        const key = `${entry.studentId}_${day}`;
        entriesMap.set(key, entry);
    });

    // Build CSV
    let csv = '';
    
    // Header row 1: Day numbers
    const daysInMonth = new Date(year, month, 0).getDate();
    csv += ',,,,,,,';
    for (let day = 1; day <= daysInMonth; day++) {
        csv += `${day},,`;
    }
    csv += '\n';

    // Header row 2: Column names
    csv += 'اسم الطالب,يحفظ إلى سورة,العمر,الأستاذ,حضور,حفظ,مراجعة,';
    for (let day = 1; day <= daysInMonth; day++) {
        csv += 'حفظ,مراجعة,';
    }
    csv += '\n';

    // Empty row
    csv += '\n';

    // Student rows
    for (const student of students) {
        const teacherName = teacherMap.get(student.teacherId) || '';
        
        // Calculate totals
        let totalAttendance = 0;
        let totalMemorization = 0;
        let totalReview = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const key = `${student.id}_${day}`;
            const entry = entriesMap.get(key);
            if (entry && entry.attended) {
                totalAttendance++;
                totalMemorization += entry.memorization || 0;
                totalReview += entry.review || 0;
            }
        }

        csv += `${student.name},${student.surah || ''},${student.age || ''},${teacherName},`;
        csv += `${totalAttendance},${totalMemorization},${totalReview},`;

        // Daily entries
        for (let day = 1; day <= daysInMonth; day++) {
            const key = `${student.id}_${day}`;
            const entry = entriesMap.get(key);
            if (entry) {
                csv += `${entry.memorization || ''},${entry.review || ''},`;
            } else {
                csv += ',,';
            }
        }
        csv += '\n';
    }

    return csv;
}

function downloadCSV(content, filename) {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
