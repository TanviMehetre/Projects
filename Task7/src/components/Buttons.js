import React from "react";
import { Button } from "@mui/material";
import PropTypes from "prop-types";

const ButtonComp = ({ text, icon: Icon, iconColor, variant = "contained", color = "primary", ...props }) => {
    return (
        <Button variant={variant} color={color} startIcon={Icon ? <Icon sx={{ color: iconColor }} /> : null} {...props}>
            {text}
        </Button>
    );
};

ButtonComp.propTypes = {
    text: PropTypes.string,
    icon: PropTypes.elementType,
    iconColor: PropTypes.string,
    variant: PropTypes.oneOf(["contained", "outlined", "text"]),
    color: PropTypes.oneOf(["primary", "secondary", "error", "success", "warning", "info"]),
};

export default ButtonComp;
