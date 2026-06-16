const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    content: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },  
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Post", postSchema);  