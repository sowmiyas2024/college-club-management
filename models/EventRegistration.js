const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["pending_payment", "registered", "cancelled"],
      default: "registered"
    },
    paymentStatus: {
      type: String,
      enum: ["not_required", "simulated", "pending", "paid", "failed"],
      default: "simulated"
    },
    paymentMethod: {
      type: String,
      enum: ["free", "upi", "card"],
      default: "upi"
    },
    amountPaise: {
      type: Number,
      min: 10000,
      default: 10000,
      required: true
    },
    simulatedPayment: {
      type: Boolean,
      default: true
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

eventRegistrationSchema.index(
  { event: 1, student: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema
);