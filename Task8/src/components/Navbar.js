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
import { useIntl } from "react-intl";

export default function Navbar() {
    const intl = useIntl();
    const navigate = useNavigate();
    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const [openDropdown, setOpenDropdown] = React.useState(null);
    const [anchorElUser, setAnchorElUser] = React.useState(null);
    const [doFetchTimelogs, isLoadingTimelogs, loadingTimelogsError] = useThunk(getTimelogs);

    const pages = [
        intl.formatMessage({ id: "navbar.clockTime" }),
        intl.formatMessage({ id: "navbar.timelog" }),
        intl.formatMessage({ id: "navbar.vacation" }),
        intl.formatMessage({ id: "navbar.holiday" }),
        intl.formatMessage({ id: "navbar.projectTime" }),
        intl.formatMessage({ id: "navbar.timeSummary" }),
        intl.formatMessage({ id: "navbar.settings" }),
        intl.formatMessage({ id: "navbar.humanResources" }),
    ];

    const dropdownPages = {
        [intl.formatMessage({ id: "navbar.settings" })]: [intl.formatMessage({ id: "navbar.settings.payPeriods" }), intl.formatMessage({ id: "navbar.settings.payProfile" }), intl.formatMessage({ id: "navbar.settings.users" }), intl.formatMessage({ id: "navbar.settings.locations" })],
        [intl.formatMessage({ id: "navbar.humanResources" })]: [intl.formatMessage({ id: "navbar.hr.employee" }), intl.formatMessage({ id: "navbar.hr.review" }), intl.formatMessage({ id: "navbar.hr.applicants" })],
    };
    const Profile = [intl.formatMessage({ id: "navbar.name.changePassword" }), intl.formatMessage({ id: "navbar.name.changePassphrase" }), intl.formatMessage({ id: "navbar.name.logout" })];

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
                                            startIcon={page === intl.formatMessage({ id: "navbar.settings" }) ? <SettingsIcon color="info" /> : <RememberMeIcon sx={{ color: "#eb932d" }} />}
                                            endIcon={page === intl.formatMessage({ id: "navbar.settings" }) || page === intl.formatMessage({ id: "navbar.humanResources" }) ? <ArrowDropDownIcon sx={{ color: "gray" }} /> : null}
                                        >
                                            {page}
                                        </Button>
                                        <Menu anchorEl={anchorElNav} open={Boolean(anchorElNav) && openDropdown === page} onClose={handleCloseDropdown} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }}>
                                            {dropdownPages[page].map((item) => (
                                                <React.Fragment key={item}>
                                                    <Button
                                                        key={item}
                                                        component={item === intl.formatMessage({ id: "navbar.settings.users" }) ? Link : undefined}
                                                        to={item === intl.formatMessage({ id: "navbar.settings.users" }) ? "/" : undefined}
                                                        onClick={item === intl.formatMessage({ id: "navbar.settings.users" }) ? handleResetFilters : handleCloseDropdown}
                                                        sx={{ display: "flex", color: "black", textTransform: "none", pl: 2, justifyContent: "flex-start" }}
                                                        startIcon={
                                                            item === intl.formatMessage({ id: "navbar.settings.payPeriods" }) ? (
                                                                <PaymentRoundedIcon color="success" />
                                                            ) : item === intl.formatMessage({ id: "navbar.settings.payProfile" }) ? (
                                                                <TimerRoundedIcon sx={{ color: "#7e3007" }} />
                                                            ) : item === intl.formatMessage({ id: "navbar.settings.users" }) ? (
                                                                <GroupsIcon color="error" />
                                                            ) : item === intl.formatMessage({ id: "navbar.settings.locations" }) ? (
                                                                <MapIcon color="primary" />
                                                            ) : item === intl.formatMessage({ id: "navbar.hr.employee" }) ? (
                                                                <AccountBoxIcon color="primary" />
                                                            ) : item === intl.formatMessage({ id: "navbar.hr.review" }) ? (
                                                                <AccountCircleOutlinedIcon sx={{ color: "#db4900" }} />
                                                            ) : (
                                                                <PersonAddAltRoundedIcon sx={{ color: "#8608a8" }} />
                                                            )
                                                        }
                                                    >
                                                        {item}
                                                    </Button>
                                                    {(item === intl.formatMessage({ id: "navbar.settings.payProfile" }) || item === intl.formatMessage({ id: "navbar.hr.review" }) || item === intl.formatMessage({ id: "navbar.hr.employee" })) && <Divider sx={{ my: 0.5, borderColor: "#ddd" }} />}
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
                                                    marginRight: page === intl.formatMessage({ id: "navbar.timeSummary" }) ? "0px" : "8px",
                                                },
                                            }}
                                            startIcon={
                                                page === intl.formatMessage({ id: "navbar.clockTime" }) ? (
                                                    <HomeIcon color="primary" />
                                                ) : page === intl.formatMessage({ id: "navbar.timelog" }) ? (
                                                    <ListIcon sx={{ color: "#086d2c" }} />
                                                ) : page === intl.formatMessage({ id: "navbar.vacation" }) ? (
                                                    <SportsFootballIcon sx={{ color: "#a22506" }} />
                                                ) : page === intl.formatMessage({ id: "navbar.holiday" }) ? (
                                                    <BeachAccessIcon sx={{ color: "#742207" }} />
                                                ) : page === intl.formatMessage({ id: "navbar.projectTime" }) ? (
                                                    <AccountTreeIcon sx={{ color: "#1b5032" }} />
                                                ) : page === intl.formatMessage({ id: "navbar.timeSummary" }) ? (
                                                    <AttachMoneyIcon sx={{ color: "#6e0707" }} />
                                                ) : page === intl.formatMessage({ id: "navbar.settings" }) ? (
                                                    <SettingsIcon color="info" />
                                                ) : page === intl.formatMessage({ id: "navbar.humanResources" }) ? (
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
                            {intl.formatMessage({ id: "navbar.name" })}
                        </Button>
                        <Menu anchorEl={anchorElUser} open={Boolean(anchorElUser)} onClose={handleCloseUserMenu} anchorOrigin={{ vertical: "top", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
                            {Profile.map((item) => (
                                <React.Fragment key={item}>
                                    <Button
                                        onClick={handleCloseUserMenu}
                                        sx={{ display: "flex", textTransform: "none", color: "black" }}
                                        startIcon={
                                            item === intl.formatMessage({ id: "navbar.name.changePassword" }) ? <LockRoundedIcon color="primary" /> : item === intl.formatMessage({ id: "navbar.name.changePassphrase" }) ? <VpnKeyRoundedIcon color="primary" /> : <LogoutRoundedIcon color="error" />
                                        }
                                    >
                                        {item}
                                    </Button>
                                    {item === intl.formatMessage({ id: "navbar.name.changePassphrase" }) && <Divider sx={{ my: 0.5, borderColor: "#ddd" }} />}
                                </React.Fragment>
                            ))}
                        </Menu>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
