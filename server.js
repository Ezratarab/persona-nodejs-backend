const express = require("express");
const mongoose = require("mongoose");
const routes = require("./routes/basicRoutes.js");
const cors = require("cors");
const app = express();
const port = 9022;
const uri =
  "mongodb+srv://ezratarab:IhvIerqqF5RIVoH4@cluster0.mepet.mongodb.net/persona?retryWrites=true&w=majority&appName=Cluster0";
const userController = require("./controllers/controller");
const redis = require("redis");

const client = redis.createClient();
client.connect().then(() => {
  console.log("Connected to Redis!!");
  module.exports = client;
}).catch((error) => {
  console.error("Redis connection failed:", error);
});
client.set('key', 'value')
  .then(() => console.log("Key set"))
  .catch(err => console.error("Error setting key:", err));

mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to Mongo!!");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log("Error connecting to DB!!", err);
  });
app.use(express.static("public"));
app.use(
  cors({
    origin: ["http://localhost:3000"],
    method: ["GET, POST", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
//app.use(userController.authenticateAccessToken);
app.use("/user", routes);
