from enum import Enum
from typing import Optional

from fastapi import FastAPI, Request, Form, Depends, Query, status, Body
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from datetime import date, datetime, time, timedelta
import psycopg2.extras
import os

from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000" #if you use this in browser
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With", "*"],  # list all your needed headers or use ["*"] to allow all
)

def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="postgres",
        user="postgres",
        password="trinity"
    )
    return conn

def fetch_projects():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM projects;")
    projects = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return projects

def create_project_enum():
    projects = fetch_projects()
    return Enum("ProjectEnum", {p.replace(" ", "_"): p for p in projects})

ProjectEnum = create_project_enum()

def fetch_members():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM members;")
    members = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return members

def create_member_enum():
    members = fetch_members()
    return Enum("MemberEnum", {m.replace(" ", "_"): m for m in members})

MemberEnum = create_member_enum()

def fetch_tasks():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM task;")
    tasks = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return tasks

def create_task_enum():
    tasks = fetch_tasks()
    return Enum("TaskEnum", {t.replace(" ", "_"): t for t in tasks})

TaskEnum = create_task_enum()

def row_to_dict(cursor, row):
    result = {}
    for idx, col in enumerate(cursor.description):
        val = row[idx]
        if isinstance(val, (datetime, date, time)):
            val = val.isoformat()
        result[col.name] = val
    return result

def get_entry_by_id(entry_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM project_attributes WHERE timelog_id = %s", (entry_id,))
    row = cur.fetchone()
    result = row_to_dict(cur, row) if row else None
    cur.close()
    conn.close()
    return result

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
    print("Reached here")
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    date_obj = datetime.strptime(entry_date, "%Y-%m-%d").date()
    entry = "SELECT * FROM project_attributes WHERE employee_name = %s AND entry_date = %s"
    params = [employee, date_obj]
    if exclude_id:
        entry += " AND timelog_id != %s"
        params.append(exclude_id)
    cur.execute(entry, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if isinstance(time_from, str):
        time_from_obj = datetime.strptime(f"{entry_date} {time_from}", "%Y-%m-%d %H:%M")
    else:
        time_from_obj = time_from

    if isinstance(time_to, str):
        time_to_obj = datetime.strptime(f"{entry_date} {time_to}", "%Y-%m-%d %H:%M")
    else:
        time_to_obj = time_to

    # Check full day
    isFullDay = (time_from_obj.hour == 0 and time_from_obj.minute == 0) and (time_to_obj.hour == 23 and time_to_obj.minute == 59)

    if time_from_obj > time_to_obj:
        return False, "Time from should not be greater than time to."

    print(time_from_obj, time_to_obj)

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

        print(total_time)

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


def serialize_row(row):
    serialized = {}
    for k, v in row.items():
        if isinstance(v, (datetime, date, time)):
            serialized[k] = v.isoformat()
        else:
            serialized[k] = v
    return serialized

def normalize_time(value):
    # if value is None or value == "":
    #     return ""
    #
    # if isinstance(value, datetime):
    #     return value.strftime("%H:%M")
    #
    # if isinstance(value, str):
    #     if "T" in value:
    #         value = value.split("T")[1]
    #     for fmt in ("%H:%M:%S", "%H:%M", "%-H:%M"):
    #         try:
    #             return datetime.strptime(value, fmt).strftime("%H:%M")
    #         except ValueError:
    #             continue
    #     return value
    #
    # return str(value)
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


def group_projects(rows):
    grouped = {}
    for e in rows:
        name = e["employee_name"]
        date_key = e.get("entry_date", "Unknown")[:10] if e.get("entry_date") else "Unknown"  # date string
        person = grouped.setdefault(name, {"dates": {}, "user_total_minutes": 0})
        day = person["dates"].setdefault(date_key, {"timelogs": [], "day_total_minutes": 0})
        day["timelogs"].append(e)
        mins = _to_minutes(e.get("total_time"))
        day["day_total_minutes"] += mins
        person["user_total_minutes"] += mins

    for person in grouped.values():
        for date_data in person["dates"].values():
            date_data["day_total_time"] = _hhmm(date_data["day_total_minutes"])
        person["user_total_time"] = _hhmm(person["user_total_minutes"])

    return grouped

FILTERS = {}

class TimeEntry(BaseModel):
    employee_name: str = None
    project_name: str = None
    task_name: str = None
    entry_date: str = None
    time_note: str = None
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    total_time: Optional[str] = None

class IndexFilter(BaseModel):
    project: Optional[str] = None
    member: Optional[str] = None
    date_from: str = "2024-09-30"
    date_to: str = "2025-09-29"

class FilterRequest(BaseModel):
    action: str
    project: str = None
    member: str = None
    date_range: str = "2024-09-30"
    range2: str = "2025-09-30"

# @app.middleware("http")
# async def verify_headers(request: Request, call_next):
#     if request.url.path.startswith(("/docs", "/redoc", "/openapi.json", "/static")):
#         return await call_next(request)
#
#     if request.method in ("POST", "PUT", "DELETE"):
#         if request.headers.get("Content-Type") != "application/json" or request.headers.get("Accept") != "application/json":
#             return JSONResponse(
#                 status_code=415,
#                 content={"error": "Content-Type and/or Accept is missing or invalid. Supported type is application/json", "status_code": 415},
#             )
#     if request.method == "GET":
#         if request.headers.get("Content-Type") != "application/json":
#             return JSONResponse(
#                 status_code=415,
#                 content={"error": "Content-Type is missing or invalid. Supported type is application/json", "status_code": 415},
#             )
#
#     response = await call_next(request)
#     return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"message": "Invalid input data for json format", "status_code": 400, "errors": exc.errors()}
    )

@app.get("/timelog")
async def index():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT * FROM project_attributes WHERE 1=1 ORDER BY employee_name ASC, entry_date ASC, time_from ASC")
        rows = [serialize_row(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
    except Exception as e:
        return JSONResponse(content={"error": "Database disconnected.", "status_code": 500, "details": str(e)}, status_code=500)

    grouped = group_projects(rows)

    if not grouped:
        return JSONResponse({"message": "No project time record available for the filters applied", "status_code":200, "data": {}})

    return JSONResponse({
        "timelogs": grouped,
        "message": "All project time records retrieved successfully.",
        "status_code": 200
    }, status_code=200)

@app.get("/timelog/dropdowns")
async def get_dropdowns():
    members = fetch_members()
    projects = fetch_projects()
    tasks = fetch_tasks()

    return JSONResponse({
        "members": members,
        "projects": projects,
        "tasks": tasks,
        "message": "All dropdowns available.",
        "status_code": 200
    }, status_code=200)

@app.post("/timelog/filter")
async def set_filters(filter_req: FilterRequest = Body(...)):
    if filter_req.action == "reset":
        return {
            "filters": None,
            "message": "Filters reset successfully.",
            "status_code": 200,
            "status": "success"
        }

    filters = {
        "project": filter_req.project,
        "member": filter_req.member,
        "date_from": filter_req.date_range,
        "date_to": filter_req.range2
    }
    project = filters.get("project") or None
    member = filters.get("member") or None
    date_from = filters.get("date_from") or None
    date_to = filters.get("date_to") or None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = "SELECT * FROM project_attributes WHERE 1=1"
        params = []

        if project and project != "1":
            query += " AND project_name = %s"
            params.append(project)
        if member and member != "1":
            query += " AND employee_name = %s"
            params.append(member)
        if date_from:
            query += " AND entry_date >= %s"
            params.append(parse_date(date_from))
        if date_to:
            query += " AND entry_date <= %s"
            params.append(parse_date(date_to))

        query += " ORDER BY employee_name ASC, entry_date ASC, time_from ASC"
        cur.execute(query, tuple(params))
        rows = [serialize_row(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
    except Exception as e:
        return JSONResponse(
            content={"error": "Database disconnected.", "status_code": 500, "details": str(e)}, status_code=500)

    grouped = group_projects(rows)

    if not grouped:
        return JSONResponse(
            {"message": "No project time record available for the filters applied", "status_code": 201, "data": {}})

    return JSONResponse({
        "filters": {"project": project, "member": member, "date_from": date_from, "date_to": date_to},
        "timelogs": grouped,
        "message": "All project time records retrieved successfully.",
        "status_code": 200
    }, status_code=200)

@app.post("/timelog")
async def add_time(
        TimeEntry: TimeEntry
):
    try:
        employee_name = TimeEntry.employee_name or None
        project_name = TimeEntry.project_name or None
        task_name = TimeEntry.task_name or None
        entry_date = TimeEntry.entry_date or None
        time_note = TimeEntry.time_note or None
        time_from = TimeEntry.time_from or None
        time_to = TimeEntry.time_to or None
        total_time = TimeEntry.total_time or None

        print(time_from)

        members = fetch_members()
        projects = fetch_projects()
        tasks = fetch_tasks()

        print(members, projects, tasks)

        entry_output = TimeEntry.model_dump()

        if not employee_name or not project_name or not task_name or not time_note or not entry_date:
            return JSONResponse(content={"timelog": entry_output, "message": "Please enter all required fields.", "status_code": 400}, status_code=400)

        try:
            entry_date_obj = datetime.strptime(entry_date, "%Y-%m-%d").date()
        except:
            return JSONResponse(content={**TimeEntry.model_dump(), "message": "Invalid date format. Please use YYYY-MM-DD.", "status_code": 400}, status_code=400)

        if employee_name not in members:
            return JSONResponse(content={"timelog": entry_output, "message": "Employee name is entered wrong.", "status_code": 400}, status_code=400)

        if project_name not in projects:
            return JSONResponse(content={"timelog": entry_output, "message": "Project name is entered wrong.", "status_code": 400}, status_code=400)

        if task_name not in tasks:
            return JSONResponse(content={"timelog": entry_output, "message": "Task name is entered wrong.", "status_code": 400}, status_code=400)

        conn = get_db_connection()

        if (not time_from or not time_to) and not total_time:
            return JSONResponse(content={"timelog": entry_output, "message": "Please enter either Total Time or Time Duration.", "status_code": 400}, status_code=400)

        if time_from and time_to and total_time:
            return JSONResponse(content={"timelog": entry_output, "message": "Please enter only either Total Time or Time Duration.", "status_code": 400}, status_code=400)

        if time_from and time_to and not total_time:
            try:
                fmt = "%H:%M"
                t_from_dt = datetime.fromisoformat(time_from)
                t_to_dt = datetime.fromisoformat(time_to)
            except ValueError:
                return JSONResponse( content={"timelog": entry_output, "message": "Time not entered in the correct format. Please enter time in 24 hour HH:MM format.", "status_code": 400}, status_code=400)

            # if (t_from_dt.date() != t_to_dt.date()) and t_from_dt < t_to_dt:
            #     return JSONResponse(content={"timelog": entry_output, "message": "Time Entry exceeds 24 hours. Please check the time duration", "status_code": 400}, status_code=400)
            delta = t_to_dt - t_from_dt
            if delta > timedelta(days=1):
                return JSONResponse( content={ "timelog": entry_output, "message": "Time entry exceeds 24 hours. Please check the time duration.", "status_code": 400, }, status_code=400, )
            # delta = t_to_dt - t_from_dt
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
                return JSONResponse( content={"timelog": entry_output, "message": "Time not entered in the correct format. Please enter time in 24 hour HH:MM format.", "status_code": 400}, status_code=400)
            t_from_dt = datetime.combine(entry_date_obj, time(0, 0))
            t_to_dt = datetime.combine(entry_date_obj, time(23, 59))

        else:
            return JSONResponse(content={"timelog": entry_output, "message": "Please enter a valid time.", "status_code": 400}, status_code=400)

        validation, message = check_time(employee_name, entry_date, t_from_dt, t_to_dt, total_time, None)
        if not validation:
            return JSONResponse(content={"timelog": entry_output, "message": message, "status_code": 400}, status_code=400)

        cur = conn.cursor()
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

        return JSONResponse(content=response, status_code=201)

    except Exception as e:
        return JSONResponse(content={"error": "Database disconnected.", "status_code": 500, "details": str(e)}, status_code=500)

@app.get("/timelog/{id}")
async def edit_time(id: int):
    try:
        entry = get_entry_by_id(id)
        if not entry:
            return JSONResponse(content={"message": "Entry not found", "status_code": 404}, status_code=404)

        response = {
            "timelog": entry,
            "message": "Project Time record retrieved successfully.",
            "status_code": 200
        }
        return JSONResponse(content=response, status_code=200)

    except Exception as e:
        return JSONResponse(content={"error": "Database disconnected.", "status_code": 500, "details": str(e)},  status_code=500)

@app.put("/timelog/{id}")
async def edit_time(
        id: int,
        TimeEntry: TimeEntry
):
    print(TimeEntry)
    try:
        employee_name = TimeEntry.employee_name or None
        project_name = TimeEntry.project_name or None
        task_name = TimeEntry.task_name or None
        entry_date = TimeEntry.entry_date or None
        time_note = TimeEntry.time_note or None
        time_from = TimeEntry.time_from or None
        time_to = TimeEntry.time_to or None
        total_time = TimeEntry.total_time or None

        entry_output = TimeEntry.model_dump()

        members = fetch_members()
        projects = fetch_projects()
        tasks = fetch_tasks()

        try:
            entry_date_obj = datetime.strptime(entry_date, "%Y-%m-%d").date()
        except ValueError:
            return JSONResponse(content={"timelog": entry_output, "message": "Invalid date format. Please use YYYY-MM-DD.", "status_code": 400}, status_code=400)


        if not employee_name or not project_name or not task_name or not time_note or not entry_date:
            return JSONResponse(content={"timelog": entry_output, "message": "Please enter all required fields.", "status_code": 400}, status_code=400)

        if employee_name not in members:
            return JSONResponse(content={"timelog": entry_output, "message": "Employee name is entered wrong.", "status_code": 400}, status_code=400)

        if project_name not in projects:
            return JSONResponse(content={"timelog": entry_output, "message": "Project name is entered wrong.", "status_code": 400}, status_code=400)

        if task_name not in tasks:
            return JSONResponse(content={"timelog": entry_output, "message": "Task name is entered wrong.", "status_code": 400}, status_code=400)

        entry = get_entry_by_id(id)
        if not entry:
            return JSONResponse(content={"message": "Entry not found", "status_code": 404}, status_code=404)

        conn = get_db_connection()
        cur = conn.cursor()

        if not ((time_from and time_to) or total_time):
            return JSONResponse(content={"timelog": entry_output, "message": "Please enter either Total Time or Time Duration.", "status_code": 400}, status_code=400)

        if (time_from and time_to) and total_time:
            return JSONResponse(content={"timelog": entry_output, "message": "Please enter only either Total Time or Time Duration.", "status_code": 400}, status_code=400)

        t_from_dt = None
        t_to_dt = None

        if time_from and time_to and not (time_from == "00:00" and time_to == "23:59"):
            try:
                fmt = "%H:%M"
                t_from_dt = datetime.fromisoformat(time_from)
                t_to_dt = datetime.fromisoformat(time_to)
            except ValueError:
                return JSONResponse( content={"timelog": entry_output, "message": "Time not entered in the correct format. Please enter time in 24 hour HH:MM format.", "status_code": 400}, status_code=400)
            # if (t_from_dt.date() != t_to_dt.date()) and t_from_dt < t_to_dt:
            #     return JSONResponse(content={"timelog": entry_output, "message": "Time Entry exceeds 24 hours. Please check the time duration", "status_code": 400}, status_code=400)
            delta = t_to_dt - t_from_dt
            if delta > timedelta(days=1):
                return JSONResponse( content={ "timelog": entry_output, "message": "Time entry exceeds 24 hours. Please check the time duration.", "status_code": 400, }, status_code=400, )
            # delta = t_to_dt - t_from_dt
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
                return JSONResponse( content={"timelog": entry_output, "message": "Time not entered in the correct format. Please enter time in 24 hour HH:MM format.", "status_code": 400}, status_code=400)
            t_from_dt = datetime.combine(entry_date_obj, time(0, 0))
            t_to_dt = datetime.combine(entry_date_obj, time(23, 59))
        elif entry['total_time'] == total_time:
            t_from_dt = datetime.combine(entry_date_obj, time(0, 0))
            t_to_dt = datetime.combine(entry_date_obj, time(23, 59))

        if not time_from:
            time_from = "00:00"
        if not time_to:
            time_to = "23:59"

        # unchanged = ( str(entry['employee_name']) == str(employee_name) and str(entry['project_name']) == str(project_name) and str(entry['task_name']) == str(task_name) and
        #         str(entry['entry_date']) == str(entry_date) and str(entry['note'] or '') == str(time_note or '') and normalize_time(entry['time_from']) == normalize_time(time_from) and
        #         normalize_time(entry['time_to']) == normalize_time(time_to) and normalize_time(entry['total_time']) == normalize_time(total_time) )

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
            return JSONResponse(content={ "timelog": entry_output, "message": "No changes were made to the the project time entry.", "status_code": 400}, status_code=400)

        validation, message = check_time(employee_name, entry_date, t_from_dt, t_to_dt, total_time, exclude_id=id)
        if not validation:
            return JSONResponse(content={"timelog": entry_output, "message": message, "status_code": 400}, status_code=400)

        cur.execute(
            "UPDATE project_attributes SET employee_name = %s, project_name = %s, task_name = %s, entry_date = %s, note = %s, time_from = %s, time_to = %s, total_time = %s WHERE timelog_id = %s RETURNING *",
            (employee_name, project_name, task_name, entry_date_obj, time_note, t_from_dt, t_to_dt, total_time, id)
        )
        row = cur.fetchone()
        timelog_id = row[0]
        edited_entry = row_to_dict(cur, row)
        conn.commit()
        cur.close()
        conn.close()

        response = {
            "edited_timelog": edited_entry,
            "message": "Project Time edited successfully.",
            "status_code": 201
        }

        return JSONResponse(content=response, status_code=201)

    except Exception as e:
        return JSONResponse(content={"error": "Database disconnected.", "status_code": 500, "details": str(e)}, status_code=500)

@app.delete("/timelog/{id}")
async def delete_entry(id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    entry = get_entry_by_id(id)
    if not entry:
        return JSONResponse(content={"message": f"No entry found with id {id}", "status_code": 404}, status_code=404)

    cur.execute("DELETE FROM project_attributes WHERE timelog_id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()

    return JSONResponse(content={"message": "Project Time entry deleted successfully", "status_code": 201}, status_code=201)