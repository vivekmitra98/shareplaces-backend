const fetch = require("node-fetch");

const HttpError = require("../models/http-error");

const API_KEY = process.env.OPENLAYERS_API_KEY;

const getCoordinatesForAddress = async (address) => {
  const response = await fetch(
    `http://api.positionstack.com/v1/forward?access_key=${API_KEY}&query=${address}`
  );
  const data = await response.json();

  if (data.error) {
    throw new HttpError("Could not find location for provided address.", 422);
  }

  const coordinates = {
    lat: data.data[0].latitude,
    lng: data.data[0].longitude,
  };

  return coordinates;
};

module.exports = getCoordinatesForAddress;
