# حلقة فاتح - Halaqa Fateh

نظام إدارة الحلقة القرآنية - إدارة الحضور والأداء للطلاب والمعلمين

A Quran center management system for daily data entry and monthly statistics tracking with Hijri calendar support.

## Features

### Core Functionality
- ✅ **Daily Data Entry**: Record student attendance, Hifz (memorization), and Murajaah (review)
- ✅ **Hijri Calendar**: Full support for Hijri calendar navigation
- ✅ **Student Management**: Add and manage students with unique IDs
- ✅ **Teacher Management**: Add and manage teachers with negative IDs
- ✅ **Monthly Statistics**: View performance statistics for students and teachers
- ✅ **Performance Sorting**: Students automatically sorted by performance
- ✅ **Inactive Tracking**: Automatic detection of inactive students (14+ days)
- ✅ **Import/Export**: Backup and restore database as ZIP files
- ✅ **100% Offline**: Works completely offline after initial load

### User Interface
- 🎨 Beautiful gradient design with Arabic RTL support
- 📱 Mobile-first responsive design
- 🔄 Collapsible student cards for efficient data entry
- 📊 Visual statistics dashboard
- ��️ Inactive student badges
- 🌙 Hijri month names in Arabic

## Technical Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Database**: CSV files (lightweight, portable)
- **Architecture**: Single-page application
- **Dependencies**: JSZip for import/export (CDN)

## Project Structure

```
halaqa-fateh/
├── index.html              # Main application UI
├── app.js                  # Application logic
├── data/
│   ├── database_manager.js # Database management class
│   └── database/
│       ├── Users.csv       # Students and teachers
│       ├── 1445/
│       │   └── 12.csv      # Daily entries for year 1445, month 12
│       ├── 1446/
│       │   ├── 1.csv
│       │   └── ...
│       └── 1447/
│           └── ...
└── design/
    └── db.umlplant         # Database schema diagram
```

## Database Schema

### Users.csv
```csv
user_id,name,birth_year
1,إسلام رشاد الصلاحي,
-1,خليل,
```
- Positive IDs: Students
- Negative IDs: Teachers

### {year}/{month}.csv
```csv
student_id,teacher_id,day,hifz,murajaah
1,-1,4,,3.0
1,-1,5,0.0,
```

## Getting Started

### Option 1: Open Directly
1. Download or clone the repository
2. Open `index.html` in your web browser
3. Start using the application!

### Option 2: Local Server (Recommended)
```bash
# Python 3
python -m http.server 8080

# Or Node.js
npx http-server -p 8080
```

Then navigate to `http://localhost:8080`

## Usage Guide

### Daily Data Entry
1. Navigate to the desired date using calendar controls
2. Click on a student card to expand the entry form
3. Select teacher, enter Hifz and Murajaah values
4. Click "حفظ" (Save) to record the entry

### View Statistics
1. Click "الإحصائيات" (Statistics) tab
2. Navigate between months to view different periods
3. See top 10 students and teacher statistics

### Manage Users
1. Click "إدارة المستخدمين" (User Management) tab
2. Use "إضافة طالب جديد" to add a new student
3. Use "إضافة معلم جديد" to add a new teacher

### Import/Export Database
1. Click "استيراد/تصدير" (Import/Export) tab
2. **Export**: Click "تصدير كملف ZIP" to download backup
3. **Import**: Click "اختيار ملف ZIP" to restore from backup

## Features in Detail

### Automatic Performance Sorting
Students are automatically sorted by:
1. Total progress (Hifz + Murajaah)
2. Days present (as tiebreaker)

### Inactive Student Detection
Students with no activity for 14+ days are:
- Marked with "غير نشط" (Inactive) badge
- Displayed with reduced opacity
- Can be easily identified for follow-up

### Teacher Assignment
- Teachers can be changed for each daily entry
- This allows flexible teacher-student relationships
- Historical records maintain their assigned teacher

### Hijri Calendar
- Supports years 1445-1447 (expandable)
- Arabic month names (محرم، صفر، etc.)
- Day-by-day navigation

## Database Management API

The `DatabaseManager` class provides comprehensive CRUD operations:

```javascript
// Create instance
const db = new DatabaseManager();

// Load data
db.loadUsers(csvText);
db.loadDailyEntries(year, month, csvText);

// Create entries
db.createUser(name, birthYear, isTeacher);
db.createOrUpdateDailyEntry(year, month, day, studentId, teacherId, hifz, murajaah);

// Read data
db.getStudents();
db.getTeachers();
db.getDailyEntries(year, month);

// Statistics
db.getAllStudentsMonthlyStats(year, month);
db.getTeacherMonthlyStats(year, month, teacherId);
db.isStudentInactive(studentId, year, month, day);

// Import/Export
db.exportDatabase(); // Returns file structure
db.importDatabase(files); // Restores from file structure
```

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Offline Support

The application works 100% offline:
- No server required after initial load
- All data stored in memory
- Import/export for data persistence
- No internet connection needed

## Security Considerations

For production deployment:
- **JSZip CDN**: Consider downloading JSZip library and hosting it locally, or add integrity check (SRI)
- **CSV Limitations**: Current CSV parser is simplified. User names should not contain commas
- **Import Validation**: ZIP imports are validated for file type, size (10MB limit), and path structure

## Future Enhancements

Potential improvements:
- Host JSZip locally with integrity check
- Enhanced CSV parser for complex values
- IndexedDB for persistent storage
- Print reports
- Advanced filtering
- Student progress charts
- Attendance reports
- Parent notifications

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available for use in Quran centers and educational institutions.

## Support

For issues or questions, please open an issue on GitHub.

---

**Made with ❤️ for Quran education**
