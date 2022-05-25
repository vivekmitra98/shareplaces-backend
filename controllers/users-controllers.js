const { v4: uuid } = require("uuid");
const { validationResult } = require("express-validator");
const md5 = require("md5");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const PRIVATE_KEY = process.env.PRIVATE_KEY_FOR_TOKEN_GENERATION;

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, { password: 0 });
  } catch (error) {
    next(
      new HttpError(
        "Something went wrong! Could not find users. Please try again.",
        500
      )
    );
    return;
  }

  if (users.length === 0) {
    next(new HttpError("No users found in the database.", 404));
    return;
  }

  users = users.map((user) => user.toObject({ getters: true }));

  res.status(200);
  res.json({ users: users });
};

const signup = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    next(new HttpError("Invalid inputs! Please check your data.", 422));
    return;
  }

  const { username, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    next(new HttpError("Signing up failed! Please try again.", 500));
    return;
  }

  if (existingUser) {
    next(
      new HttpError(
        "E-Mail already exists! Please login or use some other e-mail address.",
        422
      )
    );
    return;
  }

  const hashedPassword = md5(password);

  const newUser = new User({
    image: req.file.path,
    name: username,
    email: email,
    password: hashedPassword,
    places: [],
  });

  try {
    await newUser.save();
  } catch (err) {
    next(new HttpError("Signing up failed! Please try again.", 500));
    return;
  }

  let token;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await newUser.save({ session: session });
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      PRIVATE_KEY,
      { expiresIn: "1h" }
    );
    await session.commitTransaction();
  } catch (err) {
    next(new HttpError("Signing up failed! Please try again.", 500));
    return;
  }

  res.status(201);
  res.json({ userId: newUser.id, email: newUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let user;
  try {
    user = await User.findOne({ email: email });
  } catch (error) {
    next(new HttpError("Logging in failed! Please try again.", 500));
    return;
  }

  const hashedPassword = md5(password);

  if (!user || user.password !== hashedPassword) {
    next(new HttpError("Invalid credentials! Could not log in.", 403));
    return;
  }

  let token;
  try {
    token = jwt.sign({ userId: user.id, email: user.email }, PRIVATE_KEY, {
      expiresIn: "1h",
    });
  } catch (err) {
    next(new HttpError("Logging in failed! Please try again. here", 500));
    return;
  }

  res.status(200);
  res.json({ userId: user.id, email: user.email, token: token });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
