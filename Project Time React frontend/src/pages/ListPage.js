import { Box, Stack, Autocomplete, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, IconButton, Select, Menu, MenuItem, Popover } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { fetchDropdowns, getTimelogs, filterTimelog, setFilters, resetFilters } from "../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { useThunk } from "../hooks/use-thunk";
import { useEffect, useState } from "react";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import React from "react";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import EditSquareIcon from "@mui/icons-material/EditSquare";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

function ListPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [notification, setNotification] = useState("");

    useEffect(() => {
        if (location.state?.message) {
            setNotification(location.state.message);

            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification("");
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [notification]);

    const [doFetchTimelogs, isLoadingTimelogs, loadingTimelogsError] = useThunk(getTimelogs);
    const [doFetchDropdowns, isLoadingDropdowns, loadingDropdownsError] = useThunk(fetchDropdowns);
    const [doFilterTimelogs, isLoadingFilter, loadingFilterError] = useThunk(filterTimelog);

    const { isLoading, data, dropdowns, error } = useSelector((state) => state.projectTime);

    const filtersFromStore = useSelector((state) => state.projectTime.filters);
    let response = data?.error;

    const [anchorEl, setAnchorEl] = useState(null);
    const [anchorComment, setAnchorComment] = useState(null);
    const [selectedLogId, setSelectedLogId] = useState(null);
    const [selectedCommentId, setSelectedCommentId] = useState(null);

    const [selectedProject, setSelectedProject] = useState(filtersFromStore.project || "All Projects");
    const [selectedMember, setSelectedMember] = useState(filtersFromStore.member || "All Members");
    const [startDate, setStartDate] = useState(dayjs(filtersFromStore.date_range || "2024-11-15"));
    const [endDate, setEndDate] = useState(dayjs(filtersFromStore.range2 || "2025-11-14"));

    const handleClick = (event, logId) => {
        setAnchorEl(event.currentTarget);
        setSelectedLogId(logId);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setSelectedLogId(null);
    };

    const handleClickComment = (event, logId) => {
        setAnchorComment(event.currentTarget);
        setSelectedCommentId(logId);
    };

    const handleCloseComment = () => {
        setAnchorComment(null);
        setSelectedCommentId(null);
    };

    const open = Boolean(anchorComment);
    const id = open ? "simple-popover" : undefined;

    useEffect(() => {
        doFetchDropdowns();
        const timelogs = filtersFromStore?.action == "reset" ? doFetchTimelogs() : doFilterTimelogs(filtersFromStore);
    }, [dispatch]);

    const handleFilter = async () => {
        const filterData = {
            action: "filter",
            project: selectedProject === "All Projects" || selectedProject === null ? "" : selectedProject,
            member: selectedMember === "All Members" ? "" : selectedMember,
            date_range: startDate.format("YYYY-MM-DD"),
            range2: endDate.format("YYYY-MM-DD"),
        };
        dispatch(setFilters(filterData));
        await doFilterTimelogs(filterData);
    };

    const timelogs = data?.timelogs;
    const members = dropdowns?.members ?? [];
    const projects = dropdowns?.projects ?? [];

    const memberOptions = ["All Members", ...members];
    const projectOptions = ["All Projects", ...projects];

    return (
        <>
            <Box
                sx={{
                    backgroundColor: "#43939c",
                    py: 1,
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Stack direction="row" spacing={3} sx={{ mb: 1, maxWidth: 1300 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ minWidth: 80, color: "white", mr: 10 }}>Projects:</Typography>
                        <Autocomplete
                            disablePortal
                            options={projectOptions}
                            value={selectedProject}
                            onChange={(e, value) => setSelectedProject(value)}
                            sx={{
                                width: 505,
                                "& .MuiOutlinedInput-root": {
                                    height: 40,
                                    padding: "0 12px",
                                },
                                backgroundColor: "white",
                                borderRadius: 2,
                                "& fieldset": { border: "none" },
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    variant="outlined"
                                    size="small"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleFilter();
                                        }
                                    }}
                                />
                            )}
                        />
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography sx={{ minWidth: 80, color: "white" }}>Members:</Typography>
                        <Autocomplete
                            disablePortal
                            options={memberOptions}
                            onChange={(e, value) => setSelectedMember(value)}
                            value={selectedMember}
                            sx={{
                                width: 330,
                                "& .MuiOutlinedInput-root": {
                                    height: 40,
                                    padding: "0 12px",
                                },
                                backgroundColor: "white",
                                borderRadius: 2,
                                "& fieldset": { border: "none" },
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    variant="outlined"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleFilter();
                                        }
                                    }}
                                />
                            )}
                        />
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={3} sx={{ width: 1100 }}>
                    <Stack direction="row" alignItems="center" spacing={3}>
                        <Typography sx={{ minWidth: 80, color: "white" }}>Date Range:</Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                defaultValue={dayjs("2024-11-15")}
                                onChange={(newValue) => setStartDate(newValue)}
                                slotProps={{
                                    textField: {
                                        variant: "outlined",
                                        size: "small",
                                        sx: {
                                            "& .MuiOutlinedInput-root": {
                                                height: 40,
                                            },
                                            maxWidth: 240,
                                            flexGrow: 1,
                                            color: "black",
                                            backgroundColor: "white",
                                            borderRadius: 2,
                                            "& fieldset": { border: "none" },
                                        },
                                        onKeyDown: (e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleFilter();
                                            }
                                        },
                                    },
                                }}
                            />
                        </LocalizationProvider>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                defaultValue={dayjs("2025-11-14")}
                                onChange={(newValue) => setEndDate(newValue)}
                                slotProps={{
                                    textField: {
                                        onKeyDown: (e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleFilter();
                                            }
                                        },
                                        variant: "outlined",
                                        size: "small",
                                        sx: {
                                            "& .MuiOutlinedInput-root": {
                                                height: 40,
                                            },
                                            maxWidth: 240,
                                            flexGrow: 1,
                                            color: "black",
                                            backgroundColor: "white",
                                            borderRadius: 2,
                                            "& fieldset": { border: "none" },
                                        },
                                    },
                                }}
                            />
                        </LocalizationProvider>
                    </Stack>
                </Stack>
            </Box>
            <TableContainer>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: "#212529" }}>
                        <TableRow>
                            <TableCell align="center" sx={{ p: 0 }}>
                                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>
                                    Action
                                    <AddCircleIcon sx={{ color: "yellow", ml: 1, cursor: "pointer" }} onClick={() => navigate("/create")} />
                                </Box>
                            </TableCell>
                            <TableCell sx={{ color: "white", borderBottom: "none" }}>Name</TableCell>
                            <TableCell sx={{ color: "white", borderBottom: "none" }}>Date</TableCell>
                            <TableCell sx={{ color: "white", borderBottom: "none" }}>Project</TableCell>
                            <TableCell sx={{ color: "white", borderBottom: "none" }}>Task</TableCell>
                            <TableCell sx={{ color: "white", borderBottom: "none" }}>Time From</TableCell>
                            <TableCell sx={{ color: "white", borderBottom: "none" }}>Time To</TableCell>
                            <TableCell sx={{ color: "white", borderBottom: "none" }}>Total Time</TableCell>
                            <TableCell sx={{ color: "white", borderBottom: "none" }}>Notes</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{ "& .MuiTableCell-root": { padding: "2px 16px" } }}>
                        {timelogs &&
                            Object.entries(timelogs).map(([employeeName, employeeData]) => (
                                <React.Fragment key={employeeName}>
                                    {Object.entries(employeeData.dates).map(([date, dateData]) => (
                                        <React.Fragment key={`${employeeName}-${date}`}>
                                            {dateData.timelogs.map((log) => (
                                                <TableRow key={log.timelog_id} sx={{ borderBottom: "none" }}>
                                                    <TableCell align="center" sx={{ borderBottom: "none" }}>
                                                        <IconButton onClick={(event) => handleClick(event, log.timelog_id)}>
                                                            <MenuBookIcon sx={{ color: "purple" }} /> <ArrowDropDownIcon sx={{ color: "gray" }} />
                                                        </IconButton>
                                                        <Menu
                                                            anchorEl={anchorEl}
                                                            open={selectedLogId === log.timelog_id}
                                                            onClose={handleClose}
                                                            anchorOrigin={{
                                                                vertical: "bottom",
                                                                horizontal: "center",
                                                            }}
                                                            transformOrigin={{
                                                                vertical: "top",
                                                                horizontal: "center",
                                                            }}
                                                        >
                                                            <MenuItem
                                                                onClick={() => {
                                                                    handleClose();
                                                                    navigate(`/view/${log.timelog_id}`);
                                                                }}
                                                            >
                                                                <VisibilityRoundedIcon sx={{ color: "blue", mr: 1 }} /> View
                                                            </MenuItem>
                                                            <MenuItem
                                                                onClick={() => {
                                                                    handleClose();
                                                                    navigate(`/edit/${log.timelog_id}`);
                                                                }}
                                                            >
                                                                <EditSquareIcon sx={{ color: "red", mr: 1 }} /> Edit
                                                            </MenuItem>
                                                        </Menu>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: "none" }}>{log.employee_name}</TableCell>
                                                    <TableCell sx={{ borderBottom: "none" }}>{log.entry_date}</TableCell>
                                                    <TableCell sx={{ borderBottom: "none" }}>{log.project_name}</TableCell>
                                                    <TableCell sx={{ borderBottom: "none" }}>{log.task_name}</TableCell>
                                                    <TableCell sx={{ borderBottom: "none" }}>{new Date(log.time_from).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</TableCell>
                                                    <TableCell sx={{ borderBottom: "none" }}>{new Date(log.time_to).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</TableCell>
                                                    <TableCell sx={{ borderBottom: "none" }}>{log.total_time.slice(0, 5)}</TableCell>
                                                    <TableCell sx={{ borderBottom: "none" }}>
                                                        <ChatBubbleOutlineIcon onClick={(event) => handleClickComment(event, log.timelog_id)} />
                                                        <Popover
                                                            id={log.timelog_id}
                                                            open={selectedCommentId == log.timelog_id}
                                                            anchorEl={anchorComment}
                                                            onClose={handleCloseComment}
                                                            anchorOrigin={{
                                                                vertical: "bottom",
                                                                horizontal: "left",
                                                            }}
                                                        >
                                                            <Typography sx={{ p: 2, fontWeight: "bold", padding: "10px" }}>Time Note</Typography>
                                                            <hr style={{ margin: 0, border: "none", borderTop: "1px solid #ccc" }} />
                                                            <Typography sx={{ p: 2, padding: "10px" }}>{log.note}</Typography>
                                                        </Popover>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow sx={{ backgroundColor: "#6c757d", borderBottom: "none" }}>
                                                <TableCell colSpan={7} align="right" sx={{ color: "white" }}>
                                                    Total for {employeeName} on {date}:
                                                </TableCell>
                                                <TableCell sx={{ color: "white" }}>{dateData.day_total_time.slice(0, 5)}</TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </React.Fragment>
                                    ))}
                                    <TableRow sx={{ backgroundColor: "#ffc107", borderBottom: "none" }}>
                                        <TableCell colSpan={7} align="right">
                                            Total for {employeeName}:
                                        </TableCell>
                                        <TableCell>{employeeData.user_total_time.slice(0, 5)}</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </React.Fragment>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Typography
                variant="body2"
                color={((data?.message ?? "").includes("filter") && "error.main") || (data?.status_code === 201 ? "success.main" : data?.status_code >= 400 ? "error.main" : "success.main")}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    height: 32,
                    mx: "auto",
                    padding: "10px 16px",
                    backgroundColor: "transparent",
                    "& .MuiOutlinedInput-root": {
                        border: "none",
                        "& fieldset": { border: "none" },
                    },
                }}
            >
                {notification || response || (data?.status_code >= 201 && data?.message) || data?.error || location.state?.message}
            </Typography>
        </>
    );
}

export default ListPage;
