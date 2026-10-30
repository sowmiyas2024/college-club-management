require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");

async function setRole() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = process.argv[2]?.trim().toLowerCase();
        const role = process.argv[3]?.trim().toLowerCase();

        if (!email || !["student", "coordinator", "admin"].includes(role)) {
            console.log(
                'Usage: node setRole.js "user@example.com" coordinator'
            );
            return;
        }

        const user = await User.findOneAndUpdate(
            { email },
            { $set: { role } },
            { new: true, runValidators: true }
        );

        if (!user) {
            console.log("No account found with that email.");
            return;
        }

        console.log(`Updated ${user.email} to role: ${user.role}`);
    } catch (error) {
        console.error("Role update failed:", error.message);
    } finally {
        await mongoose.disconnect();
    }
}

setRole();