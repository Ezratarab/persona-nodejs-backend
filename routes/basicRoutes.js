const express = require("express");
const router = express.Router();
const UserController = require("../controllers/controller");
const multer = require("multer");

const userController = new UserController();

const uploadFile = multer({ storage: multer.memoryStorage() });
const uploadText = multer(); 

router.get("/getall", userController.getAll.bind(userController));
router.post("/signup", uploadFile.single("profilePhoto"), userController.signup.bind(userController));
router.get("/aa", userController.authenticateAccessToken.bind(userController));
router.post("/login", uploadText.none(), userController.login.bind(userController));
router.get("/users/:username", uploadText.none(), userController.getUser.bind(userController));

module.exports = router;
