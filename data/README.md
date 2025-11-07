# Halaqa Fateh Data

This directory contains the data for the Halaqa Fateh application.

## Structure

- **raw/**: Original CSV files organized by Hijri year (1445, 1446, 1447)
  - Contains monthly attendance and performance records for students
  - Each file represents one month of data

- **processed/**: Processed data files (if any)

- **masterlist.csv**: Consolidated data from all raw files in one sheet
- **masterlist.xlsx**: Excel version of the masterlist

## Masterlist

The masterlist combines all raw data from 18 monthly CSV files into a single comprehensive dataset.

### Statistics

- **Total Records**: 939 student-month records
- **Unique Students**: 79
- **Years Covered**: 1445, 1446, 1447 (Hijri calendar)
- **Months**: 18 months total across 3 years
- **Teachers**: Multiple teachers including خليل, محمد, عبدالله, and others

### Columns

The masterlist includes the following key columns:

1. **Year**: Hijri year (1445, 1446, 1447)
2. **Month**: Islamic month name in Arabic
3. **Student_Name**: Name of the student
4. **Age**: Student's age
5. **Teacher**: Name of the teacher
6. **Memorizing_To_Surah**: Which Surah the student is memorizing up to
7. **Total_Attendance**: Total attendance days for the month
8. **Total_Memorization_Score**: Sum of memorization scores (حفظ)
9. **Days_With_Memorization**: Number of days with memorization activity
10. **Total_Review_Score**: Sum of review scores (مراجعة)
11. **Days_With_Review**: Number of days with review activity
12. **Source_File**: Original file name for traceability
13. **Raw_*** columns: All original daily performance data

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
- All data from the raw files has been preserved in Raw_* columns
- Calculated fields (totals, counts) have been added for convenience

## Next Steps

Use this masterlist to:
- Design your database schema
- Identify which fields are most important for your application
- Understand the data structure and relationships
- Plan data validation and cleanup strategies
