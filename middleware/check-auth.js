const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

const PRIVATE_KEY = process.env.PRIVATE_KEY_FOR_TOKEN_GENERATION;

const checkAuth = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("Authentication failed!");
    }
    const decodedToken = jwt.verify(token, PRIVATE_KEY);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (error) {
    next(new HttpError("Authentication failed!", 403));
    return;
  }
};

module.exports = checkAuth;
