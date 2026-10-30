const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        coordinator: {
            type: String,
            required: true,
            trim: true
        },
        coordinatorUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
},
        meetingDay: {
            type: String,
            default: "Not specified"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Club", clubSchema);