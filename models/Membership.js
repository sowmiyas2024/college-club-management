const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        }
    },
    { timestamps: true }
);

// A student can request membership in a club only once.
membershipSchema.index(
    { student: 1, club: 1 },
    { unique: true }
);

module.exports = mongoose.model("Membership", membershipSchema);