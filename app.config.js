const config = require("./app.json");

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBRM_T7GtQ8JROceC_Gm0qRVjgxNh2Fxr4";

module.exports = ({ config: expoConfig }) => {
  return {
    ...config.expo,
    ios: {
      ...config.expo.ios,
      config: {
        ...config.expo.ios?.config,
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      ...config.expo.android,
      config: {
        ...config.expo.android?.config,
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
    },
  };
};
