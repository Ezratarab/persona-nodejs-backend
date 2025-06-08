const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const postSchema = new Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  photos: {
    type: [String],
    required: true,
    validate: {
      validator: function (value) {
        return value.every((photo) =>
          /^data:image\/(jpeg|png|gif|webp);base64,/.test(photo)
        );
      },
      message: "All photos must be valid base64 images.",
    },
  },
  description: {
    type: String,
    required: false,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  comments: [
    {
       _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
