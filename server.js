// npx nodemon .\server.js

const express = require("express");
const { connectDB } = require("./DBServers/mongoDB.js");
const routes = require("./routes/basicRoutes.js");
const cors = require("cors");
const client = require("./DBServers/redis.js");
const app = express();
const port = 9000;
app.use(express.json()); 
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })
);
app.use(express.static("public"));
app.use("/user", routes);
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

//app.use(userController.authenticateAccessToken);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ message: err.message });
});
