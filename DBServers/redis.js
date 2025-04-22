//to restart redis-server, open wsl in termoval and write command "redis-server" it should work

const redis = require("redis");
const client = redis.createClient();
client
  .connect()
  .then(() => console.log("Connected to Redis!"))
  .catch((error) => {
    console.error("Redis connection failed:", error);
    process.exit(1);
  });

client.on("connect", async () => {
  try {
    await client.set("key", "value");
    console.log("Key set in Redis");
  } catch (err) {
    console.error("Error setting key:", err);
  }
});

module.exports = client; 
