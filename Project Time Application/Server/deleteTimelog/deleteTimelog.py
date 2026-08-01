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

def get_entry_by_id(entry_id: int, cur):
    cur.execute("SELECT * FROM project_attributes WHERE timelog_id = %s", (entry_id,))
    row = cur.fetchone()
    result = row_to_dict(cur, row) if row else None
    return result

def lambda_handler(event, context):
    id = None
    if "pathParameters" in event and event["pathParameters"]:
        id = event["pathParameters"].get("proxy")
    conn = get_db_connection()
    cur = conn.cursor()
    entry = get_entry_by_id(id, cur)
    if not entry:
        return {
            "statusCode": 404,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"message": f"No entry found with id {id}", "status_code": 404})
        }

    cur.execute("DELETE FROM project_attributes WHERE timelog_id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()

    response = {
        "statusCode": 201,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "message": "Project Time entry deleted successfully",
        "status_code": 201
    }
    return {
        "statusCode": 201,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(response)
    }