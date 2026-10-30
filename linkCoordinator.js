require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Club = require("./models/Club");

async function linkCoordinator() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = process.argv[2]?.trim().toLowerCase();

        if (!email) {
            console.log('Usage: node linkCoordinator.js "your-email@example.com"');
            return;
        }

        const user = await User.findOne({ email });

        if (!user) {
            console.log("Coordinator account not found.");
            return;
        }

        if (!["coordinator", "admin"].includes(user.role)) {
            console.log("This account is not a coordinator or admin.");
            return;
        }

        const club = await Club.findOne({ name: "Coding Club" });

        if (!club) {
            console.log("Coding Club was not found.");
            return;
        }

        club.coordinatorUser = user._id;
        await club.save();

        console.log("Coordinator linked successfully!");
        console.log("Club:", club.name);
        console.log("Coordinator:", user.name);
    } catch (error) {
        console.error("Link failed:", error.message);
    } finally {
        await mongoose.disconnect();
    }
}

linkCoordinator();