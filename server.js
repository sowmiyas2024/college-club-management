
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const path = require("path");

const connectDB = require('./config/db');
const User = require("./models/User");
const Club = require("./models/Club");
const Event = require("./models/Event");
const Membership = require("./models/Membership");

const {
    requireLogin,
    allowRoles
} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");

const dashboardRoutes = {
    admin: "/index.html",
    coordinator: "/index.html",
    student: "/index.html"
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate required environment variables.
if (!process.env.MONGO_URI) {
    console.error(
        "ERROR: MONGO_URI is missing from your .env file."
    );
    process.exit(1);
}

if (!process.env.SESSION_SECRET) {
    console.error(
        "ERROR: SESSION_SECRET is missing from your .env file."
    );
    process.exit(1);
}

// Session configuration.
// secure: false is for local development on http://localhost.
app.use(session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI
    }),

    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 2 * 60 * 60 * 1000
    }
}));

// Login page.
app.get("/login.html", (req, res) => {
    res.sendFile(path.join(publicDir, "login.html"));
});

// Registration page.
app.get("/register.html", (req, res) => {
    res.sendFile(path.join(publicDir, "register.html"));
});

// Always open the login page at the root URL.
app.get("/", (req, res) => {
    res.redirect("/login.html");
});

// Protect the shared dashboard HTML page.
app.get("/index.html", async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.redirect("/login.html");
        }

        const user = await User.findById(req.session.userId)
            .select("role");

        if (!user || !dashboardRoutes[user.role]) {
            return req.session.destroy(() => {
                res.redirect("/login.html");
            });
        }

        return res.sendFile(path.join(publicDir, "index.html"));
    } catch (error) {
        console.error("Dashboard authorization error:", error);
        return res.status(500).send(
            "Could not verify your session. Check the server terminal."
        );
    }
});

// Serve CSS, JavaScript, images, and other public assets.
app.use(express.static(publicDir, {
    index: false
}));

// API routes.
app.use("/api/auth", require("./auth"));
app.use("/api/clubs", require("./clubRoutes"));
app.use("/api/events", require("./eventRoutes"));
app.use("/api/memberships", require("./membershipRoutes"));
app.use("/api/dashboard", require("./dashboardRoutes"));

// Admin statistics.
app.get(
    "/api/admin/stats",
    requireLogin,
    allowRoles("admin"),
    async (req, res) => {
        try {
            const [
                totalClubs,
                totalEvents,
                totalUsers,
                totalMemberships
            ] = await Promise.all([
                Club.countDocuments(),
                Event.countDocuments(),
                User.countDocuments(),
                Membership.countDocuments()
            ]);

            return res.json({
                totalClubs,
                totalEvents,
                totalUsers,
                totalMemberships
            });
        } catch (error) {
            console.error("Admin stats error:", error);

            return res.status(500).json({
                message: "Could not load dashboard statistics."
            });
        }
    }
);

// Health check.
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "CampusConnect server is running."
    });
});

// Start only after MongoDB connects successfully.
async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(
                `CampusConnect running on port ${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "Database connection failed:",
            error.message
        );
        process.exit(1);
    }
}

startServer();

