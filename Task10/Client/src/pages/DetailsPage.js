import React from "react";
import { Box, Container, Stack, TextField, Button, Typography, MenuItem, Autocomplete, TextareaAutosize, Modal, Checkbox, FormControlLabel } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import ButtonComp from "../components/Buttons";
import DescriptionIcon from "@mui/icons-material/Description";
import EditSquareIcon from "@mui/icons-material/EditSquare";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useThunk } from "../hooks/use-thunk";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { fetchDropdowns, getOneTimelog, createTimelog, updateTimelog, deleteTimelog } from "../store/store";
import { Formik, Form } from "formik";
import * as yup from "yup";
import { useIntl } from "react-intl";

function DetailsPage() {
    const { id } = useParams();
    const intl = useIntl();
    const currentLocation = useLocation();
    const currentPath = currentLocation.pathname;
    const isViewMode = currentPath.includes("view");
    const isCreateMode = currentPath.includes("create");
    const isEditMode = currentPath.includes("edit");

    const [notification, setNotification] = useState("");

    useEffect(() => {
        if (currentLocation.state?.message) {
            setNotification(currentLocation.state.message);
        }
    }, [currentLocation.state]);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [deFetchOneTimelog, isLoadingOneTimelog, loadingOneTimelogError] = useThunk(getOneTimelog);
    const [deFetchDropdowns, isLoadingDropdowns, loadingDropdownsError] = useThunk(fetchDropdowns);
    const [doCreateTimelog, isCreatingTimelog, creatingTimelogError] = useThunk(createTimelog);
    const [doUpdateTimelog, isUpdatingTimelog, updatingTimelogError] = useThunk(updateTimelog);
    const [doDeleteTimelog, isDeleteTimelog, deletingTimelogError] = useThunk(deleteTimelog);

    const { isLoading, data, dropdowns, error } = useSelector((state) => state.projectTime);

    const [nextDay, setNextDay] = useState(false);

    const [localMessage, setLocalMessage] = useState(location.state?.message || null);
    const [localStatus, setLocalStatus] = useState(location.state?.status_code || null);

    useEffect(() => {
        deFetchDropdowns();
        if (id) {
            deFetchOneTimelog(id);
        }
    }, [dispatch, id, isViewMode]);


    const dataBody = data?.body || data

    const timelog = dataBody?.timelog;
    const members = dropdowns?.members ?? [];
    const projects = dropdowns?.projects ?? [];
    const tasks = dropdowns?.tasks ?? [];

    const [form, setForm] = useState({
        time_from: "",
        time_to: "",
        total_time: "",
    });

    useEffect(() => {
        if (timelog) {
            setForm({
                time_from: timelog.time_from || "",
                time_to: timelog.time_to || "",
                total_time: timelog.total_time || "",
            });
        }
    }, [timelog]);

    const handleSubmit = async (values, { setSubmitting, setValues }) => {
        setNotification("");
        const dateFromForm = values.entry_date ? dayjs(values.entry_date) : null;
        const safeSlice = (value) => (typeof value === "string" && value.includes("T") && value.length >= 16 ? value.slice(11, 16) : "");

        const timeFrom = values.time_from?.includes("T") ? safeSlice(values.time_from) : values.time_from || "";
        const timeTo = values.time_to?.includes("T") ? safeSlice(values.time_to) : values.time_to || "";

        let timeFromTimestamp = "";
        let timeToTimestamp = "";

        if (dateFromForm && timeFrom) {
            const baseDate = dateFromForm.format("YYYY-MM-DD");
            timeFromTimestamp = `${baseDate}T${timeFrom}`;
        }
        if (dateFromForm && timeTo) {
            const baseDate = dateFromForm.format("YYYY-MM-DD");
            if (nextDay) {
                const nextDayDate = dateFromForm.add(1, "day").format("YYYY-MM-DD");
                timeToTimestamp = `${nextDayDate}T${timeTo}`;
            } else {
                timeToTimestamp = `${baseDate}T${timeTo}`;
            }
        }
        try {
            const formattedDate = values.entry_date ? dayjs(values.entry_date).format("YYYY-MM-DD") : "";

            const body = {
                employee_name: values.employee_name || "",
                project_name: values.project_name || "",
                task_name: values.task_name || "",
                entry_date: formattedDate || null,
                time_note: values.time_note || "",
                total_time: values.total_time || "",
                time_from: timeFromTimestamp || "",
                time_to: timeToTimestamp || "",
            };

            let entry;
            if (isEditMode) {
                entry = await doUpdateTimelog({ id, updatedData: body });
                navigate(`/edit/${id}`);
            } else {
                entry = await doCreateTimelog(body);
                navigate(`/edit/${entry.timelog.timelog_id}`, {
                    state: {
                        message: entry?.message || "Timelog created successfully!",
                        status_code: entry?.status_code || 201,
                    },
                });
            }

            if (entry.edited_timelog) {
                setValues({
                    timelog_id: entry.edited_timelog.timelog_id,
                    employee_name: entry.edited_timelog.employee_name || "",
                    project_name: entry.edited_timelog.project_name || "",
                    task_name: entry.edited_timelog.task_name || "",
                    entry_date: entry.edited_timelog.entry_date ? dayjs(entry.edited_timelog.entry_date) : null,
                    time_from: entry.edited_timelog.time_from.slice(11, 16) || "",
                    time_to: entry.edited_timelog.time_to.slice(11, 16) || "",
                    total_time: entry.edited_timelog.total_time.slice(0, 5) || "",
                    time_note: entry.edited_timelog.note || "",
                });
            }
            setSubmitting(false);
        } catch (error) {
            let errorTimelog = null;
            let message = "";
            if (error.response && error.response.data.body) {
                const { timelog, message: msg } = error.response.data.body;
                errorTimelog = timelog;
                message = msg;
            } else if (error.timelog) {
                errorTimelog = error.timelog;
                message = error.message;
            }
            if (errorTimelog) {
                setValues({
                    timelog_id: errorTimelog.timelog_id,
                    employee_name: errorTimelog.employee_name || "",
                    project_name: errorTimelog.project_name || "",
                    task_name: errorTimelog.task_name || "",
                    entry_date: errorTimelog.entry_date ? dayjs(errorTimelog.entry_date) : null,
                    time_from: errorTimelog.time_from.length != 16 ? errorTimelog.time_from : errorTimelog.time_from.length == 16 ? errorTimelog.time_from.slice(11, 16) : "",
                    time_to: errorTimelog.time_to.length != 16 ? errorTimelog.time_to : errorTimelog.time_to.length == 16 ? errorTimelog.time_to.slice(11, 16) : "",
                    total_time: errorTimelog.total_time.slice(0, 5) || "",
                    time_note: errorTimelog.time_note || "",
                });
            }
            setSubmitting(false);
        }
    };

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleDelete = async () => {
        setNotification("");
        const response = await doDeleteTimelog(id);
        navigate("/", { state: { message: response.message, status_code: response.status_code } });
    };

    useEffect(() => {
        if (form?.time_from && form?.time_to) {
            const from = form.time_from.slice(11, 16);
            const to = form.time_to.slice(11, 16);
            if (!nextDay) {
                setNextDay(from > to);
            }
        }
    }, [form.time_from, form.time_to]);

    useEffect(() => {
        if (localMessage) {
            const timer = setTimeout(() => {
                setLocalMessage(null);
                setLocalStatus(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [localMessage]);

    const validationSchema = yup.object({
        employee_name: yup.string().required(intl.formatMessage({ id: "form.validation.employee" })),
        project_name: yup.string().required(intl.formatMessage({ id: "form.validation.project" })),
        task_name: yup.string().required(intl.formatMessage({ id: "form.validation.task" })),
        entry_date: yup
            .date()
            .nullable()
            .required(intl.formatMessage({ id: "form.validation.date" })),
        time_note: yup.string().required(intl.formatMessage({ id: "form.validation.timeNote" })),
        time_from: yup.string().matches(/^([01]\d|2[0-3]):([0-5]\d)$/, intl.formatMessage({ id: "form.validation.timeFrom" })),
        time_to: yup.string().matches(/^([01]\d|2[0-3]):([0-5]\d)$/, intl.formatMessage({ id: "form.validation.timeTo" })),
        total_time: yup.string().matches(/^([01]\d|2[0-3]):([0-5]\d)$/, intl.formatMessage({ id: "form.validation.totalTime" })),
    });

    return (
        <Container
            maxWidth="md"
            sx={{
                backgroundColor: "#fff",
                border: "1px solid #90caf9",
                borderRadius: 2,
                mt: 1,
                p: 3,
            }}
        >
            <Formik
                enableReinitialize={dataBody?.status_code == 500 ? false : true}
                initialValues={{
                    timelog_id: id ?? "#",
                    employee_name: timelog?.employee_name ?? "",
                    project_name: timelog?.project_name ?? "",
                    task_name: timelog?.task_name ?? "",
                    entry_date: timelog?.entry_date ? dayjs(timelog.entry_date) : null,
                    time_note: (timelog?.note || timelog?.time_note) ?? "",
                    time_from: timelog?.time_from ? (timelog.time_from.length >= 16 ? timelog.time_from.slice(11, 16) : timelog.time_from) : "",
                    time_to: timelog?.time_to ? (timelog.time_to.length >= 16 ? timelog.time_to.slice(11, 16) : timelog.time_to) : "",
                    total_time: timelog?.total_time?.slice(0, 5) ?? "",
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, setFieldValue, setFieldTouched, handleBlur }) => (
                    <Form>
                        <Stack direction="column" spacing={1} sx={{ mb: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                                <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right" }}>{intl.formatMessage({ id: "form.timelogID" })}:</Typography>
                                <TextField
                                    size="small"
                                    disabled
                                    value={values.timelog_id ?? "#"}
                                    sx={{
                                        flexGrow: 1,
                                        backgroundColor: "#f1f1f1",
                                        borderRadius: 1,
                                        "& .MuiOutlinedInput-root": {
                                            height: 40,
                                        },
                                    }}
                                />
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                                <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right", alignSelf: "start", pt: 1 }}>{intl.formatMessage({ id: "form.employee" })}:</Typography>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Autocomplete
                                        name="employee_name"
                                        disablePortal
                                        disabled={isViewMode}
                                        options={members}
                                        value={values.employee_name ?? ""}
                                        onChange={(event, newValue) => {
                                            setFieldValue("employee_name", newValue);
                                        }}
                                        onBlur={() => setFieldTouched("employee_name", true)}
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                height: 40,
                                            },
                                            flexGrow: 1,
                                            backgroundColor: isViewMode ? "#f1f1f1" : "white",
                                            borderRadius: 1,
                                        }}
                                        renderInput={(params) => <TextField {...params} variant="outlined" size="small" error={touched.employee_name && Boolean(errors.employee_name)} helperText={touched.employee_name && errors.employee_name ? errors.employee_name : ""} />}
                                    />
                                </Box>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                                <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right", alignSelf: "start", pt: 1 }}>{intl.formatMessage({ id: "form.project" })}:</Typography>
                                <Autocomplete
                                    name="project_name"
                                    disablePortal
                                    disabled={isViewMode}
                                    options={projects}
                                    value={values.project_name ?? ""}
                                    onChange={(event, newValue) => {
                                        setFieldValue("project_name", newValue);
                                    }}
                                    onBlur={() => setFieldTouched("project_name", true)}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            height: 40,
                                        },
                                        flexGrow: 1,
                                        backgroundColor: isViewMode ? "#f1f1f1" : "white",
                                        borderRadius: 1,
                                    }}
                                    renderInput={(params) => <TextField {...params} variant="outlined" size="small" error={touched.project_name && Boolean(errors.project_name)} helperText={touched.project_name && errors.project_name} />}
                                />
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                                <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right", alignSelf: "start", pt: 1 }}>{intl.formatMessage({ id: "form.task" })}:</Typography>
                                <Autocomplete
                                    name="task_name"
                                    disablePortal
                                    disabled={isViewMode}
                                    options={tasks}
                                    value={values.task_name ?? ""}
                                    onChange={(event, newValue) => {
                                        setFieldValue("task_name", newValue);
                                    }}
                                    onBlur={() => setFieldTouched("task_name", true)}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            height: 40,
                                        },
                                        flexGrow: 1,
                                        backgroundColor: isViewMode ? "#f1f1f1" : "white",
                                        borderRadius: 1,
                                    }}
                                    renderInput={(params) => <TextField {...params} variant="outlined" size="small" error={touched.task_name && Boolean(errors.task_name)} helperText={touched.task_name && errors.task_name} />}
                                />
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Typography sx={{ minWidth: 130, mr: 10, textAlign: "right", alignSelf: "start", pt: 1 }}>{intl.formatMessage({ id: "form.date" })}:</Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        data-testid="entry-date"
                                        name="entry_date"
                                        disabled={isViewMode}
                                        value={values.entry_date ?? null}
                                        onChange={(date) => {
                                            setFieldValue("entry_date", date);
                                            setTimeout(() => {
                                                setFieldTouched("entry_date", true, true);
                                            }, 0);
                                        }}
                                        onClose={() => {
                                            setTimeout(() => {
                                                setFieldTouched("entry_date", true, true);
                                            }, 0);
                                        }}
                                        slotProps={{
                                            textField: {
                                                "data-testid": "entry-date",
                                                variant: "outlined",
                                                size: "small",
                                                error: touched.entry_date && Boolean(errors.entry_date),
                                                helperText: touched.entry_date && errors.entry_date,
                                                onBlur: () => setFieldTouched("entry_date", true, true),
                                                sx: {
                                                    "& .MuiOutlinedInput-root": { height: 40 },
                                                    maxWidth: 250,
                                                    flexGrow: 1,
                                                    color: "black",
                                                    backgroundColor: isViewMode ? "#f1f1f1" : "white",
                                                    borderRadius: 1,
                                                },
                                            },
                                        }}
                                    />
                                </LocalizationProvider>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                                <Typography sx={{ minWidth: 130, mr: 10, textAlign: "right", alignSelf: "start", pt: 1 }}>{intl.formatMessage({ id: "form.timeNote" })}:</Typography>
                                <Box sx={{ flexGrow: 1, pr: 3 }}>
                                    <TextareaAutosize
                                        name="time_note"
                                        minRows={3}
                                        disabled={isViewMode}
                                        placeholder={intl.formatMessage({ id: "form.timeNote" })}
                                        value={values.time_note ?? ""}
                                        onChange={(e) => setFieldValue("time_note", e.target.value)}
                                        onBlur={() => setFieldTouched("time_note", true)}
                                        style={{
                                            flexGrow: 1,
                                            width: "100%",
                                            border: touched.time_note && errors.time_note ? "1px solid #d32f2f" : "1px solid #c4c4c4",
                                            fontFamily: "Roboto, sans-serif",
                                            fontSize: 16,
                                            fontWeight: 400,
                                            padding: "10px 12px",
                                            backgroundColor: isViewMode ? "#f1f1f1" : "white",
                                            borderRadius: 4,
                                            color: isViewMode ? "#a7a7a7" : "",
                                        }}
                                    />
                                    {touched.time_note && errors.time_note && (
                                        <Typography variant="caption" color="error">
                                            {errors.time_note}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex", mb: errors.time_from || errors.time_to ? "5px" : "0px" }}>
                                <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right", alignSelf: "start", pt: 1 }}>{intl.formatMessage({ id: "form.timeDuration" })}:</Typography>
                                <TextField
                                    name="time_from"
                                    variant="outlined"
                                    disabled={isViewMode}
                                    placeholder={intl.formatMessage({ id: "list.timeFrom" })}
                                    size="small"
                                    value={values.time_from ?? ""}
                                    onChange={(event) => setFieldValue("time_from", event.target.value)}
                                    onBlur={() => setFieldTouched("time_from", true)}
                                    error={touched.time_from && Boolean(errors.time_from)}
                                    helperText={touched.time_from && errors.time_from}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            height: 40,
                                        },
                                        maxWidth: 250,
                                        color: "black",
                                        flexGrow: 1,
                                        backgroundColor: isViewMode ? "#f1f1f1" : "white",
                                        borderRadius: 1,
                                        alignSelf: "start",
                                    }}
                                />

                                <TextField
                                    name="time_to"
                                    variant="outlined"
                                    size="small"
                                    disabled={isViewMode}
                                    placeholder={intl.formatMessage({ id: "list.timeTo" })}
                                    value={values.time_to ?? ""}
                                    onChange={(event) => setFieldValue("time_to", event.target.value)}
                                    onBlur={() => setFieldTouched("time_to", true)}
                                    error={touched.time_to && Boolean(errors.time_to)}
                                    helperText={touched.time_to && errors.time_to}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            height: 40,
                                        },
                                        maxWidth: 250,
                                        color: "black",
                                        flexGrow: 1,
                                        backgroundColor: isViewMode ? "#f1f1f1" : "white",
                                        borderRadius: 1,
                                        alignSelf: "start",
                                    }}
                                />
                                <FormControlLabel sx={{ alignSelf: "start" }} label={intl.formatMessage({ id: "form.nextDay" })} control={<Checkbox disabled={isViewMode} checked={nextDay} onChange={(e) => setNextDay(e.target.checked)} />} />
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                                <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right", alignSelf: "start", pt: 1 }}>{intl.formatMessage({ id: "form.totalTime" })}:</Typography>
                                <TextField
                                    name="total_time"
                                    variant="outlined"
                                    disabled={isViewMode}
                                    size="small"
                                    placeholder="0:00"
                                    value={values?.total_time ?? ""}
                                    onChange={(event) => setFieldValue("total_time", event.target.value)}
                                    onBlur={() => setFieldTouched("total_time", true)}
                                    error={touched.total_time && Boolean(errors.total_time)}
                                    helperText={touched.total_time && errors.total_time}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            height: 40,
                                        },
                                        maxWidth: 250,
                                        color: "black",
                                        flexGrow: 1,
                                        backgroundColor: isViewMode ? "#f1f1f1" : "white",
                                        borderRadius: 1,
                                    }}
                                />
                                <Typography sx={{ minWidth: 130, color: "primary.dark", mr: 10, textAlign: "left", alignSelf: "start", pt: 1 }}>HH:MM</Typography>
                            </Stack>
                        </Stack>
                        <Typography
                            variant="body2"
                            data-testid="message-render"
                            color={(dataBody?.message || "").includes("changes") ? "primary.main" : notification ? "success.main" : localStatus === 201 ? "success.main" : localStatus >= 400 ? "error.main" : dataBody?.status_code === 201 ? "success.main" : dataBody?.status_code >= 400 ? "error.main" : "black"}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                height: 32,
                                mx: "auto",
                                padding: "10px 16px",
                            }}
                        >
                            {notification || ((localStatus === 201 || localStatus === 400 || localStatus === 500 || dataBody?.status_code === 201 || dataBody?.status_code === 400 || dataBody?.status_code === 500) && (localMessage || dataBody?.message || dataBody?.error))}
                        </Typography>
                        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ display: "flex" }}>
                            {(isCreateMode || isEditMode) && <ButtonComp type="submit" text={intl.formatMessage({ id: "form.save" })} icon={DescriptionIcon} iconColor="yellow" variant="contained" color="primary" sx={{ textTransform: "none" }} />}
                            {isViewMode && <ButtonComp text={intl.formatMessage({ id: "form.switchToUpdate" })} icon={EditSquareIcon} iconColor="red" variant="outlined" color="info" sx={{ textTransform: "none" }} onClick={() => navigate(`/edit/${id}`)} />}
                            {isEditMode && <ButtonComp text={intl.formatMessage({ id: "form.delete" })} icon={DeleteOutlineRoundedIcon} variant="contained" iconColor="yellow" color="error" sx={{ textTransform: "none" }} onClick={handleOpen} />}
                            <Modal open={open} onClose={handleClose} aria-labelledby="delete-modal-title" aria-describedby="delete-modal-description">
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: "10%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        width: 400,
                                        bgcolor: "background.paper",
                                        borderRadius: 2,
                                        boxShadow: 24,
                                        p: 4,
                                        textAlign: "center",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                    }}
                                >
                                    <Typography id="delete-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
                                        {intl.formatMessage({ id: "form.delete.title" })}
                                    </Typography>
                                    <Typography id="delete-modal-description" sx={{ mb: 4 }}>
                                        {intl.formatMessage({ id: "form.delete.message" })}
                                    </Typography>
                                    <Stack direction="row" spacing={2}>
                                        <ButtonComp text={intl.formatMessage({ id: "form.delete.confirm" })} variant="contained" icon={DeleteOutlineRoundedIcon} iconColor="yellow" color="error" onClick={handleDelete} sx={{ minWidth: 100, textTransform: "none" }} />
                                        <ButtonComp text={intl.formatMessage({ id: "form.delete.cancel" })} variant="outlined" onClick={handleClose} sx={{ minWidth: 100, textTransform: "none" }} />
                                    </Stack>
                                </Box>
                            </Modal>
                            {isEditMode && <ButtonComp text={intl.formatMessage({ id: "form.switchToView" })} icon={VisibilityRoundedIcon} iconColor="blue" variant="outlined" color="info" sx={{ textTransform: "none" }} onClick={() => navigate(`/view/${id}`)} />}
                            <ButtonComp
                                text={intl.formatMessage({ id: "form.goToProjectTime" })}
                                variant="outlined"
                                color="info"
                                sx={{ textTransform: "none" }}
                                onClick={() => {
                                    navigate("/");
                                }}
                            />
                        </Stack>
                        {!nextDay && !isViewMode && (
                            <Typography
                                data-testid="warning-render"
                                variant="body2"
                                color="secondary.main"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    height: 32,
                                    mx: "auto",
                                    padding: "10px 16px",
                                }}
                            >
                                {intl.formatMessage({ id: "form.nextDayWarning" })}
                            </Typography>
                        )}
                    </Form>
                )}
            </Formik>
        </Container>
    );
}

export default DetailsPage;
