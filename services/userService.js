const User = require("../models/userM");
const Post = require("../models/postM");
const redis = require("redis");
const client = redis.createClient();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const jwt = require("jsonwebtoken");
require("dotenv").config();

const simple = (req, res) => {
  res.send("Hello from node js");
};

const encryptPassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.error("Error during encryption:", error);
    throw new Error("Failed to encrypt password");
  }
};

const signup = async (userData) => {
  try {
    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      throw new Error("Username already exists");
    }
    userData.password = await encryptPassword(userData.password);
    const user = new User(userData);
    const savedUser = await user.save();
    return savedUser;
  } catch (error) {
    throw new Error("Error adding user: " + error.message);
  }
};
const addPostToUser = async (userId, postDetails) => {
  try {
    const newPost = await Post.create({ ...postDetails, author: userId });

    await User.findByIdAndUpdate(userId, {
      $push: { posts: newPost._id },
    });
    console.log("Post added to user successfully!");
    return newPost;
  } catch (err) {
    console.error("Error adding post to user:", err);
    throw err;
  }
};

const getAll = async () => {
  try {
    const users = await User.find({});
    return users;
  } catch (err) {
    console.error("Error fetching users:", err);
    throw err;
  }
};
const login = async (username, password) => {
  const user = await User.findOne({ username: username });
  if (!user) {
    throw new Error("User not found");
  }
  console.log(user.password, password);
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Passwords do not match");
  }

  const tokenPayload = buildTokenPayload(user);
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  return { accessToken, refreshToken };
};
const buildTokenPayload = (user) => {
  const tokenPayload = {
    name: user.username,
    email: user.email,
    jti: uuidv4(),
  };
  return tokenPayload;
};
const addToBlacklist = async (jti, exp) => {
  const ttl = exp - Math.floor(Date.now() / 1000); // Calculate TTL

  if (ttl > 0) {
    try {
      if (typeof jti !== "string" || typeof ttl !== "number" || ttl <= 0) {
        throw new Error("Invalid arguments for blacklist");
      }

      await client.set(jti, "revoked", { EX: ttl });
      console.log(
        `Token with jti: ${jti} added to blacklist for ${ttl} seconds.`
      );
    } catch (err) {
      console.error("Error adding token to blacklist:", err);
    }
  } else {
    console.log("Token is already expired. No need to blacklist.");
  }
};

const logout = async (accessToken, refreshToken) => {
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

    await addToBlacklist(decodedAccess.jti, decodedAccess.exp);
    await addToBlacklist(decodedRefresh.jti, decodedRefresh.exp);

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: "Invalid tokens" });
  }
};

const generateAccessToken = (userData) => {
  if (!userData.jti) {
    throw new Error("jti is missing in token payload");
  }
  return jwt.sign(userData, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "30m",
  });
};

const generateRefreshToken = (userData) => {
  return jwt.sign(userData, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
};

function isTokenRevoked(jti) {
  return new Promise((resolve, reject) => {
    client.get(jti, (err, reply) => {
      if (err) {
        return reject(err);
      }
      resolve(reply === "revoked");
    });
  });
}

async function checkBlacklist(token) {
  const isRevoked = await isTokenRevoked(token.jti);
  if (isRevoked) {
    throw new Error("Token has been revoked");
  }
  return isRevoked;
}

const authenticateAccessToken = async (token) => {
  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    await checkBlacklist(decodedToken);
    const authenticatedUser = await User.findOne({
      username: decodedToken.username,
    });
    if (!authenticatedUser) {
      throw new Error("didnt found the user");
    }
    return authenticatedUser;
  } catch (error) {
    throw new Error(error.message || "Invalid token");
  }
};
const authenticateRefreshToken = async (token) => {
  try {
    await checkBlacklist(decodedToken);
  } catch (error) {
    throw new Error(error.message || "Invalid token");
  }
};
const refreshToken = async (refreshToken) => {
  try {
    const decodedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    authenticateRefreshToken(decodedToken);
    addToBlacklist(decodedToken.jti, decodedToken.exp);
    const user = await User.findOne({
      username: decodedToken.username,
    });
    if (!user) {
      throw new Error("didnt found the user");
    }
    const tokenPayload = buildTokenPayload(user);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    const newAccessToken = generateAccessToken(tokenPayload);
    return { newRefreshToken, newAccessToken };
  } catch (error) {
    throw new Error(error.message || "Invalid token");
  }
};

module.exports = {
  simple,
  signup,
  addPostToUser,
  getAll,
  login,
  generateAccessToken,
  generateRefreshToken,
  addToBlacklist,
  logout,
  isTokenRevoked,
  checkBlacklist,
  authenticateAccessToken,
  authenticateRefreshToken,
};
