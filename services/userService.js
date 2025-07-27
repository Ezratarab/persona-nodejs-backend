const User = require("../models/userM");
const Post = require("../models/postM");
const redis = require("redis");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class UserService {
  constructor(redisClient) {
    this.client = redisClient;
    if (this.client && this.client.isOpen !== undefined) {
      console.log("✅ [UserService] Redis client is open:", this.client.isOpen);
    } else {
      console.log("❌ [UserService] Redis client is undefined or not ready!");
    }
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

  async addPostToUser(postData) {
    try {
      const newPost = await Post.create(postData);
      console.log("---------NEW POST------------");
      console.log(newPost.author.username);
      console.log(newPost.createdAt);
      await User.findByIdAndUpdate(postData.author._id, {
        $push: { posts: newPost._id },
      });
      return newPost;
    } catch (err) {
      console.error("Error adding post to user:", err);
      throw err;
    }
  }

  async likePost(postId, userLiked) {
    try {
      const post = await Post.findById(postId);
      if (!post.likes) {
        post.likes = [];
      }
      const userIdStr = userLiked._id.toString();
      const alreadyLiked = post.likes.some((id) => id.toString() === userIdStr);

      if (alreadyLiked) {
        post.likes = post.likes.filter((id) => id.toString() !== userIdStr);
      } else {
        post.likes.push(userLiked._id);
      }

      await post.save();
      return post;
    } catch (error) {
      console.error("Error adding like to post:", error);
      throw error;
    }
  }

  async deleteLikeFromPost(postId, userLiked) {
    try {
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $pull: { likes: userLiked._id } },
        { new: true }
      );
      return updatedPost;
    } catch (error) {
      console.error("Error deleting like from post:", error);
      throw error;
    }
  }
  async addCommentToPost(postId, text, responder) {
    try {
      const comment = { user: responder, text: text };
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $push: {
            comments: {
              $each: [comment],
              $position: 0,
            },
          },
        },
        { new: true }
      );
      return updatedPost;
    } catch (error) {
      console.error("Error adding comment to post:", error);
      throw error;
    }
  }
  async deleteCommentFromPost(postId, commentId) {
    try {
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $pull: {
            comments: { _id: commentId },
          },
        },
        { new: true }
      );

      return updatedPost;
    } catch (error) {
      console.error("Error deleting comment from post:", error);
      throw error;
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
    console.log("ADDED TO BLACKLIST");
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
      console.log("ADDED TOKENS TO BLACKLIST");
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
    try {
      console.log("isTokenRevoked jti:", jti, "type:", typeof jti);
      const value = await this.client.get(jti);
      return value === "revoked";
    } catch (err) {
      throw err;
    }
  }

  async checkBlacklistForRefreshToken(token) {
    if (await this.isTokenRevoked(token.jti))
      throw new Error("Token has been revoked");
  }
  async checkBlacklistForAccessToken(token) {
    if (await this.isTokenRevoked(token.jti))
      throw new Error(process.env.TOKEN_EXPIRED_ERROR);
  }

  async authenticateAccessToken(token) {
    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      await this.checkBlacklistForAccessToken(decodedToken);

      const authenticatedUser = await User.findOne({
        username: decodedToken.name,
      });

      if (!authenticatedUser) throw new Error("User not found");
      console.log("all ok------------");
      return authenticatedUser;
    } catch (error) {
      throw new Error(error.message || "Invalid token");
    }
  }

  async authenticateRefreshToken(token) {
    try {
      const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
      console.log("decoded:", decodedToken);
      await this.checkBlacklistForRefreshToken(decodedToken);
      const authenticatedUser = await User.findOne({
        username: decodedToken.name,
      });
      if (!authenticatedUser) throw new Error("User not found");
      return { authenticatedUser, decodedToken };
    } catch (error) {
      throw new Error(error.message || "Invalid token");
    }
  }
  ///////////////////////////לסדר את הפונקציות שיעבדו עם הטוקן
  async refreshToken(refreshToken) {
    try {
      console.log("\nTrying to authenticate refresh token..\n");
      const { authenticatedUser, decodedToken } =
        await this.authenticateRefreshToken(refreshToken);
      console.log("refresh token still valid :)");

      const cooldownKey = `cooldown:${decodedToken.jti}`;
      const lastRefresh = await this.client.get(cooldownKey);

      const now = Date.now();
      const cooldownTime = parseInt(process.env.REFRESH_COOLDOWN_MS, 10);
      if (isNaN(cooldownTime)) {
        throw new Error("Invalid cooldown time in environment variable");
      }
      if (lastRefresh && now - parseInt(lastRefresh) < cooldownTime) {
        throw new Error(
          "Refresh token called too frequently. Try again later."
        );
      }

      await this.client.set(cooldownKey, now.toString(), {
        EX: Math.max(1, Math.floor(cooldownTime / 1000)),
      });
      console.log("ADDED PREVIOS REFRESH-TOKEN TO BLACKLIST: ", refreshToken);
      await this.addToBlacklist(decodedToken.jti, decodedToken.exp);

      const tokenPayload = this.buildTokenPayload(authenticatedUser);
      const newAccessToken = this.generateAccessToken(tokenPayload);
      const newRefreshToken = this.generateRefreshToken(tokenPayload);
      console.log("NEW REFRESH-TOKEN: ", newRefreshToken);
      return {
        newAccessToken: newAccessToken,
        newRefreshToken: newRefreshToken,
      };
    } catch (error) {
      console.log(error);
      throw new Error(error.message || "Invalid token");
    }
  }

  async getUser(username) {
    try {
      console.log("1");
      const user = await User.findOne({ username })
        .populate({
          path: "posts",
          select: "photos",
        })
        .lean();
      console.log("2");
      if (user?.posts) {
        user.posts.forEach((post) => {
          post.photos = post.photos.map((photo) => photo);
        });
      }
      console.log("3");
      return user;
    } catch (error) {
      throw new Error(error.message || "User not found");
    }
  }

  async getPost(postId) {
    try {
      const post = await Post.findById(postId)
        .populate("author", "username profilePhoto")
        .populate("comments.user", "username profilePhoto")
        .populate("likes", "username")
        .lean();
      post.photos = post.photos.map((photo) => photo);

      return post;
    } catch (error) {
      throw new Error(error.message || "Didn't find post");
    }
  }

  async getAllUser() {
    try {
      const users = await User.find();
      const filteredUsers = users.map((user) => ({
        username: user.username,
        profilePhoto: user.profilePhoto,
      }));
      return filteredUsers;
    } catch (error) {
      throw new Error(error.message || "Didnt found users");
    }
  }
}

module.exports = UserService;
