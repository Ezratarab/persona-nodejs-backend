const express = require("express");
const router = express.Router();
const UserController = require("../controllers/controller");
const multer = require("multer");

const userController = new UserController();

const uploadFile = multer({ storage: multer.memoryStorage() });
const uploadText = multer(); 
router.post("/signup", uploadFile.single("profilePhoto"), userController.signup.bind(userController));
router.post("/login", uploadText.none(), userController.login.bind(userController));
router.use(userController.authenticateAccessToken.bind(userController));
router.get("/users/:username", uploadText.none(), userController.getUser.bind(userController));

module.exports = router;
