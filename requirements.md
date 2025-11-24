# Halaqa Fateh - Requirements

## Functional Requirements

### Data Management
- [x] User can load student and teacher data from CSV files
- [x] User can load attendance data from monthly CSV files
- [x] User can save changes to localStorage (file writing will be implemented later)

### Navigation
- [x] User can navigate between months (previous/next)
- [x] User can navigate between days within a month (1-30)
- [x] User can press "Today" button to jump to current Hijri date
- [x] User can see current Hijri date and month/year displayed in header

### Data Entry & Viewing
- [x] User can edit attendance for current month and adjacent months (previous/next)
- [x] User can view (read-only) attendance for all other months
- [x] User can enter Hifz (memorization) scores for students
- [x] User can enter Murajaah (review) scores for students
- [x] User can mark student as "attended only" (present but no scores)
- [x] User can see visual feedback when data is saved

### Student Management
- [x] User can view list of active students
- [x] User can add new students
- [x] User can archive/hide students (without deleting them)
- [x] User can restore archived students
- [x] User can see active students sorted on top for easier data entry
- [x] User can view student statistics (total Hifz, Murajaah, attendance days)

### Teacher Management
- [x] User can view teachers from database
- [x] User can add new teachers
- [x] User can filter students by teacher/Halqa

### Views
- [x] User can switch between "Daily View" and "Students View"
- [x] User can filter students by teacher in both views
- [x] User can see attendance summary for each student in Students View

### User Experience
- [x] UI is responsive and mobile-friendly
- [x] Active students appear on top for efficient data entry
- [x] Read-only mode for non-editable months
- [x] Visual indicators for different states (attended, scores entered, archived)
- [x] Arabic RTL interface with proper localization
