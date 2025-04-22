const mongoose = require("mongoose");

const uri =
  "mongodb+srv://ezratarab:IhvIerqqF5RIVoH4@cluster0.mepet.mongodb.net/persona?retryWrites=true&w=majority&appName=Cluster0";

async function connectDB() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); 
  }
}

module.exports = { mongoose, connectDB };
