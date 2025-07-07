// routes/basicRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");

module.exports = function (userController) {
  const router = express.Router();

  router.post("/signup", userController.signup.bind(userController));
  router.post("/login", userController.login.bind(userController));

  router.use(userController.authenticateAccessToken.bind(userController));
  ///לעשות חזרה על איך הכל עובד מבחינת הטוקנים, ואיך הריאקט לוקח את השם מהטוקן בעזרת הפיילואד ולסדר עוד את הפונקציות שיהיו יעילות יותר
  router.get("/users/:username", userController.getUser.bind(userController));
  router.post("/logout", userController.logout.bind(userController));
  router.post("/post", userController.uploadPost.bind(userController));
  router.get("/allUsers", userController.getAllUsers.bind(userController));
  router.get("/post/:postId", userController.getPost.bind(userController));
  router.post(
    "/post/:postId/like",
    userController.likePost.bind(userController)
  );

  return router;
};
