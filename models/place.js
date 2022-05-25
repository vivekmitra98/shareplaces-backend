const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema({
  image: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, minlength: 5 },
  address: { type: String, required: true },
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
});

const Place = new mongoose.model("Place", placeSchema);

module.exports = Place;
