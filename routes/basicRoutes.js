const express = require("express");
const router = express.Router();
const userController = require("../controllers/controller");
const multer = require("multer");
const uploadText = multer();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});
const uploadFile = multer({ storage: storage });
router.get("/getall", userController.getAll);
router.post("/signup", uploadText.none(), userController.signup);
router.get("/", userController.simple);
router.get("/users", userController.allUsers);
router.get("/aa", userController.authenticateAccessToken);
router.post("/login", uploadText.none(), userController.login);
module.exports = router;
