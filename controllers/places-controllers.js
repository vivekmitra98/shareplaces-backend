const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const fs = require("fs");

const HttpError = require("../models/http-error");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.placeId;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    next(
      new HttpError(
        "Something went wrong! Could not find place. Please try again.",
        500
      )
    );
    return;
  }

  if (!place) {
    next(new HttpError("No place found for the provided id.", 404));
    return;
  }

  res.status(200);
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.userId;

  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (error) {
    next(
      new HttpError(
        "Something went wrong! Could not find places. Please try again.",
        500
      )
    );
    return;
  }

  if (places.length === 0) {
    next(new HttpError("No places found for the provided user id.", 404));
    return;
  }

  places = places.map((place) => place.toObject({ getters: true }));

  res.status(200);
  res.json({ places: places });
};

const createPlace = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    next(new HttpError("Invalid inputs! Please check your data.", 422));
    return;
  }

  const { title, description, address } = req.body;
  const creator = req.userData.userId;

  let coordinates;
  try {
    coordinates = await getCoordinatesForAddress(address);
  } catch (error) {
    next(error);
    return;
  }

  const newPlace = new Place({
    image: req.file.path,
    title: title,
    description: description,
    address: address,
    creator: creator,
    location: coordinates,
  });

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    next(new HttpError("Place creation failed! Please try again.", 500));
    return;
  }

  if (!user) {
    next(
      new HttpError(
        "Could not create place!  There is no user with the provided user id.",
        404
      )
    );
    return;
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await newPlace.save({ session: session });
    user.places.push(newPlace);
    await user.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    console.log(err.message);
    next(new HttpError("Place creation failed! Please try again.", 500));
    return;
  }

  res.status(201);
  res.json({ place: newPlace.toObject({ getters: true }) });
};

const updatePlace = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    next(new HttpError("Invalid inputs! Please check your data.", 422));
    return;
  }

  const placeId = req.params.placeId;
  const { title, description } = req.body;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    next(new HttpError("Place updatation failed! Please try again.", 500));
    return;
  }

  if (place.creator.toString() !== req.userData.userId) {
    next(new HttpError("You are not authorized for this action.", 401));
    return;
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    next(new HttpError("Place updatation failed! Please try again.", 500));
    return;
  }

  res.status(200);
  res.json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.placeId;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    next(new HttpError("Place deletion failed! Please try again.", 500));
    return;
  }

  if (!place) {
    next(new HttpError("No place found for the provided id.", 404));
    return;
  }

  if (place.creator.id !== req.userData.userId) {
    next(new HttpError("You are not authorized for this action.", 401));
    return;
  }

  const imagePath = place.image;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await place.remove({ session: session });
    place.creator.places.pull(place);
    await place.creator.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    next(new HttpError("Place deletion failed! Please try again.", 500));
    return;
  }

  fs.unlink(imagePath, (err) => {
    if (err) {
      console.log(err);
    }
  });

  res.status(200);
  res.json({ place: place.toObject({ getters: true }) });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
