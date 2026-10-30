const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            index: true
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["present", "absent"],
            default: "present",
            required: true
        },
        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        markedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// One attendance record per student per event.
attendanceSchema.index(
    { event: 1, student: 1 },
    { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
