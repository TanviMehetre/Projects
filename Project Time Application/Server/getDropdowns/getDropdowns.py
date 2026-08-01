import pg8000

connection = None

def get_db_connection():
    global connection
    if connection is None:
        connection = pg8000.connect(
            host="database-2.c7y2iak4atpy.us-east-2.rds.amazonaws.com",
            port=5432,
            database="postgres",
            user="postgres",
            password="Task10Manage1"
        )
    return connection

def lambda_handler(event, context):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM members;")
        members = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT * FROM projects;")
        projects = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT * FROM task;")
        tasks = [row[0] for row in cur.fetchall()]

        cur.close()

        return {
            "members": members,
            "projects": projects,
            "tasks": tasks,
            "message": "All dropdowns available.",
            "status_code": 200
        }
    except Exception as e:
        return {
            "error": "Database disconnected.",
            "status_code": 500,
            "details": str(e)
        }
