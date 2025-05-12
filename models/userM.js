const mongoose = require("mongoose");
const validator = require("email-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, "Username is required!"],
    unique: true,
  },
  bio: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: [true, "Email is required!"],
    unique: true,
    index: true,
    validate: {
      validator: function (value) {
        return validator.validate(value);
      },
      message: "Please enter a valid email address.",
    },
  },
  password: {
    type: String,
    required: [true, "Password is required!"],
  },
  profilePhoto: {
    type: String,
    required: false,
    validate: {
      validator: function (value) {
        return /^data:image\/(jpeg|png|gif|webp);base64,/.test(value);
      },
      message: "Please provide a valid base64 image.",
    },
  },
  birthday: {
    type: Date,
    required: [true, "Birthday is required!"],
    validate: {
      validator: function (value) {
        const today = new Date();
        const age = today.getFullYear() - value.getFullYear();
        const monthDifference = today.getMonth() - value.getMonth();
        const dayDifference = today.getDate() - value.getDate();

        return (
          age > 18 ||
          (age === 18 &&
            (monthDifference > 0 ||
              (monthDifference === 0 && dayDifference >= 0)))
        );
      },
      message: "You must be at least 18 years old to register.",
    },
  },
  unit: {
    type: String,
    required: false,
  },
  team: {
    type: String,
    required: false,
  },
  releaseDay: {
    type: Date,
    required: false,
  },
  role: {
    type: String,
    required: false,
  },
  gender: {
    type: String,
    required: false,
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
});

const User = mongoose.model("User", userSchema);
module.exports = User;
