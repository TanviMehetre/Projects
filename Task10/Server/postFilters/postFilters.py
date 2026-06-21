import json
import pg8000
from datetime import datetime, date, time

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
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

def serialize_row(columns, row):
    result = {}
    for i, col in enumerate(columns):
        val = row[i]
        if isinstance(val, (datetime, date, time)):
            val = val.isoformat()
        result[col] = val
    return result

def group_projects(rows):
    grouped = {}
    for e in rows:
        name = e.get("employee_name")
        date_key = e.get("entry_date", "Unknown")[:10] if e.get("entry_date") else "Unknown"
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

def lambda_handler(event, context):
    try:
        action = event.get("action")
        project = event.get("project")
        member = event.get("member")
        date_from = event.get("date_range", "2024-09-30")
        date_to = event.get("range2", "2025-09-30")

        if action == "reset":
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "filters": None,
                    "message": "Filters reset successfully.",
                    "status_code": 200,
                    "status": "success"
                })
            }
        conn = get_db_connection()
        cur = conn.cursor()

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
        colnames = [desc[0] for desc in cur.description]
        rows = [serialize_row(colnames, r) for r in cur.fetchall()]
        cur.close()
        # conn.close()

        grouped = group_projects(rows)

        if not grouped:
            result = {
                    "message": "No project time record available for the filters applied.",
                    "status_code": 201,
                    "data": {}
            }
            return result

        result = {
            "filters": {"project": project, "member": member, "date_from": date_from, "date_to": date_to},
            "timelogs": grouped,
            "message": "All project time records retrieved successfully.",
            "status_code": 200
        }
        return result

    except Exception as e:
        result = {
            "error": "Database disconnected.",
            "status_code": 500,
            "details": str(e)
        }
        return result
