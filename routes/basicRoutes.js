// routes/basicRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");

module.exports = function (userController) {
  const router = express.Router();

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "routes/uploads/");
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const name = file.fieldname + "-" + Date.now() + ext;
      cb(null, name);
    },
  });

  const uploadFile = multer({ storage: storage });

  router.post(
    "/signup",
    uploadFile.single("profilePhoto"),
    userController.signup.bind(userController)
  );
  router.post("/login", userController.login.bind(userController));

  //router.use(userController.authenticateAccessToken.bind(userController));

  router.get("/users/:username", userController.getUser.bind(userController));
  router.post("/logout", userController.logout.bind(userController));
  router.post(
    "/post",
    uploadFile.array("photos"),
    userController.uploadPost.bind(userController)
  );
  router.get("/allUsers", userController.getAllUsers.bind(userController));
  router.get("/post/:postId", userController.getPost.bind(userController));

  return router;
};
