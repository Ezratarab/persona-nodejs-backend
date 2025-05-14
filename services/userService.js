const User = require("../models/userM");
const Post = require("../models/postM");
const redis = require("redis");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class UserService {
  constructor(redisClient) {
    this.client = redisClient || redis.createClient();
  }

  async simple(req, res) {
    res.send("Hello from node js");
  }

  async encryptPassword(password) {
    try {
      const saltRounds = 10;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error("Error during encryption:", error);
      throw new Error("Failed to encrypt password");
    }
  }

  async signup(userData) {
    try {
      const existingUser = await User.findOne({ username: userData.username });
      if (existingUser) throw new Error("Username already exists");

      userData.password = await this.encryptPassword(userData.password);
      const user = new User(userData);
      return await user.save();
    } catch (error) {
      throw new Error("Error adding user: " + error.message);
    }
  }

  async addPostToUser(userId, postDetails) {
    try {
      const newPost = await Post.create({ ...postDetails, author: userId });
      await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
      return newPost;
    } catch (err) {
      console.error("Error adding post to user:", err);
      throw err;
    }
  }

  async getAll() {
    try {
      return await User.find({});
    } catch (err) {
      console.error("Error fetching users:", err);
      throw err;
    }
  }

  async login(username, password) {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("Invalid username or password");
    }
    const tokenPayload = this.buildTokenPayload(user);
    return {
      accessToken: this.generateAccessToken(tokenPayload),
      refreshToken: this.generateRefreshToken(tokenPayload),
    };
  }

  buildTokenPayload(user) {
    return { name: user.username, email: user.email, jti: uuidv4() };
  }

  async addToBlacklist(jti, exp) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await this.client.set(jti, "revoked", { EX: ttl });
  }

  async logout(accessToken, refreshToken) {
    try {
      const decodedAccess = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET,
        { ignoreExpiration: true }
      );
      const decodedRefresh = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        { ignoreExpiration: true }
      );
      await this.addToBlacklist(decodedAccess.jti, decodedAccess.exp);
      await this.addToBlacklist(decodedRefresh.jti, decodedRefresh.exp);
      return { message: "Logged out successfully" };
    } catch (err) {
      throw new Error("Invalid tokens");
    }
  }

  generateAccessToken(userData) {
    return jwt.sign(userData, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "30m",
    });
  }

  generateRefreshToken(userData) {
    return jwt.sign(userData, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1d",
    });
  }

  async isTokenRevoked(jti) {
    return new Promise((resolve, reject) => {
      this.client.get(jti, (err, reply) =>
        err ? reject(err) : resolve(reply === "revoked")
      );
    });
  }

  async checkBlacklistForRefreshToken(token) {
    if (await this.isTokenRevoked(token.jti))
      throw new Error("Token has been revoked");
  }
  async checkBlacklistForAccessToken(token) {
    if (await this.isTokenRevoked(token.jti))
      throw new Error(process.env.ACCESS_TOKEN_EXPIRED_ERROR);
  }

  async authenticateAccessToken(token) {
    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      await this.checkBlacklistForAccessToken(decodedToken);
      const authenticatedUser = await User.findOne({
        username: decodedToken.name,
      });
      if (!authenticatedUser) throw new Error("User not found");
      return authenticatedUser;
    } catch (error) {
      throw new Error(error.message || "Invalid token");
    }
  }

  async authenticateRefreshToken(token) {
    await this.checkBlacklistForRefreshToken(token);
  }

  async refreshToken(refreshToken) {
    try {
      const decodedToken = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
  
      await this.authenticateRefreshToken(decodedToken); 
  
      const cooldownKey = `cooldown:${decodedToken.jti}`;
      const lastRefresh = await this.client.get(cooldownKey);
  
      const now = Date.now();
      const cooldownTime = process.env.REFRESH_COOLDOWN_MS;
  
      if (lastRefresh && now - parseInt(lastRefresh) < cooldownTime) {
        throw new Error("Refresh token called too frequently. Try again later.");
      }
      await this.client.set(cooldownKey, now.toString(), 'EX', cooldownTime / 1000);  
      await this.addToBlacklist(decodedToken.jti, decodedToken.exp);
      const user = await User.findOne({ username: decodedToken.name });
      if (!user) throw new Error("User not found");
  
      const tokenPayload = this.buildTokenPayload(user);
      return {
        newAccessToken: this.generateAccessToken(tokenPayload),
        newRefreshToken: this.generateRefreshToken(tokenPayload),
      };
    } catch (error) {
      throw new Error(error.message || "Invalid token");
    }
  }
  
  
  async getUser(username) {
    try {
      const user = await User.findOne({ username: username });
      console.log("User photo:", user.profilePhoto);

      return user;
    } catch (error) {
      throw new Error(error.message || "Didnt found user");
    }
  }
}

module.exports = UserService;
