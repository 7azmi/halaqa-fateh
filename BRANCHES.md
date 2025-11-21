# Branch Structure Documentation

This document describes the branch organization for the Halaqa Fateh project, which has been structured to separate data management concerns and enable better workflow automation.

## Branch Overview

The repository uses a multi-branch strategy to separate raw data processing from production database access:

```
main                  → Full application (HTML, design, all data)
├── data-processing   → Raw data + Python processing scripts
└── fateh-database    → Final database files only
```

## Branch Details

### `main` Branch
**Purpose**: Main production branch containing the complete application

**Contents**:
- Web application (`index.html`)
- Design files (`design/`)
- Complete data directory (both `data/processed/` and `data/database/`)
- Python processing scripts

**Usage**: Used for full application deployment and development

---

### `data-processing` Branch
**Purpose**: Iterative data updates, cleaning, and preprocessing

**Contents**:
- Raw/processed data in `data/processed/` (organized by year/month)
- Python scripts:
  - `check_csv_consistency.py` - Validates CSV structure
  - `convert_csv.py` - Converts processed data to database format
- README with usage instructions

**Typical Workflow**:
1. Add/update CSV files in `data/processed/YEAR/`
2. Run `python check_csv_consistency.py` to validate
3. Run `python convert_csv.py` to generate database files
4. Switch to `fateh-database` branch to commit generated files

**Key Points**:
- This branch does NOT contain `data/database/`
- Output from conversion scripts goes to `fateh-database` branch
- Not used for model reading/training in production

---

### `fateh-database` Branch
**Purpose**: Canonical data source for read-only database access

**Contents**:
- `data/database/` directory ONLY
  - `Users.csv` - User registry
  - Year folders (1445, 1446, 1447, etc.)
  - Monthly CSV files with student performance records
- README with API access instructions

**Typical Workflow**:
1. Receive updated database files from `data-processing` conversion
2. Commit only the database changes
3. Applications read directly from this branch

**Key Points**:
- Data-only branch (no code)
- Safe for GitHub API token-based access
- Intended for automated systems and external integrations
- Could be moved to separate repository for enhanced access control

**API Access Example**:
```bash
# Clone only database branch
git clone --single-branch --branch fateh-database \
  https://github.com/7azmi/halaqa-fateh.git

# Or use GitHub API
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/7azmi/halaqa-fateh/contents/data/database/Users.csv?ref=fateh-database
```

## Workflow Diagram

```
┌─────────────────────┐
│  data-processing    │
│                     │
│  1. Add/update raw  │
│     CSV files       │
│                     │
│  2. Run validation  │
│     script          │
│                     │
│  3. Run conversion  │
│     script          │
└──────────┬──────────┘
           │
           │ Generate database files
           ↓
┌─────────────────────┐
│  fateh-database     │
│                     │
│  4. Copy generated  │
│     database files  │
│                     │
│  5. Commit changes  │
└──────────┬──────────┘
           │
           │ Read-only access
           ↓
┌─────────────────────┐
│  Applications /     │
│  External Systems   │
└─────────────────────┘
```

## Benefits of This Structure

1. **Separation of Concerns**: Raw data and processing logic are separate from production database
2. **Safe API Access**: `fateh-database` can be accessed via tokens without exposing code
3. **Clear Data Flow**: Explicit pipeline from raw → processed → database
4. **Future-Proof**: Structure enables automation and potential repository separation
5. **Version Control**: Each branch tracks only relevant files, reducing clutter

## Migration Path

### Future Consideration: Separate Repository
For enhanced security and access control, `fateh-database` could be moved to its own repository:

**Benefits**:
- Independent access control (separate tokens)
- Simplified permissions for data-only consumers
- Reduced clone size for database users
- Clearer separation of concerns

**Process**:
1. Create new repository `halaqa-fateh-database`
2. Push `fateh-database` branch as `main` in new repo
3. Update applications to reference new repository
4. Archive `fateh-database` branch in original repo

## Best Practices

### For Data Processing (`data-processing`)
- ✅ Commit raw CSV files and processing scripts
- ✅ Document data format changes in commit messages
- ✅ Run validation before conversion
- ❌ Don't commit generated database files here

### For Database Updates (`fateh-database`)
- ✅ Only commit files in `data/database/`
- ✅ Use clear commit messages describing what data changed
- ✅ Validate data integrity before committing
- ❌ Never commit code or scripts to this branch
- ❌ Avoid manual CSV edits (use the conversion pipeline)

### For Main Branch (`main`)
- ✅ Keep application code and design files
- ✅ Reference other branches in documentation
- ✅ Sync database updates from `fateh-database` as needed

## Related Documentation

- [GitHub: Managing Branches](https://docs.github.com/en/repositories/working-with-branches-and-tags/about-branches)
- [GitHub API: Repos](https://docs.github.com/en/rest/repos/branches?apiVersion=2022-11-28)
- [GitHub API: Contents](https://docs.github.com/en/rest/repos/contents)

## Questions or Issues?

For questions about the branch structure or suggestions for improvements, please open an issue in the repository.
