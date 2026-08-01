
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
    rows = cur.fetchall()

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
        employee_name = event.get("employee_name")
        project_name = event.get("project_name")
        task_name = event.get("task_name")
        entry_date = event.get("entry_date")
        time_note = event.get("time_note")
        time_from = event.get("time_from")
        time_to = event.get("time_to")
        total_time = event.get("total_time")

        conn = get_db_connection()
        cur = conn.cursor()

        members, projects, tasks = fetch_dropdowns(cur)

        entry_output = {
            "employee_name": employee_name,
            "project_name": project_name,
            "task_name": task_name,
            "entry_date": entry_date,
            "time_note": time_note,
            "time_from": normalize_time(time_from),
            "time_to": normalize_time(time_to),
            "total_time": total_time
        }

        if not employee_name or not project_name or not task_name or not time_note or not entry_date:
            return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Please enter all required fields.", "status_code": 400}}

        try:
            entry_date_obj = datetime.strptime(entry_date, "%Y-%m-%d").date()
        except:
            return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Invalid date format. Please use YYYY-MM-DD.", "status_code": 400}}

        if employee_name not in members:
            return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Employee name is entered wrong.", "status_code": 400}}

        if project_name not in projects:
            return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Project name is entered wrong.", "status_code": 400}}

        if task_name not in tasks:
            return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Task name is entered wrong.", "status_code": 400}}

        if (not time_from or not time_to) and not total_time:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
                },
                "body": {
                    "statusCode": 400,
                    "timelog": entry_output,
                    "message": "Please enter either Total Time or Time Duration.",
                    "status_code": 400
                },
                "isBase64Encoded": False
            }

        if time_from and time_to and total_time:
            return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Please enter only either Total Time or Time Duration.", "status_code": 400}}

        if time_from and time_to and not total_time:
            try:
                fmt = "%H:%M"
                t_from_dt = datetime.fromisoformat(time_from)
                t_to_dt = datetime.fromisoformat(time_to)
            except ValueError:
                return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Time not entered in the correct format. Please enter time in 24 hour HH:MM format.", "status_code": 400}}
            delta = t_to_dt - t_from_dt
            if delta > timedelta(days=1):
                return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Time entry exceeds 24 hours. Please check the time duration.", "status_code": 400}}

            if delta.total_seconds() < 0:
                delta = timedelta(days=1) + delta
            total_hours = delta.seconds // 3600
            total_minutes = (delta.seconds % 3600) // 60
            total_time = f"{total_hours:02}:{total_minutes:02}"
        elif total_time and not time_from and not time_to:
            try:
                fmt = "%H:%M"
                total_t = datetime.strptime(total_time, fmt)
            except ValueError:
                return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Time not entered in the correct format. Please enter time in 24 hour HH:MM format.", "status_code": 400}}
            t_from_dt = datetime.combine(entry_date_obj, time(0, 0))
            t_to_dt = datetime.combine(entry_date_obj, time(23, 59))

        else:
            return {"statusCode": 400, "body": {"timelog": entry_output, "message": "Please enter a valid time.", "status_code": 400}}

        validation, message = check_time(employee_name, entry_date, t_from_dt, t_to_dt, total_time, None)
        if not validation:
            return {"statusCode": 400, "body": {"timelog": entry_output, "message": message, "status_code": 400}}

        cur.execute(
            'INSERT INTO project_attributes (employee_name, project_name, task_name, entry_date, note, time_from, time_to, total_time) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *',
            (employee_name, project_name, task_name, entry_date_obj, time_note, t_from_dt, t_to_dt, total_time)
        )
        row = cur.fetchone()
        timelog_id = row[0]
        entry = row_to_dict(cur, row)
        conn.commit()
        cur.close()
        conn.close()

        response = {
            "timelog": entry,
            "message": "Project Time recorded successfully.",
            "status_code": 201
        }

        return response

    except Exception as e:
        return {"error": "Database disconnected.", "status_code": 500, "details": str(e)}
