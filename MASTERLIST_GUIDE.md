# Masterlist Guide

## Overview

The masterlist has been successfully created from all raw data in the repository. This single sheet contains all student records from 18 monthly CSV files spanning 3 Hijri years.

## Files Created

1. **`data/masterlist.csv`** - CSV format (288 KB)
2. **`data/masterlist.xlsx`** - Excel format (295 KB)
3. **`data/README.md`** - Documentation

## What's in the Masterlist?

### Summary Statistics

- **Total Records**: 939 student-month entries
- **Unique Students**: 79 students tracked
- **Years Covered**: 1445, 1446, 1447 (Hijri)
- **Months**: 18 months of data
- **Teachers**: 8 teachers (خليل, محمد, عبدالله, and others)

### Data Breakdown by Year

**Year 1445** (5 months)
- 325 records
- 70 unique students
- Months: ذو الحجة, ذو القعدة, رجب, شعبان, شوال

**Year 1446** (9 months)
- 424 records
- 61 unique students
- Months: محرم through ذو الحجة

**Year 1447** (4 months)
- 190 records
- 50 unique students
- Months: محرم, صفر, ربيع أول, ربيع الآخر

### Column Structure (105 columns total)

#### 1. Metadata (3 columns)
- `Year` - Hijri year
- `Month` - Islamic month name
- `Source_File` - Original filename for traceability

#### 2. Student Information (4 columns)
- `Student_Name` - اسم الطالب
- `Age` - العمر
- `Teacher` - الأستاذ
- `Memorizing_To_Surah` - يحفظ إلى سورة

#### 3. Performance Summaries (5 columns)
- `Total_Attendance` - Total days attended (حضور)
- `Total_Memorization_Score` - Sum of all memorization scores (حفظ)
- `Days_With_Memorization` - Number of days with memorization activity
- `Total_Review_Score` - Sum of all review scores (مراجعة)
- `Days_With_Review` - Number of days with review activity

#### 4. Raw Daily Data (93 columns)
- All original daily performance data from the source files
- Includes: حفظ (memorization), مراجعة (review), حضور (attendance) for each day
- Column names prefixed with `Raw_`

### Performance Insights

- **Average Monthly Attendance**: 14.7 days
- **Average Memorization Score**: 3.6
- **Average Review Score**: 75.5
- **Age Range**: 5 to 80 years
- **Most Common Age**: 12 years (226 records)

### Top Students (by number of months recorded)
1. عبدالمطلب حمزة - 22 months
2. مالك عبدالقوي الصلوي - 22 months
3. عبدالمجيد ابراهيم المجيد - 21 months
4. حذيفة عبده قيراط - 21 months
5. هاشم عبدالملك شيوبة - 21 months

### Top Surahs Being Memorized
1. المرسلات - 65 records
2. الملك - 58 records
3. الجن - 50 records
4. المجادلة - 49 records
5. المزمل - 41 records

## How to Use the Masterlist

### For Database Design

The masterlist contains all possible data fields you might need. Use it to:

1. **Identify core entities**: Students, Teachers, Months, Performance Records
2. **Determine relationships**: Student → Teacher, Student → Monthly Performance
3. **Plan data types**: Numbers, text, dates
4. **Decide on normalization**: Which data should be in separate tables?

### Suggested Database Schema

Based on the masterlist, consider these tables:

**Students Table**
- student_id (PK)
- name
- age
- teacher_id (FK)

**Teachers Table**
- teacher_id (PK)
- name

**Monthly_Performance Table**
- performance_id (PK)
- student_id (FK)
- year
- month
- memorizing_to_surah
- total_attendance
- total_memorization_score
- total_review_score

**Daily_Performance Table**
- daily_id (PK)
- performance_id (FK)
- day_number
- attendance
- memorization_score
- review_score

### For Analysis

Use the masterlist to:

- Track individual student progress over time
- Compare performance across different teachers
- Identify top performers
- Analyze attendance patterns
- Monitor which Surahs students are working on

### Opening the Files

**CSV File**: Open with any spreadsheet software (Excel, Google Sheets, LibreOffice Calc)
```bash
# View in terminal
head data/masterlist.csv

# Open with Excel, Google Sheets, etc.
```

**Excel File**: Open directly with Microsoft Excel or compatible software
```bash
# The file is ready to use in Excel
# All 939 records in a single sheet
```

## Data Quality Notes

- Empty rows have been removed
- Records without student names have been filtered out
- All original data has been preserved in Raw_* columns
- Calculated fields (totals, counts) have been added for convenience
- Some teacher names appear inconsistent (e.g., "حضور", "حفظ" might be data entry errors)

## Next Steps

1. **Review the data** - Open the Excel file and familiarize yourself with the structure
2. **Design your schema** - Decide which tables and relationships you need
3. **Clean the data** - Identify and fix any inconsistencies
4. **Import to database** - Load the masterlist into your chosen database system
5. **Build the application** - Use the cleaned data to power your Halaqa Fateh app

## Questions to Consider

Before designing your database:

1. Do you need to track daily performance, or just monthly summaries?
2. Should teachers be a separate entity, or just a text field?
3. How will you handle student age changes over time?
4. Do you need historical data, or just the current state?
5. Will you need to generate reports by month, by student, or by teacher?

---

**Created**: November 7, 2025
**Source**: 18 CSV files from data/raw/ directory
**Coverage**: Years 1445-1447 (Hijri calendar)
