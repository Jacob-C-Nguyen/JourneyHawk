// app.config.js — replaces app.json, reads secrets from .env
// To use local backend:  API_URL=http://192.168.x.x:3000/api npx expo start
// To use production:     API_URL=https://journeyhawk-production.up.railway.app/api npx expo start
// Or set API_URL in a .env file at the project root

const appJson = require('./app.json');

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

export default {
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    config: {
      googleMapsApiKey,
    },
  },
  android: {
    ...appJson.expo.android,
    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  extra: {
    apiUrl: process.env.API_URL || 'https://journeyhawk-backend.onrender.com/api',
    eas: {
      projectId: '4511ea27-3c63-4f1d-baa8-b389ec5299a1',
    },
  },
};
