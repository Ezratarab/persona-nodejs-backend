const redis = require("redis");

let client;
let isConnecting = false;

async function getRedisClient() {
  if (client && client.isOpen) return client;

  if (!isConnecting) {
    isConnecting = true;

    client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      },
    });

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
