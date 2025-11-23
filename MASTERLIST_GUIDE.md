# Masterlist Guide (v2)

## Overview

The masterlist has been successfully created from all raw data in the repository. This single sheet contains all student records from 18 monthly CSV files spanning 3 Hijri years, with monthly statistics sections filtered out.

## Files Created

1. **`data/masterlist.csv`** - CSV format (cleaned and optimized)
2. **`data/masterlist.xlsx`** - Excel format (cleaned and optimized)
3. **`data/README.md`** - Documentation

## What's in the Masterlist?

### Summary Statistics

- **Total Records**: 919 student-month entries (cleaned, statistics removed)
- **Unique Students**: 77 students tracked
- **Years Covered**: 1445, 1446, 1447 (Hijri)
- **Months**: 18 months of data
- **Teachers**: 8 teachers (خليل, محمد, عبدالله, and others)

### Data Breakdown by Year

**Year 1445** (5 months)
- Records from months 7, 8, 10, 11, 12
- Months: رجب (7), شعبان (8), شوال (10), ذو القعدة (11), ذو الحجة (12)

**Year 1446** (9 months)
- Records from months 1, 3, 4, 5, 6, 7, 8, 11, 12
- Months: محرم (1), ربيع الأول (3), ربيع الآخر (4), جمادى الأولى (5), جمادى الثانية (6), رجب (7), شعبان (8), ذو القعدة (11), ذو الحجة (12)

**Year 1447** (4 months)
- Records from months 1, 2, 3, 4
- Months: محرم (1), صفر (2), ربيع الأول (3), ربيع الآخر (4)

### Column Structure (104 columns total)

#### 1. Metadata (3 columns)
- `Year` - Hijri year (e.g., 1445, 1446, 1447)
- `Month` - Month number (1-12, following Hijri calendar)
- `Source_File` - Original filename for traceability

#### 2. Student Information (3 columns)
- `Student_Name` - اسم الطالب
- `Hijri_DOB` - Hijri date of birth (YYYY/M/D format, calculated from age)
- `Teacher` - الأستاذ


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

### Important Notes

1. **Attendance Logic**: When a student has any daily review or memorization score, this means they attended that day. A student can still attend but not have a daily score recorded.

2. **Hijri Date of Birth**: Calculated from the student's age in the data using the formula: `Birth Year = Record Year - Age`. The date is set to 1/1 (1st of Muharram) as a default since exact birth dates are not available.

3. **Month Numbers**: Months are now represented as numbers (1-12) following the Hijri calendar:
   - 1 = محرم, 2 = صفر, 3 = ربيع الأول, 4 = ربيع الآخر
   - 5 = جمادى الأولى, 6 = جمادى الثانية, 7 = رجب, 8 = شعبان
   - 9 = رمضان, 10 = شوال, 11 = ذو القعدة, 12 = ذو الحجة

4. **Statistics Removed**: Monthly statistics sections that appeared at the end of raw files (teacher summaries, performance comparisons) have been filtered out.

## Changes from v1 to v2

- ✅ **Removed** `Memorizing_To_Surah` column (students had multiple entries due to progression)
- ✅ **Replaced** month names with numeric month numbers (1-12)
- ✅ **Filtered** monthly statistics rows from raw data
- ✅ **Replaced** `Age` with `Hijri_DOB` (date of birth in Hijri calendar)
- ✅ **Reduced** records from 939 to 919 (removed statistics rows)

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
- hijri_dob
- teacher_id (FK)


**Teachers Table**
- teacher_id (PK)
- name

**Monthly_Performance Table**
- performance_id (PK)
- student_id (FK)
- year (Hijri)
- month (1-12)
- total_attendance
- total_memorization_score
- total_review_score

**Daily_Performance Table**
- daily_id (PK)
- performance_id (FK)
- day_number
- attendance (derived from memorization or review activity)
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
