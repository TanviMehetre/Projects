const express = require('express');
const { ObjectId } = require('mongodb');
const connectDB = require('./db/mongodb');
const path = require('path');
const hbs = require('hbs');
const routes = require("./routes");
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

const viewsPath = path.join(__dirname, '../templates/views');
const partialsPath = path.join(__dirname, '../templates/partials');

app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);

app.use(express.static(path.join(__dirname, '/static')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'my_secret_key',
    resave: true,
    saveUninitialized: true
}));

//Extra Functions

hbs.registerHelper("route", function(name, options) {
    const fn = routes[name];
    if (typeof fn === "function") {
        if (options.hash.id) {
            return fn(options.hash.id);
        }
        return fn();
    }
    return fn || "#";
});

hbs.registerHelper('eq', (a, b) => a === b);

hbs.registerHelper('or', (a, b) => a || b);

hbs.registerHelper('and', (a, b) => a && b);

hbs.registerHelper("formatDate", function(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
});

function timeMinutes(str) {
    const timing = str.split(":")
    const h = parseInt(timing[0]);
    const m = parseInt(timing[1]);
    return ((h * 60) + m);
}

function hhmm(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
}

function grouping(entry) {
    const grouped_project_attributes = {};

    entry.forEach(e => {
        const employee = e.employeeName || "Unknown";
        const dateGroup = e.dateEntry || "No Date";

        if (!grouped_project_attributes[employee]) {
            grouped_project_attributes[employee] = { total_emp: 0, dates: {} };
        }
        if (!grouped_project_attributes[employee].dates[dateGroup]) {
            grouped_project_attributes[employee].dates[dateGroup] = { e: [], total: 0, total_str: "0.00" };
        }

        grouped_project_attributes[employee].dates[dateGroup].e.push(e);

        const mins = timeMinutes(e.totalTime);

        grouped_project_attributes[employee].dates[dateGroup].total += mins;
        grouped_project_attributes[employee].dates[dateGroup].total_str = hhmm(grouped_project_attributes[employee].dates[dateGroup].total);

        grouped_project_attributes[employee].total_emp += mins;
        grouped_project_attributes[employee].total_emp_str = hhmm(grouped_project_attributes[employee].total_emp);
    });
    return grouped_project_attributes;
}

function timeFormatting(entry) {
    try {
        if (entry.timeFrom && entry.timeTo && !entry.totalTime) {
            const timeFrom = timeMinutes(entry.timeFrom);
            const timeTo = timeMinutes(entry.timeTo)
            const delta = timeTo - timeFrom;
            if (delta > 0) {
                entry.totalTime = hhmm(delta)
            }
        } else if (entry.totalTime && entry.timeFrom == "00:00" || entry.timeTo == "23:59") {
            entry.totalTime = entry.totalTime
        } else if (entry.totalTime && !entry.timeFrom || !entry.timeTo) {
            entry.timeFrom = "00:00";
            entry.timeTo = "23:59";
        } else {
            res.status(400).send(e.message);
        }
    } catch (e) {
        res.status(400).send(e.message);
    }
}

function exceedTime(timeFrom, timeTo, totalTime) {
    const minutesFrom = timeMinutes(timeFrom);
    const minutesTo = timeMinutes(timeTo);
    const minutesTotal = timeMinutes(totalTime)
    if (minutesFrom < 0 || minutesFrom > 1439 || minutesTo < 0 || minutesTo > 1439 || minutesTotal < 0 || minutesTotal > 1439) {
        return true;
    }
    return false;
}

async function checkTime(employee, dateEntry, timeFrom, timeTo, totalTime, excludeID = null) {
    const db = await connectDB();
    const query = {
        employeeName: employee,
        dateEntry,
        _id: { $ne: excludeID }
    };
    isValid = true;
    const entries = await db.collection('projecttimes').find(query).toArray();
    minutesForDay = timeMinutes(totalTime);
    message = ""
    isValid = true

    const isFullDay = (timeFrom === "00:00" && timeTo === "23:59");
    const hasFullDay = entries.some(e => e.timeFrom === "00:00" && e.timeTo === "23:59");

    if (hasFullDay) {
        if (!isFullDay) {
            return {
                isValid: false,
                message: "Project Time entry is overlapping with an existing time entry."
            };
        }
    }

    if (!isFullDay && !hasFullDay) {
        entries.forEach(entry => {
            minutesForDay += timeMinutes(entry.totalTime);
            if (entry.timeFrom == "00:00" && entry.timeTo == "23:59" && timeFrom == "00:00" && timeTo == "23:59") {
                return { isValid };
            }
            if (timeFrom != "00:00" && timeTo != "23:59") {
                if (timeFrom < entry.timeTo && entry.timeFrom < timeTo) {
                    message = "Project Time entry overlaps with an existing time."
                    isValid = false;
                }
            }
        })
    } else {
        entries.forEach(entry => {
            minutesForDay += timeMinutes(entry.totalTime);
        })
    }

    if (minutesForDay > 16 * 60) {
        message = "Total time exceeds 16 hours for the selected date."
        isValid = false
    }
    return { isValid, message }
}

function validateEntry(entry, res, employees, projects, tasks) {
    const renderWithMessage = (text) => {
        return res.render("create", {
            message: { type: "danger", text },
            form_data: {...entry },
            layout: "base",
            mode: "add",
            employees,
            projects,
            tasks
        });
    };

    const requiredFields = ["employeeName", "project", "task", "dateEntry", "timeNote"];
    const missing = requiredFields.some(f => !entry[f]);
    if (missing) return renderWithMessage("Please fill out all the required fields.");

    const hasRange = entry.timeFrom && entry.timeTo;
    const hasTotal = entry.totalTime;

    if (hasRange && hasTotal) return renderWithMessage("Enter only either Total Time or Time Duration.");
    if (!hasRange && !hasTotal) return renderWithMessage("Enter either Total Time or Time Duration.");

    const validFormat = (t) => {
        if (!t) return false;
        const parts = t.split(":");
        return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
    };

    if (hasRange && (!validFormat(entry.timeFrom) || !validFormat(entry.timeTo))) {
        return renderWithMessage("Please enter the time in HH:MM format only.");
    }

    if (hasTotal && !validFormat(entry.totalTime)) {
        return renderWithMessage("Please enter the time in HH:MM format only.");
    }

    return null;
}

async function validateEdit(entry, existing, res, employees, projects, tasks) {
    const renderWithMessage = (type, text) =>
        res.render("create", {
            message: { type, text },
            form_data: {...entry, _id: entry.id || existing._id },
            layout: "base",
            mode: "edit",
            employees,
            projects,
            tasks
        });

    if (!existing) {
        return renderWithMessage("danger", "Project time entry not found.");
    }

    const isUnchanged =
        existing.employeeName === entry.employeeName &&
        existing.project === entry.project &&
        existing.task === entry.task &&
        existing.dateEntry === entry.dateEntry &&
        existing.timeFrom === entry.timeFrom &&
        existing.timeTo === entry.timeTo &&
        existing.totalTime === entry.totalTime &&
        (existing.timeNotes || "") === (entry.timeNotes || "");

    if (isUnchanged) {
        return renderWithMessage("info", "No changes detected in the form.");
    }

    const hasRange = entry.timeFrom && entry.timeTo;
    const hasTotal = entry.totalTime;

    if (entry.timeFrom !== "00:00" || entry.timeTo !== "23:59") {
        if (hasRange && hasTotal) return renderWithMessage("danger", "Enter only Total Time or Time Duration.");
        if (!hasRange && !hasTotal) return renderWithMessage("danger", "Enter either Total Time or Time Duration.");

        const validFormat = (t) => {
            if (!t) return false;
            const parts = t.split(":");
            return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
        };
        if (hasRange && (!validFormat(entry.timeFrom) || !validFormat(entry.timeTo))) {
            return renderWithMessage("danger", "Please enter the time in HH:MM format only.");
        }
        if (hasTotal && !validFormat(entry.totalTime)) {
            return renderWithMessage("danger", "Please enter the time in HH:MM format only.");
        }
    }

    const requiredFields = ["employeeName", "project", "task", "dateEntry", "timeNote"];
    const missing = requiredFields.some((f) => !entry[f]);
    if (missing) return renderWithMessage("danger", "Please fill out all the required fields.");

    return null;
}

//Routes

app.get("/", async(req, res) => {
    try {
        if (req.query.resetSession === "1") {
            req.session.lastFilterParams = null;
        }
        const db = await connectDB();

        let { project, member, from, to } = req.query;
        if (!project && req.session.lastFilterParams) {
            ({ project, member, from, to } = req.session.lastFilterParams);
        }
        const projects = await db.collection("project").find().toArray();
        const employees = await db.collection("employeeName").find().toArray();


        if (!from) from = "2024-09-20";
        if (!to) to = "2025-09-20";

        const filter = {};

        if (project && project !== "1") {
            filter.project = project;
        }
        if (member && member !== "1") {
            filter.employeeName = member;
        }

        filter.dateEntry = { $gte: from, $lte: to };

        const entries = await db.collection("projecttimes")
            .find(filter)
            .sort({ employeeName: 1, dateEntry: 1, timeFrom: 1 })
            .toArray();

        const grouped_project_attributes = grouping(entries);

        let message = null;
        if (req.query.deleted) {
            message = { type: "success", text: "Project time entry has been deleted successfully." };
        } else if (entries.length === 0) {
            message = { type: "danger", text: "No project time entry is available for the filters." };
        }

        req.session.lastFilterParams = { project, member, from, to };
        return res.render("index", {
            layout: "base",
            projects,
            employees,
            grouped_project_attributes,
            mode: "filter",
            p: project || "1",
            member: member || "1",
            date_from: from,
            date_to: to,
            message,
        });
    } catch (err) {
        return res.render("index", {
            layout: "base",
            projects: [],
            employees: [],
            grouped_project_attributes: {},
            mode: "filter",
            p: "1",
            member: "1",
            message: { type: "danger", text: "Database disconnected. Please try again later." }
        });
    }
});

app.post('/filter', async(req, res) => {
    try {
        const db = await connectDB();
        const { project, member, date_range, range2 } = req.body;

        const filter = {};

        if (project && project !== "1") {
            filter.project = project;
        }
        if (member && member !== "1") {
            filter.employeeName = member;
        }
        if (date_range && range2) {
            filter.dateEntry = {
                $gte: date_range,
                $lte: range2
            };
        }

        const entries = await db.collection('projecttimes').find(filter).sort({ employeeName: 1, dateEntry: 1, timeFrom: 1 }).toArray();
        const projects = await db.collection('project').find().toArray();
        const employees = await db.collection('employeeName').find().toArray();
        const grouped_project_attributes = grouping(entries);

        const message = entries.length === 0 ? { type: "danger", text: "No project time entry is available for the entered criteria." } : null;

        req.session.lastFilterParams = {
            project,
            member,
            from: date_range,
            to: range2
        };
        req.session.lastFilterResult = {
            layout: "base",
            projects,
            employees,
            p: project,
            member,
            date_from: date_range,
            date_to: range2,
            mode: "filter",
            grouped_project_attributes,
            message
        };

        return res.render("index", req.session.lastFilterResult);
    } catch (e) {
        return res.render("index", {
            layout: "base",
            projects: [],
            employees: [],
            mode: "filter",
            p: "1",
            member: "1",
            message: { type: "danger", text: "Database disconnected. Please try again later." }
        });
    }
});

app.get('/addTime', async(req, res) => {
    try {
        const db = await connectDB();
        const employees = await db.collection('employeeName').find().toArray();
        const projects = await db.collection('project').find().toArray();
        const tasks = await db.collection('task').find().toArray();
        return res.render('create', {
            layout: "base",
            mode: "add",
            employees,
            projects,
            tasks
        });
    } catch (e) {
        return res.render('create', {
            layout: "base",
            mode: "add",
            employees: [],
            projects: [],
            tasks: [],
            message: { type: "danger", text: "Database disconnected. Please try again later." }
        });
    }
});

app.post('/addTime', async(req, res) => {
    let entry = req.body;
    req.session.form_data = entry;
    try {
        const db = await connectDB();
        const employees = await db.collection('employeeName').find().toArray();
        const projects = await db.collection('project').find().toArray();
        const tasks = await db.collection('task').find().toArray();

        const validationError = validateEntry(entry, res, employees, projects, tasks);
        if (validationError) return validationError;

        timeFormatting(entry);
        const exceedLimit = exceedTime(entry.timeFrom, entry.timeTo, entry.totalTime);
        if (exceedLimit === false) {
            const check = await checkTime(entry.employeeName, entry.dateEntry, entry.timeFrom, entry.timeTo, entry.totalTime);
            if (check.isValid) {
                const result = await db.collection('projecttimes').insertOne(req.body);
                req.session.form_data = null;
                // return res.redirect(`/editTime/${result.insertedId}`);
                return res.render("create", {
                    message: { type: "success", text: "Successfully Created the Project Time entry." },
                    form_data: {...entry, _id: entry._id },
                    layout: "base",
                    mode: "edit",
                    employees,
                    projects,
                    tasks
                });
            } else {
                return res.render("create", {
                    message: { type: "danger", text: check.message },
                    form_data: {...entry },
                    layout: "base",
                    mode: "add",
                    employees,
                    projects,
                    tasks
                });
            }
        }
        return res.render("create", {
            message: { type: "info", text: "Time has not been entered in correct 24 hour format." },
            form_data: {...entry },
            layout: "base",
            mode: "add",
            employees,
            projects,
            tasks
        });
    } catch (e) {
        const form_data = req.session.form_data || {};
        return res.render("create", {
            layout: "base",
            projects: form_data.project ? [{ project: form_data.project }] : [],
            employees: form_data.employeeName ? [{ employeeName: form_data.employeeName }] : [],
            tasks: form_data.task ? [{ task: form_data.task }] : [],
            mode: "add",
            form_data,
            message: { type: "danger", text: "Database disconnected. Please try again later." }
        });
    }
});

app.get('/viewTime/:id', async(req, res) => {
    try {
        const db = await connectDB();
        const employees = await db.collection('employeeName').find().toArray();
        const projects = await db.collection('project').find().toArray();
        const tasks = await db.collection('task').find().toArray();
        const form_data = await db.collection('projecttimes').findOne({ _id: new ObjectId(req.params.id) })
        return res.render('create', {
            layout: "base",
            mode: "view",
            employees,
            projects,
            tasks,
            form_data
        });
    } catch (e) {
        const form_data = req.session.form_data || {};

        return res.render('create', {
            layout: "base",
            mode: "view",
            employees: form_data.employeeName ? [{ employeeName: form_data.employeeName }] : [],
            projects: form_data.project ? [{ project: form_data.project }] : [],
            tasks: form_data.task ? [{ task: form_data.task }] : [],
            form_data,
            message: { type: "danger", text: "Database disconnected. Please try again later" }
        });
    }
});

app.get('/editTime/:id', async(req, res) => {
    try {
        const db = await connectDB();
        const employees = await db.collection('employeeName').find().toArray();
        const projects = await db.collection('project').find().toArray();
        const tasks = await db.collection('task').find().toArray();
        const entry = await db.collection('projecttimes').findOne({ _id: new ObjectId(req.params.id) })
        return res.render('create', {
            layout: "base",
            mode: "edit",
            employees,
            projects,
            tasks,
            form_data: {...entry, _id: req.params.id }
        });
    } catch (e) {
        return res.render("create", {
            layout: "base",
            projects: [],
            employees: [],
            tasks: [],
            mode: "edit",
            message: { type: "danger", text: "Database disconnected. Please try again later." }
        });
    }
});

app.post('/editTime/:id', async(req, res) => {
    let entry = req.body;
    req.session.form_data = entry;
    req.session.form_data.id = req.params.id;
    try {
        const db = await connectDB();
        const employees = await db.collection('employeeName').find().toArray();
        const projects = await db.collection('project').find().toArray();
        const tasks = await db.collection('task').find().toArray();

        const existing = await db.collection("projecttimes").findOne({ _id: new ObjectId(req.params.id) });
        entry.id = req.params._id;

        const validationError = await validateEdit(entry, existing, res, employees, projects, tasks);
        if (validationError) return validationError;

        timeFormatting(entry)
        const exceedLimit = exceedTime(entry.timeFrom, entry.timeTo, entry.totalTime);
        if (exceedLimit === false) {
            const check = await checkTime(entry.employeeName, entry.dateEntry, entry.timeFrom, entry.timeTo, entry.totalTime, new ObjectId(req.params.id))
            if (check.isValid) {
                const result = await db.collection('projecttimes').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
                // return res.redirect(`/editTime/${req.params.id}`);
                req.session.form_data = null;
                return res.render("create", {
                    message: { type: "success", text: "Successfully Edited the Project Time entry." },
                    form_data: {...entry, _id: req.params.id },
                    layout: "base",
                    mode: "edit",
                    employees,
                    projects,
                    tasks
                });
            } else {
                return res.render("create", {
                    message: { type: "danger", text: check.message },
                    form_data: {...entry, _id: req.params.id },
                    layout: "base",
                    mode: "edit",
                    employees,
                    projects,
                    tasks
                });
            }
        }
        return res.render("create", {
            message: { type: "info", text: "Time has not been entered in correct 24 hour format." },
            form_data: {...entry, _id: req.params.id },
            layout: "base",
            mode: "edit",
            employees,
            projects,
            tasks
        });
    } catch (e) {
        const form_data = req.session.form_data || {};

        return res.render("create", {
            layout: "base",
            projects: form_data.project ? [{ project: form_data.project }] : [],
            employees: form_data.employeeName ? [{ employeeName: form_data.employeeName }] : [],
            tasks: form_data.task ? [{ task: form_data.task }] : [],
            mode: "edit",
            form_data,
            message: { type: "danger", text: "Database disconnected. Please try again later." }
        });
    }
});

app.post('/deleteTime/:id', async(req, res) => {
    try {
        const db = await connectDB();
        await db.collection('projecttimes').deleteOne({ _id: new ObjectId(req.params.id) });

        return res.redirect('/?deleted=1');
    } catch (e) {
        return res.status(500).send(e.message);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});