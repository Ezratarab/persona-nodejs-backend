const express = require("express");
const { connectDB } = require("./DBServers/mongoDB.js");
const routes = require("./routes/basicRoutes.js");
const cors = require("cors");
const { getRedisClient } = require("./DBServers/redis.js");
const UserController = require("./controllers/controller");
const cookieParser = require("cookie-parser");

const app = express();
const port = 9000;

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })
);
app.use(express.static("public"));

async function startServer() {
  try {
    const client = await getRedisClient();
    const userController = new UserController(client);
    const userRoutes = routes(userController);
    app.use("/user", userRoutes);

    await connectDB();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
  });
});
