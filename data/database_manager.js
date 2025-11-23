/**
 * Database Manager for Halaqa Fateh
 * Manages CSV-based database for students, teachers, and daily entries
 * Supports offline operation and import/export functionality
 */

class DatabaseManager {
  constructor() {
    this.users = [];
    this.dailyEntries = {}; // Format: {year: {month: []}}
  }

  // ========== USER MANAGEMENT ==========

  /**
   * Parse CSV text to array of objects
   */
  parseCSV(csvText, headers = null) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headerLine = headers || lines[0].split(',');
    const dataLines = headers ? lines : lines.slice(1);
    
    return dataLines.map(line => {
      const values = line.split(',');
      const obj = {};
      headerLine.forEach((header, index) => {
        obj[header.trim()] = values[index] ? values[index].trim() : '';
      });
      return obj;
    });
  }

  /**
   * Convert array of objects to CSV text
   */
  toCSV(data, headers) {
    if (data.length === 0) return headers.join(',') + '\n';
    
    const csvLines = [headers.join(',')];
    data.forEach(row => {
      const values = headers.map(header => row[header] || '');
      csvLines.push(values.join(','));
    });
    return csvLines.join('\n');
  }

  /**
   * Load users from CSV text
   */
  loadUsers(csvText) {
    this.users = this.parseCSV(csvText);
  }

  /**
   * Get all users
   */
  getUsers() {
    return this.users;
  }

  /**
   * Get all students (positive IDs)
   */
  getStudents() {
    return this.users.filter(u => parseInt(u.user_id) > 0);
  }

  /**
   * Get all teachers (negative IDs)
   */
  getTeachers() {
    return this.users.filter(u => parseInt(u.user_id) < 0);
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    return this.users.find(u => parseInt(u.user_id) === parseInt(userId));
  }

  /**
   * Create new user (student or teacher)
   */
  createUser(name, birthYear, isTeacher = false) {
    const existingIds = this.users.map(u => parseInt(u.user_id));
    let newId;
    
    if (isTeacher) {
      const teacherIds = existingIds.filter(id => id < 0);
      newId = teacherIds.length > 0 ? Math.min(...teacherIds) - 1 : -1;
    } else {
      const studentIds = existingIds.filter(id => id > 0);
      newId = studentIds.length > 0 ? Math.max(...studentIds) + 1 : 1;
    }

    const newUser = {
      user_id: newId.toString(),
      name: name,
      birth_year: birthYear || ''
    };
    
    this.users.push(newUser);
    return newUser;
  }

  /**
   * Update user
   */
  updateUser(userId, name, birthYear) {
    const user = this.getUserById(userId);
    if (user) {
      user.name = name;
      user.birth_year = birthYear || '';
      return user;
    }
    return null;
  }

  /**
   * Export users to CSV text
   */
  exportUsers() {
    return this.toCSV(this.users, ['user_id', 'name', 'birth_year']);
  }

  // ========== DAILY ENTRY MANAGEMENT ==========

  /**
   * Load daily entries for a specific month
   */
  loadDailyEntries(year, month, csvText) {
    if (!this.dailyEntries[year]) {
      this.dailyEntries[year] = {};
    }
    this.dailyEntries[year][month] = this.parseCSV(csvText);
  }

  /**
   * Get daily entries for a specific month
   */
  getDailyEntries(year, month) {
    if (this.dailyEntries[year] && this.dailyEntries[year][month]) {
      return this.dailyEntries[year][month];
    }
    return [];
  }

  /**
   * Get daily entry for a specific student on a specific day
   */
  getDailyEntry(year, month, day, studentId) {
    const entries = this.getDailyEntries(year, month);
    return entries.find(e => 
      parseInt(e.student_id) === parseInt(studentId) && 
      parseInt(e.day) === parseInt(day)
    );
  }

  /**
   * Create or update daily entry
   */
  createOrUpdateDailyEntry(year, month, day, studentId, teacherId, hifz, murajaah) {
    if (!this.dailyEntries[year]) {
      this.dailyEntries[year] = {};
    }
    if (!this.dailyEntries[year][month]) {
      this.dailyEntries[year][month] = [];
    }

    const entries = this.dailyEntries[year][month];
    const existingEntry = entries.find(e => 
      parseInt(e.student_id) === parseInt(studentId) && 
      parseInt(e.day) === parseInt(day)
    );

    const entry = {
      student_id: studentId.toString(),
      teacher_id: teacherId.toString(),
      day: day.toString(),
      hifz: hifz !== undefined && hifz !== null && hifz !== '' ? hifz.toString() : '',
      murajaah: murajaah !== undefined && murajaah !== null && murajaah !== '' ? murajaah.toString() : ''
    };

    if (existingEntry) {
      Object.assign(existingEntry, entry);
      return existingEntry;
    } else {
      entries.push(entry);
      return entry;
    }
  }

  /**
   * Export daily entries for a specific month to CSV text
   */
  exportDailyEntries(year, month) {
    const entries = this.getDailyEntries(year, month);
    return this.toCSV(entries, ['student_id', 'teacher_id', 'day', 'hifz', 'murajaah']);
  }

  // ========== STATISTICS ==========

  /**
   * Get monthly statistics for a student
   */
  getStudentMonthlyStats(year, month, studentId) {
    const entries = this.getDailyEntries(year, month).filter(e => 
      parseInt(e.student_id) === parseInt(studentId)
    );

    let totalHifz = 0;
    let totalMurajaah = 0;
    let daysPresent = 0;

    entries.forEach(entry => {
      if (entry.hifz && entry.hifz !== '') {
        totalHifz += parseFloat(entry.hifz);
      }
      if (entry.murajaah && entry.murajaah !== '') {
        totalMurajaah += parseFloat(entry.murajaah);
      }
      if ((entry.hifz && entry.hifz !== '') || (entry.murajaah && entry.murajaah !== '')) {
        daysPresent++;
      }
    });

    return {
      student_id: studentId,
      total_hifz: totalHifz,
      total_murajaah: totalMurajaah,
      days_present: daysPresent,
      entries: entries.length
    };
  }

  /**
   * Get monthly statistics for a teacher
   */
  getTeacherMonthlyStats(year, month, teacherId) {
    const entries = this.getDailyEntries(year, month).filter(e => 
      parseInt(e.teacher_id) === parseInt(teacherId)
    );

    const uniqueStudents = new Set(entries.map(e => e.student_id));

    return {
      teacher_id: teacherId,
      total_entries: entries.length,
      unique_students: uniqueStudents.size,
      students: Array.from(uniqueStudents)
    };
  }

  /**
   * Get all students' monthly stats sorted by performance
   */
  getAllStudentsMonthlyStats(year, month) {
    const students = this.getStudents();
    const stats = students.map(student => {
      const studentStats = this.getStudentMonthlyStats(year, month, student.user_id);
      return {
        ...student,
        ...studentStats
      };
    });

    // Sort by total progress (hifz + murajaah), then by days present
    stats.sort((a, b) => {
      const totalA = a.total_hifz + a.total_murajaah;
      const totalB = b.total_hifz + b.total_murajaah;
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      return b.days_present - a.days_present;
    });

    return stats;
  }

  /**
   * Get last activity date for a student
   */
  getStudentLastActivity(studentId, currentYear, currentMonth) {
    let lastActivityDate = null;

    // Check current and previous months
    const yearsToCheck = Object.keys(this.dailyEntries).map(y => parseInt(y)).sort((a, b) => b - a);
    
    for (const year of yearsToCheck) {
      const months = Object.keys(this.dailyEntries[year]).map(m => parseInt(m)).sort((a, b) => b - a);
      for (const month of months) {
        const entries = this.getDailyEntries(year, month).filter(e => 
          parseInt(e.student_id) === parseInt(studentId)
        );
        
        if (entries.length > 0) {
          const maxDay = Math.max(...entries.map(e => parseInt(e.day)));
          const activityDate = { year, month, day: maxDay };
          
          if (!lastActivityDate || 
              year > lastActivityDate.year ||
              (year === lastActivityDate.year && month > lastActivityDate.month) ||
              (year === lastActivityDate.year && month === lastActivityDate.month && maxDay > lastActivityDate.day)) {
            lastActivityDate = activityDate;
          }
        }
      }
    }

    return lastActivityDate;
  }

  /**
   * Check if student is inactive (no activity for 14+ days)
   */
  isStudentInactive(studentId, currentYear, currentMonth, currentDay) {
    const lastActivity = this.getStudentLastActivity(studentId, currentYear, currentMonth);
    if (!lastActivity) return true;

    // Simple day difference calculation (approximation)
    const daysDiff = this.calculateDaysDifference(
      lastActivity.year, lastActivity.month, lastActivity.day,
      currentYear, currentMonth, currentDay
    );

    return daysDiff >= 14;
  }

  /**
   * Calculate approximate days difference (simplified for Hijri calendar)
   */
  calculateDaysDifference(year1, month1, day1, year2, month2, day2) {
    const date1Total = year1 * 354 + month1 * 29.5 + day1;
    const date2Total = year2 * 354 + month2 * 29.5 + day2;
    return Math.abs(date2Total - date1Total);
  }

  // ========== IMPORT/EXPORT ==========

  /**
   * Export entire database to a structure suitable for ZIP creation
   */
  exportDatabase() {
    const files = {};
    
    // Export users
    files['Users.csv'] = this.exportUsers();
    
    // Export all daily entries
    Object.keys(this.dailyEntries).forEach(year => {
      Object.keys(this.dailyEntries[year]).forEach(month => {
        files[`${year}/${month}.csv`] = this.exportDailyEntries(year, month);
      });
    });

    return files;
  }

  /**
   * Import database from file structure
   */
  importDatabase(files) {
    // Reset current data
    this.users = [];
    this.dailyEntries = {};

    // Import users
    if (files['Users.csv']) {
      this.loadUsers(files['Users.csv']);
    }

    // Import daily entries
    Object.keys(files).forEach(path => {
      const match = path.match(/^(\d+)\/(\d+)\.csv$/);
      if (match) {
        const year = match[1];
        const month = match[2];
        this.loadDailyEntries(year, month, files[path]);
      }
    });
  }

  /**
   * Get all available years in the database
   */
  getAvailableYears() {
    return Object.keys(this.dailyEntries).map(y => parseInt(y)).sort((a, b) => b - a);
  }

  /**
   * Get all available months for a specific year
   */
  getAvailableMonths(year) {
    if (this.dailyEntries[year]) {
      return Object.keys(this.dailyEntries[year]).map(m => parseInt(m)).sort((a, b) => a - b);
    }
    return [];
  }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DatabaseManager;
}
