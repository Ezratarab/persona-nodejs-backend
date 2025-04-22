const express = require("express");
const router = express.Router();
const UserController = require("../controllers/controller");
const multer = require("multer");
const uploadText = multer();

const userController = new UserController(); 

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
router.get("/getall", userController.getAll.bind(userController));
router.post("/signup", uploadText.none(), userController.signup.bind(userController));
router.get("/aa", userController.authenticateAccessToken.bind(userController));
router.post('/login', uploadText.none(), userController.login.bind(userController));
module.exports = router;