import json
import pg8000
from datetime import datetime, date, time, timedelta

conn = None

def get_db_connection():
    global conn
    if conn is None or conn._sock is None:
        conn = pg8000.connect(
            host="database-2.c7y2iak4atpy.us-east-2.rds.amazonaws.com",
            port=5432,
            database="postgres",
            user="postgres",
            password="Task10Manage1"
        )
    return conn

def row_to_dict(cursor, row):
    result = {}
    for idx, col in enumerate(cursor.description):
        val = row[idx]
        if isinstance(val, (datetime, date, time)):
            val = val.isoformat()
        result[col[0]] = val
    return result

def get_entry_by_id(entry_id: int, cur):
    cur.execute("SELECT * FROM project_attributes WHERE timelog_id = %s", (entry_id,))
    row = cur.fetchone()
    result = row_to_dict(cur, row) if row else None
    return result

def serialize_row(columns, row):
    result = {}
    for i, col in enumerate(columns):
        val = row[i]
        if isinstance(val, (datetime, date, time)):
            val = val.isoformat()
        result[col] = val
    return result

def fetch_dropdowns(cur):
    cur.execute("SELECT * FROM members;")
    members = [r[0] for r in cur.fetchall()]

    cur.execute("SELECT * FROM projects;")
    projects = [r[0] for r in cur.fetchall()]

    cur.execute("SELECT * FROM task;")
    tasks = [r[0] for r in cur.fetchall()]

    return members, projects, tasks

def _to_minutes(val):
    if not val:
        return 0
    parts = str(val).split(":")
    h = int(parts[0]) if parts[0] else 0
    m = int(parts[1]) if len(parts) > 1 else 0
    return h * 60 + m

def _hhmm(total_minutes):
    h = total_minutes // 60
    m = total_minutes % 60
    return f"{h}:{m:02}"

def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ('%Y-%m-%d', '%m-%d-%Y'):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def check_time(employee, entry_date, time_from, time_to, total_time, exclude_id=None):
    conn = get_db_connection()
    cur = conn.cursor()

    date_obj = datetime.strptime(entry_date, "%Y-%m-%d").date()
    entry = "SELECT * FROM project_attributes WHERE employee_name = %s AND entry_date = %s"
    params = [employee, date_obj]
    if exclude_id:
        entry += " AND timelog_id != %s"
        params.append(exclude_id)
    cur.execute(entry, tuple(params))
    rows_data = cur.fetchall()
    columns = [desc[0] for desc in cur.description]
    rows = [serialize_row(columns, r) for r in rows_data]


    if isinstance(time_from, str):
        time_from_obj = datetime.strptime(f"{entry_date} {time_from}", "%Y-%m-%d %H:%M")
    else:
        time_from_obj = time_from

    if isinstance(time_to, str):
        time_to_obj = datetime.strptime(f"{entry_date} {time_to}", "%Y-%m-%d %H:%M")
    else:
        time_to_obj = time_to

    isFullDay = (time_from_obj.hour == 0 and time_from_obj.minute == 0) and (time_to_obj.hour == 23 and time_to_obj.minute == 59)

    if time_from_obj > time_to_obj:
        return False, "Time from should not be greater than time to."

    for row in rows:
        row_t_from = row['time_from']
        row_t_to   = row['time_to']

        if isinstance(row_t_from, datetime):
            row_from_obj = row_t_from
        else:
            row_from_obj = datetime.combine(date_obj, row_t_from)

        if isinstance(row_t_to, datetime):
            row_to_obj = row_t_to
        else:
            row_to_obj = datetime.combine(date_obj, row_t_to)

        hasFullDay = (row_from_obj.hour == 0 and row_from_obj.minute == 0) and (row_to_obj.hour == 23 and row_to_obj.minute == 59)

        if hasFullDay and not isFullDay:
            return False, "Project Time entry is overlapping with an existing time entry."

        if row_t_from == time(0, 0) and row_t_to == time(23, 59):
            continue
        if not hasFullDay and not isFullDay:
            if (time_from_obj < row_t_to) and (row_t_from < time_to_obj):
                return False, "Project Time entry overlaps with an existing time."

    total_minutes = _to_minutes(total_time)
    for row in rows:
        total_minutes += _to_minutes(row['total_time'])

    if total_minutes > 16*60:
        return False, "Total time exceeds 16 hours for this date."

    return True, None

def normalize_time(value):
    if not value:
        return ""
    try:
        return datetime.fromisoformat(value).strftime("%H:%M")
    except ValueError:
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                return datetime.strptime(value, fmt).strftime("%H:%M")
            except ValueError:
                continue
        return str(value).strip()

def lambda_handler(event, context):
    try:
        id = None
        if "pathParameters" in event and event["pathParameters"]:
            id = event["pathParameters"].get("proxy")

        body = event.get("body")
        if body and isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                body = {}
        else:
            body = body or {}

        employee_name = body.get("employee_name") or None
        project_name = body.get("project_name") or None
        task_name = body.get("task_name") or None
        entry_date = body.get("entry_date") or None
        time_note = body.get("time_note") or None
        time_from = body.get("time_from") or None
        time_to = body.get("time_to") or None
        total_time = body.get("total_time") or None

        entry_output = {
            "timelog_id": id,
            "employee_name": employee_name,
            "project_name": project_name,
            "task_name": task_name,
            "entry_date": entry_date,
            "time_note": time_note,
            "time_from": normalize_time(time_from),
            "time_to": normalize_time(time_to),
            "total_time": total_time
        }
        conn = get_db_connection()
        cur = conn.cursor()

        members, projects, tasks = fetch_dropdowns(cur)

        if not all([employee_name, project_name, task_name, time_note, entry_date]):
            return respond(400, {"timelog": entry_output, "message": "Please enter all required fields.", "status_code": 400})

        if employee_name not in members:
            return respond(400, {"timelog": entry_output, "message": "Employee name is entered wrong.", "status_code": 400})
        if project_name not in projects:
            return respond(400, {"timelog": entry_output, "message": "Project name is entered wrong.", "status_code": 400})
        if task_name not in tasks:
            return respond(400, {"timelog": entry_output, "message": "Task name is entered wrong.", "status_code": 400})

        try:
            entry_date_obj = datetime.strptime(entry_date, "%Y-%m-%d").date()
        except ValueError:
            return respond(400, {"timelog": entry_output, "message": "Invalid date format. Please use YYYY-MM-DD.", "status_code": 400})

        entry = get_entry_by_id(id, cur)
        if not entry:
            return respond(404, {"message": "Entry not found", "status_code": 400})

        if not ((time_from and time_to) or total_time):
            return respond(400, {"timelog": entry_output, "message": "Please enter either Total Time or Time Duration.", "status_code": 400})

        if (time_from and time_to) and total_time:
            return respond(400, {"timelog": entry_output, "message": "Please enter only either Total Time or Time Duration.", "status_code": 400})

        t_from_dt = t_to_dt = None
        if time_from and time_to and not (time_from == "00:00" and time_to == "23:59"):
            try:
                fmt = "%H:%M"
                t_from_dt = datetime.fromisoformat(time_from)
                t_to_dt = datetime.fromisoformat(time_to)
            except ValueError:
                return respond(400, {"timelog": entry_output, "message": "Time not entered in the correct format. Please enter time in HH:MM 24-hour format.", "status_code": 400})
            delta = t_to_dt - t_from_dt
            if delta > timedelta(days=1):
                return respond(400, {"timelog": entry_output, "message": "Time entry exceeds 24 hours. Please check the duration.", "status_code": 400})
            if delta.total_seconds() < 0:
                delta = timedelta(days=1) + delta
            total_hours = delta.seconds // 3600
            total_minutes = (delta.seconds % 3600) // 60
            total_time = f"{total_hours:02}:{total_minutes:02}"
        elif entry['total_time'] != total_time:
            try:
                fmt = "%H:%M"
                total_t = datetime.strptime(total_time, fmt)
            except ValueError:
                return respond(400, {"timelog": entry_output, "message": "Total time format invalid. Use HH:MM 24-hour format.", "status_code": 400})
            t_from_dt = datetime.combine(entry_date_obj, time(0, 0))
            t_to_dt = datetime.combine(entry_date_obj, time(23, 59))
        elif entry['total_time'] == total_time:
            t_from_dt = datetime.combine(entry_date_obj, time(0, 0))
            t_to_dt = datetime.combine(entry_date_obj, time(23, 59))

        if not time_from:
            time_from = "00:00"
        if not time_to:
            time_to = "23:59"

        core_unchanged = (
                str(entry["employee_name"]) == str(employee_name)
                and str(entry["project_name"]) == str(project_name)
                and str(entry["task_name"]) == str(task_name)
                and str(entry["entry_date"]) == str(entry_date)
                and str(entry.get("note", "")) == str(time_note or "")
                and normalize_time(entry.get("time_from")) == normalize_time(time_from)
                and normalize_time(entry.get("time_to")) == normalize_time(time_to)
        )

        if total_time:
            unchanged = core_unchanged and (
                    normalize_time(entry.get("total_time")) == normalize_time(total_time)
            )
        else:
            unchanged = core_unchanged

        if unchanged:
            return respond(400, {"timelog": entry_output, "message": "No changes were made to the project time entry.", "status_code": 400})

        validation, message = check_time(employee_name, entry_date, t_from_dt, t_to_dt, total_time, exclude_id=id)
        if not validation:
            return respond(400, {"timelog": entry_output, "message": message, "status_code": 400})


        cur.execute(
            """UPDATE project_attributes 
               SET employee_name=%s, project_name=%s, task_name=%s, entry_date=%s, note=%s, 
                   time_from=%s, time_to=%s, total_time=%s 
               WHERE timelog_id=%s RETURNING *""",
            (employee_name, project_name, task_name, entry_date_obj, time_note, t_from_dt, t_to_dt, total_time, id),
        )
        row = cur.fetchone()
        edited_entry = row_to_dict(cur, row)
        conn.commit()
        cur.close()
        conn.close()


        return respond(201, {
            "edited_timelog": edited_entry,
            "message": "Project Time edited successfully.",
            "status_code": 201,
        })

    except Exception as e:
        return respond(500, {"error": "Database disconnected.", "status_code": 500, "details": str(e)})

def respond(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body),
        "isBase64Encoded": False
    }