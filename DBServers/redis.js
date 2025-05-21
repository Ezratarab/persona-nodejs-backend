const redis = require("redis");

let client;
let isConnecting = false;

async function getRedisClient() {
  if (client && client.isOpen) return client;

  if (!isConnecting) {
    isConnecting = true;
    client = redis.createClient();

    client.on("error", (err) => {
      console.error("❌ Redis client error:", err);
    });

    await client.connect();
    console.log("✅ Connected to Redis!");
    await client.set("key", "value");
    console.log("🗝️ Key 'key' set to 'value' in Redis");
  }

  return client;
}

module.exports = { getRedisClient };
