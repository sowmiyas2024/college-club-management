const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Event = require("./models/Event");
const Club = require("./models/Club");
const EventRegistration = require("./models/EventRegistration");
const Attendance = require("./models/Attendance");
const { requireLogin, allowRoles } = require("./middleware/authMiddleware");

const EVENT_FEE = 100;

// Get events
router.get("/", requireLogin, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "coordinator") {
      const clubs = await Club.find({
        coordinatorUser: req.user._id
      }).select("_id");

      filter.club = { $in: clubs.map(club => club._id) };
    }

    const events = await Event.find(filter)
      .populate("club", "name coordinatorUser")
      .sort({ date: 1 });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to fetch events." });
  }
});

// Create event: every event costs ₹100
router.post(
  "/",
  requireLogin,
  allowRoles("admin", "coordinator"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        date,
        venue,
        club,
        category,
        imageUrl
      } = req.body;

      if (
        !title?.trim() ||
        !description?.trim() ||
        !date ||
        !venue?.trim()
      ) {
        return res.status(400).json({
          message: "Title, description, date and venue are required."
        });
      }

      if (!mongoose.isValidObjectId(club)) {
        return res.status(400).json({
          message: "Select a valid club."
        });
      }

      const clubDoc = await Club.findById(club);

      if (!clubDoc) {
        return res.status(404).json({ message: "Club not found." });
      }

      if (
        req.user.role === "coordinator" &&
        String(clubDoc.coordinatorUser) !== String(req.user._id)
      ) {
        return res.status(403).json({
          message: "You can create events only for your assigned clubs."
        });
      }

      const event = await Event.create({
        title: title.trim(),
        description: description.trim(),
        date,
        venue: venue.trim(),
        club: clubDoc._id,
        category: category || "Other",
        imageUrl: String(imageUrl || "").trim(),
        fee: EVENT_FEE,
        createdBy: req.user._id
      });

      res.status(201).json({
        success: true,
        message: "Event created. Entry fee: ₹100.",
        event
      });
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Unable to create event." });
    }
  }
);

// Get student's registrations
router.get(
  "/registrations/my",
  requireLogin,
  allowRoles("student"),
  async (req, res) => {
    try {
      const registrations = await EventRegistration.find({
        student: req.user._id,
        status: "registered"
      })
        .populate("event")
        .sort({ createdAt: -1 });

      res.json(registrations);
    } catch (error) {
      res.status(500).json({
        message: "Unable to load registrations."
      });
    }
  }
);

// Check registration status
// Check whether the logged-in student is registered for an event.
router.get(
  "/:eventId/registration",
  requireLogin,
  allowRoles("student"),
  async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!mongoose.isValidObjectId(eventId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid event ID."
        });
      }

      const registration = await EventRegistration.findOne({
        event: new mongoose.Types.ObjectId(eventId),
        student: req.user._id,
        status: "registered"
      }).lean();

      return res.json({
        success: true,
        registered: Boolean(registration)
      });
    } catch (error) {
      console.error("Registration status error:", error);

      return res.status(500).json({
        success: false,
        registered: false,
        message: "Unable to check registration status."
      });
    }
  }
);

// Simulated UPI/Card payment: no real transaction
router.post(
  "/:eventId/pay",
  requireLogin,
  allowRoles("student"),
  async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!mongoose.isValidObjectId(eventId)) {
        return res.status(400).json({ message: "Invalid event ID." });
      }

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }

      if (new Date(event.date) < new Date()) {
        return res.status(400).json({
          message: "This event has already passed."
        });
      }

      const paymentMethod = String(req.body.paymentMethod || "");

      if (!["upi", "card"].includes(paymentMethod)) {
        return res.status(400).json({
          message: "Choose UPI or Card."
        });
      }

      const existing = await EventRegistration.findOne({
        event: event._id,
        student: req.user._id
      });

      if (existing?.status === "registered") {
        return res.status(409).json({
          message: "You are already registered for this event."
        });
      }

      const registration = await EventRegistration.findOneAndUpdate(
        {
          event: event._id,
          student: req.user._id
        },
        {
          $set: {
            status: "registered",
            paymentStatus: "simulated",
            paymentMethod,
            amountPaise: EVENT_FEE * 100,
            simulatedPayment: true,
            paidAt: new Date()
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true
        }
      );

      res.status(201).json({
        success: true,
        message: "Registered Successfully!",
        eventName: event.title,
        amount: EVENT_FEE,
        paymentMethod,
        status: "registered",
        simulated: true,
        note: "Payment is simulated. No real money was charged."
      });
    } catch (error) {
      console.error("Registration error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "You are already registered for this event."
        });
      }

      res.status(500).json({
        message: "Unable to complete registration."
      });
    }
  }
);

// Load registered students for attendance
router.get(
  "/:eventId/attendance/students",
  requireLogin,
  allowRoles("admin", "coordinator"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.eventId).populate("club");

      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }

      if (
        req.user.role === "coordinator" &&
        String(event.club?.coordinatorUser) !== String(req.user._id)
      ) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const registrations = await EventRegistration.find({
        event: event._id,
        status: "registered"
      }).populate("student", "name email studentId department");

      const records = await Attendance.find({ event: event._id });
      const attendanceMap = new Map(
        records.map(record => [
          String(record.student),
          record.status
        ])
      );

      res.json(
        registrations
          .filter(registration => registration.student)
          .map(registration => ({
            ...registration.student.toObject(),
            status:
              attendanceMap.get(String(registration.student._id)) ||
              "absent"
          }))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Could not load registered students."
      });
    }
  }
);

// Get attendance records
router.get(
  "/:eventId/attendance",
  requireLogin,
  allowRoles("admin", "coordinator"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.eventId).populate("club");

      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }

      if (
        req.user.role === "coordinator" &&
        String(event.club?.coordinatorUser) !== String(req.user._id)
      ) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const records = await Attendance.find({ event: event._id })
        .populate("student", "name email studentId")
        .sort({ createdAt: -1 });

      res.json(records);
    } catch (error) {
      res.status(500).json({
        message: "Could not load attendance."
      });
    }
  }
);

// Mark attendance
router.put(
  "/:eventId/attendance/:studentId",
  requireLogin,
  allowRoles("admin", "coordinator"),
  async (req, res) => {
    try {
      const { eventId, studentId } = req.params;

      if (
        !mongoose.isValidObjectId(eventId) ||
        !mongoose.isValidObjectId(studentId)
      ) {
        return res.status(400).json({
          message: "Invalid event or student ID."
        });
      }

      if (!["present", "absent"].includes(req.body.status)) {
        return res.status(400).json({
          message: "Status must be present or absent."
        });
      }

      const event = await Event.findById(eventId).populate("club");

      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }

      if (
        req.user.role === "coordinator" &&
        String(event.club?.coordinatorUser) !== String(req.user._id)
      ) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const registered = await EventRegistration.exists({
        event: eventId,
        student: studentId,
        status: "registered"
      });

      if (!registered) {
        return res.status(400).json({
          message: "Student is not registered for this event."
        });
      }

      const record = await Attendance.findOneAndUpdate(
        { event: eventId, student: studentId },
        {
          $set: {
            status: req.body.status,
            markedBy: req.user._id,
            markedAt: new Date()
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );

      res.json({ message: "Attendance saved.", record });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Could not save attendance."
      });
    }
  }
);

module.exports = router;