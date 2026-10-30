const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const LoginActivity = require("./models/LoginActivity");
const { requireLogin, allowRoles } =
    require("./middleware/authMiddleware");

const router = express.Router();

const dashboardRoutes = {
    admin: "/index.html",
    coordinator: "/index.html",
    student: "/index.html"
};

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, department, studentId } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Name, email and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student",
            department: typeof department === "string"
                ? department.trim()
                : "",
            studentId: typeof studentId === "string"
                ? studentId.trim()
                : ""
        });

        return res.status(201).json({
            message: "Student account created successfully.",
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        return res.status(500).json({
            message: "Could not create the account."
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Enter your email and password."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const redirect = dashboardRoutes[user.role];

        if (!redirect) {
            return res.status(403).json({
                message: "Your account does not have a valid role."
            });
        }

        req.session.userId = user._id.toString();

        await new Promise((resolve, reject) => {
            req.session.save(error => {
                if (error) reject(error);
                else resolve();
            });
        });

        try {
            await LoginActivity.create({
                user: user._id,
                loginAt: new Date()
            });
        } catch (error) {
            console.error("Login activity recording failed:", error.message);
        }

        return res.json({
            message: "Login successful.",
            redirect,
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "Could not log in. Please try again."
        });
    }
});


router.post("/logout", requireLogin, (req, res) => {
    req.session.destroy(error => {
        if (error) return res.status(500).json({ message: "Could not log out." });
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully." });
    });
});

router.get("/me", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      message: "Failed to load user details"
    });
  }
});

router.get("/users", requireLogin, allowRoles("admin"), async (req, res) => {
    try {
        const users = await User.find()
            .select("name email role department studentId")
            .sort({ name: 1 });

        return res.json(users);
    } catch (error) {
        console.error("Fetch users error:", error.message);

        return res.status(500).json({
            message: "Could not load users."
        });
    }
});

module.exports = router;