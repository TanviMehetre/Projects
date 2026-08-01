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

def row_to_dict(cursor, row):
    result = {}
    for idx, col in enumerate(cursor.description):
        val = row[idx]
        if isinstance(val, (datetime, date, time)):
            val = val.isoformat()
        result[col[0]] = val
    return result

def get_entry_by_id(entry_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM project_attributes WHERE timelog_id = %s", (entry_id,))
    row = cur.fetchone()
    result = row_to_dict(cur, row) if row else None
    cur.close()
    return result

def lambda_handler(event, context):
    try:
        id = None
        if "pathParameters" in event and event["pathParameters"]:
            id = event["pathParameters"].get("proxy")

        entry = get_entry_by_id(id)
        if not entry:
            return {
                "message": "Entry not found",
                "status_code": 404
            }

        response = {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
            },
            "body": json.dumps({
                "timelog": entry,
                "message": "Project Time record retrieved successfully."
            })
        }
        return response

    except Exception as e:
        return {
            "error": "Database disconnected.",
            "status_code": 500,
            "details": str(e)
        }
