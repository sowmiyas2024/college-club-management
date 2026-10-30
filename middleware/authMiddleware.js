const User = require("../models/User");

async function requireLogin(req, res, next) {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        const user = await User.findById(req.session.userId)
            .select("name email role department studentId");

        if (!user) {
            return res.status(401).json({
                message: "User account not found. Please log in again."
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Authentication error:", error.message);
        return res.status(500).json({
            message: "Authentication failed."
        });
    }
}

function allowRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You are not allowed to perform this action."
            });
        }

        next();
    };
}

module.exports = { requireLogin, allowRoles };
