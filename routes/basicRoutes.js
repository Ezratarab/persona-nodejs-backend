// routes/basicRoutes.js
const express = require("express");
const multer = require("multer");

module.exports = function (userController) {
  const router = express.Router();

  const uploadFile = multer({ storage: multer.memoryStorage() });
  const uploadText = multer();

  router.post(
    "/signup",
    uploadFile.single("profilePhoto"),
    userController.signup.bind(userController)
  );
  router.post(
    "/login",
    uploadText.none(),
    userController.login.bind(userController)
  );

  //router.use(userController.authenticateAccessToken.bind(userController));

  router.get(
    "/users/:username",
    uploadText.none(),
    userController.getUser.bind(userController)
  );
  router.post(
    "/logout",
    uploadText.none(),
    userController.logout.bind(userController)
  );
  router.post(
    "/post",
    uploadFile.array("profilePhotos"),
    userController.uploadPost.bind(userController)
  );

  return router;
};
