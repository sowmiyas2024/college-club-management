const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    venue: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: [
        "Technology",
        "Sports",
        "Arts",
        "Music",
        "Literature",
        "Science",
        "Cultural",
        "Other"
      ],
      default: "Other"
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ""
    },
    fee: {
      type: Number,
      required: true,
      min: 100,
      default: 100
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);