import { http, HttpResponse } from "msw";

export const handlers = [
    http.get("http://127.0.0.1:8000/timelog/dropdowns", () =>
        HttpResponse.json({
            members: ["John Doe", "Peter White", "John Smith", "Ann Smith", "Tanvi Mehetre"],
            projects: ["ACC - RI Digitization", "GEM - GoEmed Hosting Support", "Quadyster - Staffing Support", "Quadyster - Technology Support"],
            tasks: ["SUPPORT - Support", "CONS - Consulting", "DEV - Development"],
            message: "All dropdowns available.",
            status_code: 200,
        })
    ),

    http.delete("http://127.0.0.1:8000/timelog/:id", async ({ params }) => {
        const { id } = params;
        return HttpResponse.json({
            message: "Project Time entry deleted successfully",
            status_code: 201,
        });
    }),

    http.get(`http://127.0.0.1:8000/timelog/:id`, async ({ params }) => {
        const { id } = params;
        if (id == 66) {
            return HttpResponse.json({
                timelog: {
                    timelog_id: 66,
                    employee_name: "Ann Smith",
                    project_name: "ACC - RI Digitization",
                    task_name: "SUPPORT - Support",
                    entry_date: "2025-10-01",
                    note: "Project Meeting",
                    time_from: "2025-10-01T00:00:00",
                    time_to: "2025-10-01T23:59:00",
                    total_time: "06:00:00",
                },
                message: "Project Time record retrieved successfully.",
                status_code: 200,
            });
        }
        if (id == 86) {
            return HttpResponse.json({
                timelog: {
                    timelog_id: 86,
                    employee_name: "John Smith",
                    project_name: "ACC - RI Digitization",
                    task_name: "DEV - Development",
                    entry_date: "2025-10-23",
                    note: "Project Meeting",
                    time_from: "2025-10-23T23:00:00",
                    time_to: "2025-10-24T01:00:00",
                    total_time: "02:00:00",
                },
                message: "Project Time record retrieved successfully.",
                status_code: 200,
            });
        }
        if (id == 62) {
            return HttpResponse.json({
                timelog: {
                    timelog_id: 62,
                    employee_name: "Tanvi Mehetre",
                    project_name: "GEM - GoEmed Hosting Support",
                    task_name: "DEV - Development",
                    entry_date: "2025-10-25",
                    note: "Project Meeting",
                    time_from: "2025-10-25T08:00:00",
                    time_to: "2025-10-25T10:00:00",
                    total_time: "02:00:00",
                },
                message: "Project Time record retrieved successfully.",
                status_code: 200,
            });
        }
    }),

    http.put("http://127.0.0.1:8000/timelog/:id", async ({ params, request }) => {
        const { id } = params;
        const updatedData = await request.json();
        let message = "";
        let status_code = 201;

        if ((updatedData.time_from || updatedData.time_to) && updatedData.total_time) {
            message = "Please enter only either Total Time or Time Duration.";
            status_code = 400;
        } else if (!(updatedData.time_from || updatedData.time_to) && !updatedData.total_time) {
            message = "Please enter either Total Time or Time Duration.";
            status_code = 400;
        } else {
            message = "Project Time edited successfully.";
            status_code = 201;
        }

        if (updatedData.employee_name == "Ann Smith" && updatedData.project_name == "ACC - RI Digitization" && updatedData.task_name == "SUPPORT - Support" && updatedData.entry_date == "2025-10-01" && updatedData.total_time == "06:00" && updatedData.time_note == "Project Meeting") {
            message = "No changes were made to the the project time entry.";
            status_code = 400;
        }

        if (updatedData.time_from && updatedData.time_to && message == "Project Time edited successfully.") {
            updatedData.total_time = "02:00";
        } else if (updatedData.total_time) {
            updatedData.time_from = "2025-10-01T00:00:00";
            updatedData.time_to = "2025-10-01T23:59:59";
        }
        if (parseInt(updatedData?.total_time?.split(":")[0]) > 16) {
            message = "Total time exceeds 16 hours for this date.";
            status_code = 400;
        }

        return HttpResponse.json({
            edited_timelog: {
                timelog_id: parseInt(id),
                employee_name: updatedData.employee_name || "",
                project_name: updatedData.project_name || "",
                task_name: updatedData.task_name || "",
                entry_date: updatedData.entry_date || "",
                note: updatedData.time_note || "",
                time_from: updatedData.time_from || "",
                time_to: updatedData.time_to || "",
                total_time: updatedData.total_time || "",
            },
            message: message,
            status_code: status_code,
        });
    }),

    http.post("http://127.0.0.1:8000/timelog", async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            timelog: {
                timelog_id: 66,
                employee_name: body.employee_name,
                project_name: body.project_name,
                task_name: body.task_name,
                entry_date: body.entry_date,
                note: body.note,
                time_from: body.time_from,
                time_to: body.time_to,
                total_time: body.total_time,
            },
            message: "Project Time recorded successfully.",
            status_code: 201,
        });
    }),

    http.post("http://127.0.0.1:8000/timelog/filter", async ({ request }) => {
        const body = await request.json();

        const allTimelogs = {
            "Ann Smith": {
                dates: {
                    "2025-10-01": {
                        timelogs: [
                            {
                                timelog_id: 66,
                                employee_name: "Ann Smith",
                                project_name: "ACC - RI Digitization",
                                task_name: "SUPPORT - Support",
                                entry_date: "2025-10-01",
                                note: "Project Meeting",
                                time_from: "2025-10-01T00:00:00",
                                time_to: "2025-10-01T23:59:00",
                                total_time: "06:00:00",
                            },
                        ],
                        day_total_minutes: 360,
                        day_total_time: "6:00",
                    },
                },
                user_total_minutes: 360,
                user_total_time: "6:00",
            },
            "John Smith": {
                dates: {
                    "2025-10-23": {
                        timelogs: [
                            {
                                timelog_id: 86,
                                employee_name: "John Smith",
                                project_name: "ACC - RI Digitization",
                                task_name: "DEV - Development",
                                entry_date: "2025-10-23",
                                note: "Project Meeting",
                                time_from: "2025-10-23T23:00:00",
                                time_to: "2025-10-24T01:00:00",
                                total_time: "02:00:00",
                            },
                        ],
                        day_total_minutes: 120,
                        day_total_time: "2:00",
                    },
                },
                user_total_minutes: 210,
                user_total_time: "3:30",
            },
            "Tanvi Mehetre": {
                dates: {
                    "2025-10-25": {
                        timelogs: [
                            {
                                timelog_id: 62,
                                employee_name: "Tanvi Mehetre",
                                project_name: "GEM - GoEmed Hosting Support",
                                task_name: "DEV - Development",
                                entry_date: "2025-10-25",
                                note: "Project Meeting",
                                time_from: "2025-10-25T08:00:00",
                                time_to: "2025-10-25T10:00:00",
                                total_time: "02:00:00",
                            },
                        ],
                        day_total_minutes: 120,
                        day_total_time: "2:00",
                    },
                },
                user_total_minutes: 120,
                user_total_time: "2:00",
            },
        };

        const selectedProject = body?.project?.trim() || "";
        const selectedMember = body?.member?.trim() || "";

        let filteredTimelogs = {};

        Object.entries(allTimelogs).forEach(([memberName, memberData]) => {
            if (selectedMember && memberName !== selectedMember) return;

            const filteredDates = {};

            Object.entries(memberData.dates).forEach(([date, dateData]) => {
                const filteredLogs = dateData.timelogs.filter((t) => (!selectedProject || t.project_name === selectedProject) && (!selectedMember || t.employee_name === selectedMember));

                if (filteredLogs.length > 0) {
                    filteredDates[date] = {
                        ...dateData,
                        timelogs: filteredLogs,
                    };
                }
            });

            if (Object.keys(filteredDates).length > 0) {
                filteredTimelogs[memberName] = {
                    ...memberData,
                    dates: filteredDates,
                };
            }
        });

        return HttpResponse.json({
            filters: {
                project: selectedProject,
                member: selectedMember,
                date_from: body?.date_range ?? "2024-09-20",
                date_to: body?.range2 ?? "2025-10-30",
            },
            timelogs: filteredTimelogs,
            message: Object.keys(filteredTimelogs).length > 0 ? "All project time records retrieved successfully." : "No project time record available for the filters applied",
            status_code: Object.keys(filteredTimelogs).length === 0 ? 201 : 200,
        });
    }),

    http.get("http://127.0.0.1:8000/timelog", () => {
        return HttpResponse.json({
            timelogs: {
                "Ann Smith": {
                    dates: {
                        "2025-10-01": {
                            timelogs: [
                                {
                                    timelog_id: 66,
                                    employee_name: "Ann Smith",
                                    project_name: "ACC - RI Digitization",
                                    task_name: "SUPPORT - Support",
                                    entry_date: "2025-10-01",
                                    note: "Project Meeting",
                                    time_from: "2025-10-01T00:00:00",
                                    time_to: "2025-10-01T23:59:00",
                                    total_time: "06:00:00",
                                },
                            ],
                            day_total_minutes: 360,
                            day_total_time: "6:00",
                        },
                    },
                    user_total_minutes: 360,
                    user_total_time: "6:00",
                },
                "John Smith": {
                    dates: {
                        "2025-10-23": {
                            timelogs: [
                                {
                                    timelog_id: 86,
                                    employee_name: "John Smith",
                                    project_name: "ACC - RI Digitization",
                                    task_name: "DEV - Development",
                                    entry_date: "2025-10-23",
                                    note: "Project Meeting",
                                    time_from: "2025-10-23T23:00:00",
                                    time_to: "2025-10-24T01:00:00",
                                    total_time: "02:00:00",
                                },
                            ],
                            day_total_minutes: 120,
                            day_total_time: "2:00",
                        },
                    },
                    user_total_minutes: 210,
                    user_total_time: "3:30",
                },
                "Tanvi Mehetre": {
                    dates: {
                        "2025-10-25": {
                            timelogs: [
                                {
                                    timelog_id: 62,
                                    employee_name: "Tanvi Mehetre",
                                    project_name: "GEM - GoEmed Hosting Support",
                                    task_name: "DEV - Development",
                                    entry_date: "2025-10-25",
                                    note: "Project Meeting",
                                    time_from: "2025-10-25T08:00:00",
                                    time_to: "2025-10-25T10:00:00",
                                    total_time: "02:00:00",
                                },
                            ],
                            day_total_minutes: 120,
                            day_total_time: "2:00",
                        },
                    },
                    user_total_minutes: 120,
                    user_total_time: "2:00",
                },
            },
            message: "All project time records retrieved successfully.",
            status_code: 200,
        });
    }),
];
