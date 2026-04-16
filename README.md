## Schema

### teachers.csv
- id: int
- full_name: string
- status enum: Active | Inactive

### students.csv
- id: int
- full_name: string
- hijri_birth_year: "YYYY"
- hijri_enrollment_date: "DD/MM/YYYY"
- notes: string
- state: Active | Inactive | Archived | Graduated | Transferred

### daily_progress.csv
- student_id: int
- teacher_id: int
- hifz: int (#.# decimal)
- muragaa: int (#.# decimal)
- hijri_date: "DD/MM/YYYY"
- notes


## Design: controller.js is the only source of logic

- **controller.js** — All logic: auth, time (Hijri), sync, load/save data, CRUD for students, teachers, daily_progress. Exposed as global `Controller`.
- **app.js** — UI only: DOM refs, event binding, rendering. Must call `Controller.*` for any data or side effects; no localStorage, no CSV, no GitHub API.

## Controller.js API

bool is_online() 

// time
string get_current_hijri_date() // online if online, otherwise local.
string get_current_online_hijri_date()
string get_current_local_hijri_date() 


// authentication
void store_github_token_locally()
bool is_authenticated() // check github token and repo connection.


void sync_data() // this is the most critical function. It syncs or queues changes depending on whether user is online or not. It gets triggered on OnEditEnd or when connection is back.

//data
json all_data; //global, loaded after authentication

void load_data() // from repo to all_data variable

void create_student(json payload) //add safety header checkers before editting the student csv file.

void create_teacher(json payload) // same as students.csv

void update_student(int id, string header_name, value)
// TODO: For each editable header, create a function with typing safety. To be used by UI. 

void update_teacher(int id,string header_name, value)
// TODO: Same as student. 

void create_daily_entry(student_id, teacher_id, hijri_date, hifz=0, muragaa=0, notes="")

void update_daily_entry(student_id, teacher_id, hijri_date, hifz=0, muragaa=0, notes="")




 