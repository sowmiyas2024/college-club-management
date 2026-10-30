
const express = require("express");
const router = express.Router();

const User = require("./models/User");
const Club = require("./models/Club");
const Event = require("./models/Event");
const Membership = require("./models/Membership");
const EventRegistration = require("./models/EventRegistration");
const Attendance = require("./models/Attendance");

// Authenticate the current session.
async function requireLogin(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Please log in first."
      });
    }

    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User account not found."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Dashboard authentication error:", error);
    res.status(500).json({
      message: "Authentication failed."
    });
  }
}

// GET /api/dashboard/stats
router.get("/stats", requireLogin, async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const now = new Date();

    // ADMIN: totals across the entire system.
    if (role === "admin") {
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
        role,
        totalClubs,
        totalEvents,
        totalUsers,
        totalMemberships
      });
    }

    // COORDINATOR: only clubs and events assigned to them.
    if (role === "coordinator") {
      const clubs = await Club.find({
        coordinatorUser: userId
      }).select("_id");

      const clubIds = clubs.map(club => club._id);

      const events = await Event.find({
        club: { $in: clubIds }
      }).select("_id");

      const eventIds = events.map(event => event._id);

      const [
        joinedMemberships,
        eventRegistrations
      ] = await Promise.all([
        Membership.find({
          club: { $in: clubIds },
          status: "approved"
        }).distinct("student"),

        EventRegistration.countDocuments({
          event: { $in: eventIds },
          status: "registered"
        })
      ]);

      return res.json({
        role,
        myClubs: clubs.length,
        myEvents: events.length,
        studentsJoined: joinedMemberships.length,
        eventRegistrations
      });
    }

    // STUDENT: their own memberships, registrations, and attendance.
    if (role === "student") {
      const [
        myMemberships,
        upcomingEvents,
        eventsRegistered,
        eventsAttended
      ] = await Promise.all([
        Membership.countDocuments({
          student: userId,
          status: "approved"
        }),

        Event.countDocuments({
          date: { $gte: now }
        }),

        EventRegistration.countDocuments({
          student: req.user._id,
          status: "registered"
        }),

        Attendance.countDocuments({
          student: userId,
          status: "present"
        })
      ]);

      return res.json({
        role,
        myClubs: myMemberships,
        upcomingEvents,
        eventsRegistered,
        eventsAttended
      });
    }

    return res.status(403).json({
      message: "Unsupported user role."
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    res.status(500).json({
      message: "Failed to load dashboard statistics."
    });
  }
});

module.exports = router;
