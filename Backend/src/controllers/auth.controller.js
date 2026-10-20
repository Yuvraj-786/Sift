const userModel = require("../models/user.model");
const tokenBlacklistModel = require("../models/blacklist.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function cookieOptions() {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  };
}

/**
 *
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */

async function registerUserController(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      message: "Please provide username, email and password",
    });
  }

  const isUserAlreadyExists = await userModel.findOne({
    // using $or we can give it conditions defined as objects and it returns if any one is true.
    $or: [{ username }, { email }],
  });

  /* 
        isUserAlreadyExists.username = username
    */

  if (isUserAlreadyExists) {
    return res.status(400).json({
      message: "Account already exists with email address or username",
    });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    username,
    email,
    password: hash,
  });

  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.cookie("token", token, cookieOptions());

  res.status(201).json({
    message: "User registerd successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */

async function loginUserController(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Please provide email and password",
    });
  }

  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.cookie("token", token, cookieOptions());

  res.status(200).json({
    message: "User loggedIn successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

/**
 *
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access Private
 */

async function logoutUserController(req, res) {
  const token = req.cookies.token;

  if (token) {
    await tokenBlacklistModel.create({ token });
  }
  res.clearCookie("token", cookieOptions());

  res.status(200).json({
    message: "User logged out successfully",
  });
}

/**
 *
 * @name getMeController
 * @description to access the user details to check if it is logged in or logged out.
 * @access Private
 */

async function getMeController(req, res) {
  const user = await userModel.findById(req.user.id);

  res.status(200).json({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

module.exports = {
  registerUserController,
  loginUserController,
  logoutUserController,
  getMeController,
};
