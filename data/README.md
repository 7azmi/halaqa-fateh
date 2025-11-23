# Halaqa Fateh Data

This directory contains the data for the Halaqa Fateh application.

## Structure

- **raw/**: Original CSV files organized by Hijri year (1445, 1446, 1447)
  - Contains monthly attendance and performance records for students
  - Each file represents one month of data

- **processed/**: Processed data files (if any)

- **masterlist.csv**: Consolidated data from all raw files in one sheet (v2)
- **masterlist.xlsx**: Excel version of the masterlist (v2)

## Masterlist (v2)

The masterlist combines all raw data from 18 monthly CSV files into a single comprehensive dataset, with monthly statistics sections removed.

### Statistics

- **Total Records**: 919 student-month records (cleaned)
- **Unique Students**: 77
- **Years Covered**: 1445, 1446, 1447 (Hijri calendar)
- **Months**: 18 months total across 3 years
- **Teachers**: Multiple teachers including خليل, محمد, عبدالله, and others

### Columns

The masterlist includes the following key columns:

1. **Year**: Hijri year (1445, 1446, 1447)
2. **Month**: Month number (1-12, following Hijri calendar)
3. **Student_Name**: Name of the student
4. **Hijri_DOB**: Student's Hijri date of birth (YYYY/M/D format)
5. **Teacher**: Name of the teacher
6. **Total_Attendance**: Total attendance days for the month
7. **Total_Memorization_Score**: Sum of memorization scores (حفظ)
8. **Days_With_Memorization**: Number of days with memorization activity
9. **Total_Review_Score**: Sum of review scores (مراجعة)
10. **Days_With_Review**: Number of days with review activity
11. **Source_File**: Original file name for traceability
12. **Raw_*** columns: All original daily performance data

### Changes from v1

- ✅ Removed `Memorizing_To_Surah` column (students had multiple entries)
- ✅ Replaced month names with numeric month numbers (1-12)
- ✅ Filtered out monthly statistics rows from raw data
- ✅ Replaced `Age` with `Hijri_DOB` (Hijri date of birth)
- ✅ Reduced from 939 to 919 records (statistics removed)

### Usage

The masterlist is designed to help you:

1. **Analyze student performance** across different months and years
2. **Track progress** of individual students over time
3. **Compare teachers** and their students' performance
4. **Design database schema** by understanding all available data fields
5. **Identify data patterns** for application development

### Data Cleaning Notes

- Empty rows have been removed
- Records without student names have been filtered out
- Monthly statistics sections have been filtered out
- All data from the raw files has been preserved in Raw_* columns
- Calculated fields (totals, counts) have been added for convenience
- Hijri DOB calculated from age using: Birth Year = Record Year - Age

### Important Note

When a student has any daily review or memorization score, this means they attended that day. A student can still attend but not have a daily score recorded.

## Next Steps

Use this masterlist to:
- Design your database schema
- Identify which fields are most important for your application
- Understand the data structure and relationships
- Plan data validation and cleanup strategies
