import os
from datetime import datetime, timedelta, time, date
from zipfile import error

import flask
import psycopg2.extras
from flask import Flask, render_template, request, url_for, redirect, flash, session
from flask_bootstrap import Bootstrap5

app = Flask(__name__)
app.secret_key = 'supersecretkey'
bootstrap = Bootstrap5(app)

def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="postgres",
        user="postgres",
        password="trinity"
    )
    return conn

def get_entry_by_id(id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM project_attributes WHERE timelog_id = %s", (id,))
            row = cur.fetchone()
            if row is None:
                error(404, description=f"Entry with id {id} not found")
            return row
    finally:
        conn.close()

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

@app.template_filter('to_hhmm')
def to_hhmm(value):
    if hasattr(value, 'strftime'):
        return value.strftime('%H:%M')
    if isinstance(value, str):
        if ':' in value and len(value) <= 5:
            return value
    return ''


def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ('%Y-%m-%d', '%m-%d-%Y'):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None

def check_time(employee, date, time_from, time_to, total_time, exclude_id=None):
    print("Reached here")
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    entry = "SELECT * FROM project_attributes WHERE employee_name = %s AND date = %s"
    params = [employee, date]
    if exclude_id:
        entry += " AND timelog_id != %s"
        params.append(exclude_id)
    cur.execute(entry, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    fmt = "%H:%M"
    time_from_obj = datetime.strptime(time_from, fmt).time()
    time_to_obj = datetime.strptime(time_to, fmt).time()

    if time_from_obj > time_to_obj:
        return False, "Time from should not be greater than time to."

    print(time_from_obj, time_to_obj)

    for row in rows:
        row_t_from = row['time_from']
        row_t_to = row['time_to']

        if row_t_from == time(0, 0) and row_t_to == time(23, 59):
            return True, None

        if (time_from_obj < row_t_to) and (row_t_from < time_to_obj):
            return False, "Project Time entry overlaps with an existing time."

    total_minutes = _to_minutes(total_time)
    for row in rows:
        total_minutes += _to_minutes(row['total_time'])

    if total_minutes > 16*60:
        return False, "Total time exceeds 16 hours for this date."

    return True, None

def serialize_entry(entry):
    entry_copy = dict(entry)
    for k in ['time_from', 'time_to', 'total_time']:
        val = entry_copy.get(k)
        if val:
            entry_copy[k] = val.strftime('%H:%M')
    return entry_copy


@app.route('/', methods=['GET', 'POST'])
def index():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT * FROM projects;')
        projects = cur.fetchall()
        cur.close()

        cur = conn.cursor()
        cur.execute('SELECT * FROM members;')
        members = cur.fetchall()
        cur.close()
    except Exception as e:
        flash('Database disconnected. Please try again later.', 'danger')
        return render_template('index.html', projects=[], members=[], grouped_project_attributes={}, mode='filter', p=None, member=None, date_from=None, date_to=None)

    if request.method == 'POST':
        action = request.form.get('action')
        if action == 'filter':
            session['filters'] = {
                'project': request.form.get('project'),
                'member': request.form.get('member'),
                'date_from': request.form.get('date_range'),
                'date_to': request.form.get('range2')
            }
        elif action == 'reset':
            session.pop('filters', None)

        return redirect(url_for('index'))

    filters = session.get('filters', {})
    project = filters.get('project')
    member = filters.get('member')
    date_from = parse_date(filters.get('date_from'))
    date_to = parse_date(filters.get('date_to'))

    query = 'SELECT * FROM project_attributes WHERE 1=1'
    params = []

    if project and project != "1":
        query += " AND project_id = %s"
        params.append(project)

    if member and member != "1":
        query += " AND employee_name = %s"
        params.append(member)

    if date_from:
        query += " AND date >= %s"
        params.append(date_from)

    if date_to:
        query += " AND date <= %s"
        params.append(date_to)

    query += ' ORDER BY employee_name ASC, date ASC, time_from ASC'

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(query, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    grouped = {}
    for e in rows:
        name = e['employee_name']
        date_key = e['date'].strftime('%m-%d-%Y') if e['date'] else 'Unknown'

        person = grouped.setdefault(name, {'dates': {}, 'total_minutes': 0})
        day = person['dates'].setdefault(date_key, {'entries': [], 'total_minutes': 0})

        day['entries'].append(e)
        mins = _to_minutes(e.get('total_time'))
        day['total_minutes'] += mins
        person['total_minutes'] += mins

    for person in grouped.values():
        for date_data in person['dates'].values():
            date_data['total_str'] = _hhmm(date_data['total_minutes'])
        person['total_str'] = _hhmm(person['total_minutes'])

    if not grouped:
        flash('No project time record available for the filters applied', 'danger')

    return render_template('index.html', projects=projects, members=members, grouped_project_attributes=grouped, mode='filter', p=project, member=member, date_from=date_from, date_to=date_to)

@app.route('/addTime', methods=['GET', 'POST'])
def addTime():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT * FROM projects;')
        projects = cur.fetchall()
        cur.close()

        cur = conn.cursor()
        cur.execute('SELECT * FROM members;')
        members = cur.fetchall()
        cur.close()

        cur = conn.cursor()
        cur.execute('SELECT * FROM task;')
        task = cur.fetchall()
        cur.close()
        # conn.close()
    except Exception as e:
        entry = {
            'timelog_id': request.form.get('timelog_id'),
            'employee_name': request.form.get('employee') or request.form.get('employee_hidden'),
            'project_id': request.form.get('project') or request.form.get('project_hidden'),
            'task_id': request.form.get('task') or request.form.get('task_hidden'),
            'date': request.form.get('time_date') or request.form.get('date_hidden'),
            'note': request.form.get('time_note') or request.form.get('note_hidden'),
            'time_from': request.form.get('time_from') or request.form.get('time_from_hidden'),
            'time_to': request.form.get('time_to') or request.form.get('time_to_hidden'),
            'total_time': request.form.get('total_time') or request.form.get('total_time_hidden')
        }
        if not entry.get('timelog_id'):
            entry['timelog_id'] = str(id)
        print(entry['timelog_id'])
        projects = [(entry['project_id'], 'Selected Project')] if entry['project_id'] else []
        members = [(entry['employee_name'],)] if entry['employee_name'] else []
        tasks = [(entry['task_id'], 'Selected Task')] if entry['task_id'] else []

        flash('Database disconnected. Changes made will not be saved.', 'danger')
        return render_template('create.html', projects=projects, members=members, task=tasks, data=entry, mode='add')


    if request.method == 'POST':
        name = request.form['employee']
        project = request.form['project']
        task = request.form['task']
        date = request.form['time_date']
        time_note = request.form['time_note']
        time_from = request.form['time_from']
        time_to = request.form['time_to']
        total_time = request.form['total_time']

        session['form_data'] = request.form.to_dict()

        if not name or not project or not task or not time_note:
            flash('Please enter all required fields.', 'danger')
            return redirect(url_for('addTime'))

        if time_from and time_to and total_time:
            flash('Please enter either total time or time duration.', 'danger')
            return redirect(url_for('addTime'))

        if time_from and time_to and not total_time:
            try:
                fmt = "%H:%M"
                t_from = datetime.strptime(time_from, fmt)
                t_to = datetime.strptime(time_to, fmt)
            except ValueError:
                flash('Please enter a valid time.', 'danger')
                return redirect(url_for('addTime'))
            delta = t_to - t_from
            if delta.total_seconds() < 0:
                delta = timedelta(days=1) + delta
            total_hours = delta.seconds // 3600
            total_minutes = (delta.seconds % 3600) // 60
            total_time = f"{total_hours:02}:{total_minutes:02}"
        elif total_time and not time_from and not time_to:
            time_from = "00:00"
            time_to = "23:59"
        else:
            flash('Please enter a valid time', 'danger')
            return redirect(url_for('addTime'))


        validation, message = check_time(name, date, time_from, time_to, total_time, None)
        print(validation, message)
        if not validation:
            flash(message, 'danger')
            print(session['form_data'])
            return redirect(url_for('addTime'))

        # conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO project_attributes (employee_name, project_id, task_id, date, note, time_from, time_to, total_time) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING timelog_id',
            (name, project, task, date,time_note,time_from,time_to,total_time)
        )
        timelog_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        flash('Project Time Recorded Successfully', 'success')
        session.pop('form_data', None)
        return redirect(url_for('editTime', id=timelog_id))

    form_data = session.get('form_data')
    session.pop('form_data', None)
    return render_template('create.html',projects=projects, members=members, task=task, form_data=form_data)


@app.route('/viewTime/<int:id>')
def viewTime(id):
    try:
        entry = get_entry_by_id(id)
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT * FROM projects;')
        projects = cur.fetchall()
        cur.close()

        cur = conn.cursor()
        cur.execute('SELECT * FROM members;')
        members = cur.fetchall()
        cur.close()

        cur = conn.cursor()
        cur.execute('SELECT * FROM task;')
        tasks = cur.fetchall()
        cur.close()
        conn.close()
        session['last_entry'] = serialize_entry(dict(entry))
        entry = serialize_entry(dict(entry))
    except Exception as e:
        last_entry = session.get('last_entry', {})
        date_str = ""
        raw_date = last_entry.get('date')
        if raw_date:
            try:
                dt = datetime.strptime(raw_date, "%a, %d %b %Y %H:%M:%S %Z")
                date_str = dt.strftime("%Y-%m-%d")
            except Exception as parse_err:
                date_str = raw_date[:10]
        entry = {
            'timelog_id': str(id),
            'employee_name': last_entry.get('employee_name'),
            'project_id': last_entry.get('project_id'),
            'task_id': last_entry.get('task_id'),
            'date': date_str,
            'note': last_entry.get('note'),
            'time_from': last_entry.get('time_from'),
            'time_to': last_entry.get('time_to'),
            'total_time': last_entry.get('total_time'),
        }

        if not entry.get('timelog_id'):
            entry['timelog_id'] = str(id)
        projects = [(entry['project_id'], 'Selected Project')] if entry.get('project_id') else []
        members = [(entry['employee_name'],)] if entry.get('employee_name') else []
        tasks = [(entry['task_id'], 'Selected Task')] if entry.get('task_id') else []

        flash('Database disconnected.', 'danger')
    return render_template('create.html', mode='view', data=entry, projects=projects, members=members, task=tasks)


@app.route('/editTime/<int:id>', methods=['GET', 'POST'])
def editTime(id):
    try:
        entry = get_entry_by_id(id)
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT * FROM projects;')
        projects = cur.fetchall()
        cur.close()

        cur = conn.cursor()
        cur.execute('SELECT * FROM members;')
        members = cur.fetchall()
        cur.close()

        cur = conn.cursor()
        cur.execute('SELECT * FROM task;')
        tasks = cur.fetchall()
        cur.close()
    except Exception as e:
        session_entry = session.get('last_entry', {}) or {}
        entry = {
            'timelog_id': request.form.get('timelog_id') or session_entry.get('timelog_id') or str(id),
            'employee_name': request.form.get('employee') or request.form.get('employee_hidden') or session_entry.get('employee_name'),
            'project_id': request.form.get('project') or request.form.get('project_hidden') or session_entry.get('project_id'),
            'task_id': request.form.get('task') or request.form.get('task_hidden') or session_entry.get('task_id'),
            'date': request.form.get('time_date') or request.form.get('date_hidden') or session_entry.get('date'),
            'note': request.form.get('time_note') or request.form.get('note_hidden') or session_entry.get('note'),
            'time_from': request.form.get('time_from') or request.form.get('time_from_hidden') or session_entry.get('time_from'),
            'time_to': request.form.get('time_to') or request.form.get('time_to_hidden') or session_entry.get('time_to'),
            'total_time': request.form.get('total_time') or request.form.get('total_time_hidden') or session_entry.get('total_time')
        }

        raw_date = entry.get('date')
        if raw_date:
            try:
                dt = datetime.strptime(raw_date, "%a, %d %b %Y %H:%M:%S %Z")
                entry['date'] = dt.strftime("%Y-%m-%d")
            except Exception:
                entry['date'] = raw_date[:10]

        projects = [(entry['project_id'], 'Selected Project')] if entry.get('project_id') else []
        members = [(entry['employee_name'],)] if entry.get('employee_name') else []
        tasks = [(entry['task_id'], 'Selected Task')] if entry.get('task_id') else []

        flash('Database disconnected. Changes made will not be saved.', 'danger')
        return render_template('create.html', mode='edit', data=entry, projects=projects, members=members, task=tasks)


    cur = conn.cursor()
    if request.method == 'POST':
        name = request.form['employee']
        project = request.form['project']
        task = request.form['task']
        date = request.form['time_date']
        time_note = request.form['time_note']
        time_from = request.form['time_from']
        time_to = request.form['time_to']
        total_time = request.form['total_time']

        # print(time_from, time_to, total_time)

        if not name or not project or not task or not time_note:
            flash('Please enter all required fields.', 'danger')

        if time_from and time_to and not (time_from == "00:00" and time_to == "23:59"):
            try:
                fmt = "%H:%M"
                t_from = datetime.strptime(time_from, fmt)
                t_to = datetime.strptime(time_to, fmt)
            except ValueError:
                flash("Time not entered in the correct format. Please enter time in 24 hour HH:MM format.", "warning")
                return render_template('create.html', mode='edit', data=entry, projects=projects, members=members, task=tasks)
            delta = t_to - t_from
            if delta.total_seconds() < 0:
                delta = timedelta(days=1) + delta
            total_hours = delta.seconds // 3600
            total_minutes = (delta.seconds % 3600) // 60
            total_time = f"{total_hours:02}:{total_minutes:02}"
        elif not entry['total_time'].strftime("%H:%M") == total_time:
            time_from = "00:00"
            time_to = "23:59"

        print(total_time)

        unchanged = ( str(entry['employee_name']) == str(name) and str(entry['project_id']) == str(project) and str(entry['task_id']) == str(task) and
                str(entry['date']) == str(date) and str(entry['note'] or '') == str(time_note or '') and entry['time_from'].strftime("%H:%M") == time_from and
                entry['time_to'].strftime("%H:%M") == time_to and entry['total_time'].strftime("%H:%M") == total_time )

        print(entry['total_time'].strftime("%H:%M") , total_time)

        if unchanged:
            flash("No changes were made to the project time.", "warning")
            return render_template('create.html', mode='edit', data=entry, projects=projects, members=members, task=tasks)

        validation, message = check_time(name, date, time_from, time_to, total_time, exclude_id=id)
        print(validation, message)
        if not validation:
            flash(message, 'danger')
            return render_template('create.html', mode='edit', data=entry, projects=projects, members=members, task=tasks)

        cur.execute(
            "UPDATE project_attributes SET employee_name = %s, project_id = %s, task_id = %s, date = %s, note = %s, time_from = %s, time_to = %s, total_time = %s WHERE timelog_id = %s",
            (name, project, task, date, time_note, time_from, time_to, total_time, id)
        )
        conn.commit()
        cur.close()

        conn.close()
        flash('Project Time Edited Successfully', 'success')
        return redirect(url_for('editTime', id=id))
    conn.close()
    return render_template('create.html', mode='edit', data=entry, projects=projects, members=members, task=tasks)

@app.route('/delete/<int:id>', methods=["POST",])
def delete(id):
    app.logger.info("Delete invoked")
    conn = get_db_connection()

    cur = conn.cursor()
    cur.execute("DELETE FROM project_attributes WHERE timelog_id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()

    flash('Project Time deleted successfully!', 'success')
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)

