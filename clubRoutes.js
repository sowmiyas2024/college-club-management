
const express = require("express");
const mongoose = require("mongoose");

const Club = require("./models/Club");
const Membership = require("./models/Membership");
const User = require("./models/User");
const {
    requireLogin,
    allowRoles
} = require("./middleware/authMiddleware");

const router = express.Router();

// List clubs:
// Admin/student see all clubs; coordinator sees assigned clubs only.
router.get("/", requireLogin, async (req, res) => {
    try {
        const filter = req.user.role === "coordinator"
            ? { coordinatorUser: req.user._id }
            : {};

        const clubs = await Club.find(filter)
            .populate("coordinatorUser", "name email")
            .sort({ name: 1 })
            .lean();

        return res.json(clubs);
    } catch (error) {
        console.error("Fetch clubs error:", error.message);
        return res.status(500).json({
            message: "Could not load clubs."
        });
    }
});

// Admin creates clubs and assigns coordinators.
router.post(
    "/",
    requireLogin,
    allowRoles("admin"),
    async (req, res) => {
        try {
            const {
                name,
                description,
                category,
                coordinatorUser,
                meetingDay
            } = req.body;

            if (
                typeof name !== "string" ||
                typeof description !== "string" ||
                typeof category !== "string" ||
                !name.trim() ||
                !description.trim() ||
                !category.trim()
            ) {
                return res.status(400).json({
                    message: "Name, description and category are required."
                });
            }

            let coordinator = "";
            let assignedUser = null;

            if (coordinatorUser) {
                if (!mongoose.isValidObjectId(coordinatorUser)) {
                    return res.status(400).json({
                        message: "Invalid coordinator ID."
                    });
                }

                assignedUser = await User.findOne({
                    _id: coordinatorUser,
                    role: { $in: ["student", "coordinator"] }
                });

                if (!assignedUser) {
                    return res.status(400).json({
                        message: "Select a valid registered student or coordinator account."
                    });
                }

                coordinator = assignedUser.name;
            }

            const club = await Club.create({
                name: name.trim(),
                description: description.trim(),
                category: category.trim(),
                coordinator,
                coordinatorUser: assignedUser ? assignedUser._id : null,
                meetingDay: typeof meetingDay === "string" && meetingDay.trim()
                    ? meetingDay.trim()
                    : "Not specified"
            });

            return res.status(201).json({
                message: "Club created successfully.",
                club
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: "A club with this name already exists."
                });
            }

            console.error("Create club error:", error.message);
            return res.status(500).json({
                message: "Could not create club."
            });
        }
    }
);

// Only students can submit membership requests.
router.post(
    "/:clubId/join",
    requireLogin,
    allowRoles("student"),
    async (req, res) => {
        try {
            const { clubId } = req.params;

            if (!mongoose.isValidObjectId(clubId)) {
                return res.status(400).json({
                    message: "Invalid club ID."
                });
            }

            const club = await Club.findById(clubId);

            if (!club) {
                return res.status(404).json({
                    message: "Club not found."
                });
            }

            const existing = await Membership.findOne({
                student: req.user._id,
                club: club._id
            });

            if (existing) {
                return res.status(409).json({
                    message: "You have already requested or joined this club."
                });
            }

            const membership = await Membership.create({
                student: req.user._id,
                club: club._id
            });

            return res.status(201).json({
                message: "Membership request submitted!",
                membership
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: "You have already requested or joined this club."
                });
            }

            console.error("Join club error:", error.message);
            return res.status(500).json({
                message: "Could not submit membership request."
            });
        }
    }
);

// Students can see their own membership records only.
router.get(
    "/my-memberships",
    requireLogin,
    allowRoles("student"),
    async (req, res) => {
        try {
            const memberships = await Membership.find({
                student: req.user._id
            })
                .populate("club", "name category")
                .sort({ createdAt: -1 });

            return res.json(memberships);
        } catch (error) {
            console.error("Membership fetch error:", error.message);
            return res.status(500).json({
                message: "Could not load memberships."
            });
        }
    }
);

module.exports = router;
