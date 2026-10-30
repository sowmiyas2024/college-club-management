require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const name = process.env.ADMIN_NAME;
        const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const password = process.env.ADMIN_PASSWORD;

        if (!name || !email || !password) {
            throw new Error(
                "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env first."
            );
        }

        if (password.length < 12) {
            throw new Error(
                "Use an admin password with at least 12 characters."
            );
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log(
                "An account with this email already exists. No changes made."
            );
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await User.create({
            name,
            email,
            password: hashedPassword,
            role: "admin"
        });

        console.log("Admin account created successfully!");
        console.log("Email:", email);
        console.log("You can now log in through the existing login page.");
    } catch (error) {
        console.error("Could not create admin:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();