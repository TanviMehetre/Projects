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

function DetailsPage() {
    const { id } = useParams();
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

    const timelog = data?.timelog;
    const members = dropdowns?.members ?? [];
    const projects = dropdowns?.projects ?? [];
    const tasks = dropdowns?.tasks ?? [];

    const [form, setForm] = useState({
        employee_name: "",
        project_name: "",
        task_name: "",
        entry_date: null,
        time_from: "",
        time_to: "",
        total_time: "",
        time_note: "",
    });

    useEffect(() => {
        if (timelog) {
            setForm({
                employee_name: timelog.employee_name || "",
                project_name: timelog.project_name || "",
                task_name: timelog.task_name || "",
                entry_date: timelog.entry_date ? dayjs(timelog.entry_date) : "",
                time_from: timelog.time_from || "",
                time_to: timelog.time_to || "",
                total_time: timelog.total_time || "",
                time_note: timelog.note || "",
            });
        }
    }, [timelog]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const dateFromForm = form.entry_date ? dayjs(form.entry_date) : null;
    const safeSlice = (value) => (typeof value === "string" && value.includes("T") && value.length >= 16 ? value.slice(11, 16) : "");

    const timeFrom = form.time_from?.includes("T") ? safeSlice(form.time_from) : form.time_from || "";
    const timeTo = form.time_to?.includes("T") ? safeSlice(form.time_to) : form.time_to || "";

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

    let message = "";

    const handleSave = async () => {
        setNotification("");
        try {
            const formattedDate = form.entry_date ? dayjs(form.entry_date).format("YYYY-MM-DD") : "";

            const body = {
                employee_name: form.employee_name || "",
                project_name: form.project_name || "",
                task_name: form.task_name || "",
                entry_date: formattedDate || "",
                time_note: form.time_note || "",
                total_time: form.total_time || "",
                time_from: timeFromTimestamp || (timeFrom ? `${formattedDate}T${timeFrom}` : ""),
                time_to: timeToTimestamp || (timeTo ? `${formattedDate}T${timeTo}` : ""),
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
                setForm((prev) => ({
                    ...prev,
                    employee_name: prev.employee_name || entry.edited_timelog.employee_name || "",
                    project_name: prev.project_name || entry.edited_timelog.project_name || "",
                    task_name: prev.task_name || entry.edited_timelog.task_name || "",
                    entry_date: prev.entry_date || (entry.edited_timelog.entry_date ? dayjs(entry.edited_timelog.entry_date) : null),
                    time_from: prev.time_from || entry.edited_timelog.time_from || "",
                    time_to: prev.time_to || entry.edited_timelog.time_to || "",
                    total_time: prev.total_time || entry.edited_timelog.total_time || "",
                    time_note: prev.time_note || entry.edited_timelog.time_note || "",
                }));
            }
        } catch (error) {
            let errorTimelog = null;
            let message = "";
            if (error.response && error.response.data) {
                const { timelog, message: msg } = error.response.data;
                errorTimelog = timelog;
                message = msg;
            } else if (error.timelog) {
                errorTimelog = error.timelog;
                message = error.message;
            }
            if (errorTimelog) {
                setForm((prev) => ({
                    ...prev,
                    employee_name: prev.employee_name || errorTimelog.employee_name || "",
                    project_name: prev.project_name || errorTimelog.project_name || "",
                    task_name: prev.task_name || errorTimelog.task_name || "",
                    entry_date: prev.entry_date || (errorTimelog.entry_date ? dayjs(errorTimelog.entry_date) : null),
                    time_from: prev.time_from || errorTimelog.time_from || "",
                    time_to: prev.time_to || errorTimelog.time_to || "",
                    total_time: prev.total_time || errorTimelog.total_time || "",
                    time_note: prev.time_note || errorTimelog.time_note || "",
                }));
            }
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
            <Stack direction="column" spacing={1} sx={{ mb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                    <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right" }}>Timelog ID:</Typography>
                    <TextField
                        size="small"
                        disabled
                        value={id || "#"}
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
                    <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right" }}>Employee:</Typography>
                    <Autocomplete
                        disablePortal
                        disabled={isViewMode}
                        options={members}
                        value={form.employee_name}
                        onChange={(e, newValue) => handleChange("employee_name", newValue)}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                height: 40,
                            },
                            flexGrow: 1,
                            backgroundColor: isViewMode ? "#f1f1f1" : "white",
                            borderRadius: 1,
                        }}
                        renderInput={(params) => <TextField {...params} variant="outlined" size="small" />}
                    />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                    <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right" }}>Project:</Typography>
                    <Autocomplete
                        disablePortal
                        disabled={isViewMode}
                        options={projects}
                        value={form.project_name}
                        onChange={(e, newValue) => handleChange("project_name", newValue)}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                height: 40,
                            },
                            flexGrow: 1,
                            backgroundColor: isViewMode ? "#f1f1f1" : "white",
                            borderRadius: 1,
                        }}
                        renderInput={(params) => <TextField {...params} variant="outlined" size="small" />}
                    />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                    <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right" }}>Task:</Typography>
                    <Autocomplete
                        disablePortal
                        disabled={isViewMode}
                        options={tasks}
                        value={form.task_name}
                        onChange={(e, newValue) => handleChange("task_name", newValue)}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                height: 40,
                            },
                            flexGrow: 1,
                            backgroundColor: isViewMode ? "#f1f1f1" : "white",
                            borderRadius: 1,
                        }}
                        renderInput={(params) => <TextField {...params} variant="outlined" size="small" />}
                    />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                    <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right" }}>Date:</Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            disabled={isViewMode}
                            value={form.entry_date}
                            onChange={(newValue) => handleChange("entry_date", newValue)}
                            slotProps={{
                                textField: {
                                    variant: "outlined",
                                    size: "small",
                                    sx: {
                                        "& .MuiOutlinedInput-root": {
                                            height: 40,
                                        },
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
                    <Typography sx={{ minWidth: 130, mr: 10, textAlign: "right", alignSelf: "flex-start", pt: 1 }}>Time Note:</Typography>
                    <TextareaAutosize
                        minRows={3}
                        disabled={isViewMode}
                        placeholder="Time Note"
                        value={form.time_note}
                        onChange={(e) => handleChange("time_note", e.target.value)}
                        style={{
                            flexGrow: 1,
                            width: "100%",
                            border: "1px solid #c4c4c4",
                            fontFamily: "Roboto, sans-serif",
                            fontSize: 16,
                            fontWeight: 400,
                            padding: "10px 12px",
                            backgroundColor: isViewMode ? "#f1f1f1" : "white",
                            borderRadius: 4,
                            color: isViewMode ? "#a7a7a7" : "",
                        }}
                    />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                    <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right" }}>Time Duration:</Typography>
                    <TextField
                        variant="outlined"
                        disabled={isViewMode}
                        placeholder="Time From"
                        size="small"
                        value={form.time_from ? (form.time_from.length >= 16 ? form.time_from.slice(11, 16) : form.time_from) : ""}
                        onChange={(e) => handleChange("time_from", e.target.value)}
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

                    <TextField
                        variant="outlined"
                        size="small"
                        disabled={isViewMode}
                        placeholder="Time To"
                        value={form.time_to ? (form.time_to.length >= 16 ? form.time_to.slice(11, 16) : form.time_to) : ""}
                        onChange={(e) => handleChange("time_to", e.target.value)}
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
                    <FormControlLabel label="Next Day" control={<Checkbox disabled={isViewMode} checked={nextDay} onChange={(e) => setNextDay(e.target.checked)} />} />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ display: "flex" }}>
                    <Typography sx={{ minWidth: 130, color: "black", mr: 10, textAlign: "right" }}>Total Time:</Typography>
                    <TextField
                        variant="outlined"
                        disabled={isViewMode}
                        size="small"
                        placeholder="0:00"
                        value={form.total_time.slice(0, 5)}
                        onChange={(e) => handleChange("total_time", e.target.value)}
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
                    <Typography sx={{ minWidth: 130, color: "primary.dark", mr: 10, textAlign: "left" }}>HH:MM</Typography>
                </Stack>
            </Stack>
            <Typography
                variant="body2"
                color={(data?.message || "").includes("changes") ? "primary.main" : notification ? "success.main" : localStatus === 201 ? "success.main" : localStatus >= 400 ? "error.main" : data?.status_code === 201 ? "success.main" : data?.status_code >= 400 ? "error.main" : "black"}
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
                {notification || ((localStatus === 201 || localStatus === 400 || localStatus === 500 || data?.status_code === 201 || data?.status_code === 400 || data?.status_code === 500) && (localMessage || data?.message || data?.error))}
            </Typography>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ display: "flex" }}>
                {(isCreateMode || isEditMode) && <ButtonComp text="Save" icon={DescriptionIcon} iconColor="yellow" variant="contained" color="primary" sx={{ textTransform: "none" }} onClick={handleSave} />}
                {isViewMode && <ButtonComp text="Switch to Update" icon={EditSquareIcon} iconColor="red" variant="outlined" color="info" sx={{ textTransform: "none" }} onClick={() => navigate(`/edit/${id}`)} />}
                {isEditMode && <ButtonComp text="Delete" icon={DeleteOutlineRoundedIcon} variant="contained" iconColor="yellow" color="error" sx={{ textTransform: "none" }} onClick={handleOpen} />}
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
                            Confirm Delete
                        </Typography>
                        <Typography id="delete-modal-description" sx={{ mb: 4 }}>
                            Are you sure you want to delete this timelog?
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <ButtonComp text="Delete" variant="contained" icon={DeleteOutlineRoundedIcon} iconColor="yellow" color="error" onClick={handleDelete} sx={{ minWidth: 100, textTransform: "none" }} />
                            <ButtonComp text="Cancel" variant="outlined" onClick={handleClose} sx={{ minWidth: 100, textTransform: "none" }} />
                        </Stack>
                    </Box>
                </Modal>
                {isEditMode && <ButtonComp text="Switch to View" icon={VisibilityRoundedIcon} iconColor="blue" variant="outlined" color="info" sx={{ textTransform: "none" }} onClick={() => navigate(`/view/${id}`)} />}
                <ButtonComp
                    text="Goto: Project Time List"
                    variant="outlined"
                    color="info"
                    sx={{ textTransform: "none" }}
                    onClick={() => {
                        navigate("/");
                    }}
                />
            </Stack>
            {!isViewMode && (
                <Typography
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
                    Warning: Make sure to check the Next Day checkbox if working overnight.
                </Typography>
            )}
        </Container>
    );
}

export default DetailsPage;
