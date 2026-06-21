import * as React from "react";
import { Box, Typography, AppBar, Toolbar, Container, Button, Menu, MenuItem, IconButton, Stack, Divider } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ListIcon from "@mui/icons-material/List";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SettingsIcon from "@mui/icons-material/Settings";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import GroupsIcon from "@mui/icons-material/Groups";
import MapIcon from "@mui/icons-material/Map";
import RememberMeIcon from "@mui/icons-material/RememberMe";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import HomeIcon from "@mui/icons-material/Home";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import Logo from "../quadyster.svg";
import { Link, useNavigate } from "react-router-dom";
import { resetFilters, getTimelogs } from "../store/store";
import { useDispatch } from "react-redux";
import { useThunk } from "../hooks/use-thunk";

const pages = ["Clock Time", "Timelog", "Vacation", "Holiday", "Project Time", "Time Summary", "Settings", "Human Resources"];
const dropdownPages = {
    Settings: ["Pay Periods", "Pay Profile", "Users", "Locations"],
    "Human Resources": ["Employee", "Review", "Applicants"],
};
const Profile = ["Change Password", "Change Passphrase", "Logout"];

export default function Navbar() {
    const navigate = useNavigate();
    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const [openDropdown, setOpenDropdown] = React.useState(null);
    const [anchorElUser, setAnchorElUser] = React.useState(null);
    const [doFetchTimelogs, isLoadingTimelogs, loadingTimelogsError] = useThunk(getTimelogs);

    const dispatch = useDispatch();

    const handleOpenDropdown = (event, page) => {
        setAnchorElNav(event.currentTarget);
        setOpenDropdown(page);
    };

    const handleCloseDropdown = () => {
        setAnchorElNav(null);
        setOpenDropdown(null);
    };

    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };
    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleResetFilters = async () => {
        setAnchorElNav(null);
        setOpenDropdown(null);
        const filterData = {
            action: "reset",
            project: "",
            member: "",
            date_range: "2024-11-15",
            range2: "2025-11-14",
        };

        await dispatch(resetFilters(filterData));
        if (window.location.pathname === "/") {
            navigate(0);
        } else {
            navigate("/");
        }
    };

    return (
        <AppBar position="static" sx={{ backgroundColor: "#f1f1f1", width: "100%", maxWidth: "100% !important" }} elevation={0}>
            <Container sx={{ width: "100%", maxWidth: "100% !important" }}>
                <Toolbar disableGutters>
                    <Box component={Link} to="/" sx={{ display: "flex", alignItems: "center", mr: 2, textDecoration: "none" }}>
                        <img src={Logo} alt="Logo" style={{ width: 125, height: 70, marginRight: 8 }} />
                        <Typography
                            variant="h6"
                            sx={{
                                fontFamily: "Roboto, sans-serif",
                                fontWeight: "normal",
                                textTransform: "none",
                                color: "black",
                            }}
                        ></Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
                        {pages.map((page) => (
                            <React.Fragment key={page}>
                                {dropdownPages[page] ? (
                                    <Box sx={{ display: "inline-block" }}>
                                        <Button
                                            onClick={(e) => handleOpenDropdown(e, page)}
                                            sx={{ my: 2, color: "black", display: "flex", textTransform: "none" }}
                                            startIcon={page === "Settings" ? <SettingsIcon color="info" /> : <RememberMeIcon sx={{ color: "#eb932d" }} />}
                                            endIcon={page === "Settings" || page === "Human Resources" ? <ArrowDropDownIcon sx={{ color: "gray" }} /> : null}
                                        >
                                            {page}
                                        </Button>
                                        <Menu anchorEl={anchorElNav} open={Boolean(anchorElNav) && openDropdown === page} onClose={handleCloseDropdown} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }}>
                                            {dropdownPages[page].map((item) => (
                                                <React.Fragment key={item}>
                                                    <Button
                                                        key={item}
                                                        component={item === "Users" ? Link : undefined}
                                                        to={item === "Users" ? "/" : undefined}
                                                        onClick={item === "Users" ? handleResetFilters : handleCloseDropdown}
                                                        sx={{ display: "flex", color: "black", textTransform: "none", pl: 2, justifyContent: "flex-start" }}
                                                        startIcon={
                                                            item === "Pay Periods" ? (
                                                                <PaymentRoundedIcon color="success" />
                                                            ) : item === "Pay Profile" ? (
                                                                <TimerRoundedIcon sx={{ color: "#7e3007" }} />
                                                            ) : item === "Users" ? (
                                                                <GroupsIcon color="error" />
                                                            ) : item === "Locations" ? (
                                                                <MapIcon color="primary" />
                                                            ) : item === "Employee" ? (
                                                                <AccountBoxIcon color="primary" />
                                                            ) : item === "Review" ? (
                                                                <AccountCircleOutlinedIcon sx={{ color: "#db4900" }} />
                                                            ) : (
                                                                <PersonAddAltRoundedIcon sx={{ color: "#8608a8" }} />
                                                            )
                                                        }
                                                    >
                                                        {item}
                                                    </Button>
                                                    {(item === "Pay Profile" || item === "Review" || item === "Employee") && <Divider sx={{ my: 0.5, borderColor: "#ddd" }} />}
                                                </React.Fragment>
                                            ))}
                                        </Menu>
                                    </Box>
                                ) : (
                                    <Box>
                                        <Button
                                            key={page}
                                            sx={{
                                                my: 2,
                                                color: "black",
                                                display: "flex",
                                                textTransform: "none",
                                                "& .MuiButton-startIcon": {
                                                    marginRight: page === "Time Summary" ? "0px" : "8px",
                                                },
                                            }}
                                            startIcon={
                                                page === "Clock Time" ? (
                                                    <HomeIcon color="primary" />
                                                ) : page === "Timelog" ? (
                                                    <ListIcon sx={{ color: "#086d2c" }} />
                                                ) : page === "Vacation" ? (
                                                    <SportsFootballIcon sx={{ color: "#a22506" }} />
                                                ) : page === "Holiday" ? (
                                                    <BeachAccessIcon sx={{ color: "#742207" }} />
                                                ) : page === "Project Time" ? (
                                                    <AccountTreeIcon sx={{ color: "#1b5032" }} />
                                                ) : page === "Time Summary" ? (
                                                    <AttachMoneyIcon sx={{ color: "#6e0707" }} />
                                                ) : page === "Settings" ? (
                                                    <SettingsIcon color="info" />
                                                ) : page === "Human Resource" ? (
                                                    <RememberMeIcon sx={{ color: "#eb932d" }} />
                                                ) : (
                                                    <MenuIcon sx={{ color: "green" }} />
                                                )
                                            }
                                        >
                                            {page}
                                        </Button>
                                    </Box>
                                )}
                            </React.Fragment>
                        ))}
                    </Box>

                    <Box sx={{ flexGrow: 0 }}>
                        <Button onClick={handleOpenUserMenu} sx={{ color: "black", textTransform: "none", display: "flex" }} endIcon={<ArrowDropDownIcon sx={{ color: "gray" }} />}>
                            <PersonRoundedIcon sx={{ color: "#510457" }} />
                            Tanvi Mehetre
                        </Button>
                        <Menu anchorEl={anchorElUser} open={Boolean(anchorElUser)} onClose={handleCloseUserMenu} anchorOrigin={{ vertical: "top", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
                            {Profile.map((item) => (
                                <React.Fragment>
                                    <Button
                                        key={item}
                                        onClick={handleCloseUserMenu}
                                        sx={{ display: "flex", textTransform: "none", color: "black" }}
                                        startIcon={item === "Change Password" ? <LockRoundedIcon color="primary" /> : item === "Change Passphrase" ? <VpnKeyRoundedIcon color="primary" /> : <LogoutRoundedIcon color="error" />}
                                    >
                                        {item}
                                    </Button>
                                    {item === "Change Passphrase" && <Divider sx={{ my: 0.5, borderColor: "#ddd" }} />}
                                </React.Fragment>
                            ))}
                        </Menu>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
