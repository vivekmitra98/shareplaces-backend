const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/places", placesRoutes);

app.use("/api/users", usersRoutes);

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  next(new HttpError("Could not find this route.", 404));
});

app.use((err, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (error) => {
      if (error) {
        console.log(error);
      }
    });
  }

  if (res.headerSent) {
    next(err);
    return;
  }

  res.status(err.code || 500);
  res.json({ message: err.message || "Something went wrong!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.corkr.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(5000, () => {
      console.log("Backend server running.");
    });
  })
  .catch((error) => {
    console.log(error);
  });
