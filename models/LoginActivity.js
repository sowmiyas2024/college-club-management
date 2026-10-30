const mongoose = require("mongoose");

const loginActivitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    loginAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});

module.exports = mongoose.model(
    "LoginActivity",
    loginActivitySchema
);