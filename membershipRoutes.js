const express = require("express");
const mongoose = require("mongoose");

const Membership = require("./models/Membership");
const Club = require("./models/Club");

const { requireLogin, allowRoles } =
    require("./middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    requireLogin,
    allowRoles("admin", "coordinator"),
    async (req, res) => {
        try {
            let filter = {};

            if (req.user.role === "coordinator") {
                const clubs = await Club.find({
                    coordinatorUser: req.user._id
                }).select("_id");

                filter.club = {
                    $in: clubs.map(club => club._id)
                };
            }

            const memberships = await Membership.find(filter)
                .populate("student", "name email department studentId role")
                .populate("club", "name category coordinator coordinatorUser")
                .sort({ createdAt: -1 })
                .lean();

            return res.json(
                memberships.filter(
                    item => item.student && item.club &&
                        item.student.role === "student"
                )
            );
        } catch (error) {
            console.error("Fetch memberships error:", error.message);

            return res.status(500).json({
                message: "Could not load membership requests."
            });
        }
    }
);

router.patch(
    "/:membershipId/status",
    requireLogin,
    allowRoles("admin", "coordinator"),
    async (req, res) => {
        try {
            const { membershipId } = req.params;
            const { status } = req.body;

            if (!mongoose.isValidObjectId(membershipId)) {
                return res.status(400).json({
                    message: "Invalid membership ID."
                });
            }

            if (!["approved", "rejected"].includes(status)) {
                return res.status(400).json({
                    message: "Status must be approved or rejected."
                });
            }

            const membership = await Membership.findById(membershipId)
                .populate("club");

            if (!membership || !membership.club) {
                return res.status(404).json({
                    message: "Membership request or club not found."
                });
            }

            if (
                req.user.role === "coordinator" &&
                String(membership.club.coordinatorUser) !==
                    String(req.user._id)
            ) {
                return res.status(403).json({
                    message: "You can manage requests only for your assigned clubs."
                });
            }

            if (membership.status !== "pending") {
                return res.status(409).json({
                    message: "This request has already been processed."
                });
            }

            membership.status = status;
            await membership.save();

            return res.json({
                message: `Membership request ${status}.`,
                membership
            });
        } catch (error) {
            console.error("Update membership error:", error.message);

            return res.status(500).json({
                message: "Could not update membership request."
            });
        }
    }
);

router.get(
    "/my",
    requireLogin,
    allowRoles("student"),
    async (req, res) => {
        try {
            const memberships = await Membership.find({
                student: req.user._id
            }).populate("club", "name category");

            return res.json(memberships);
        } catch (error) {
            console.error("My memberships error:", error.message);

            return res.status(500).json({
                message: "Could not load your memberships."
            });
        }
    }
);

module.exports = router;