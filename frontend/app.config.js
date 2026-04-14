// app.config.js — replaces app.json, reads API_URL from .env
// To use local backend:  API_URL=http://192.168.x.x:3000/api npx expo start
// To use production:     API_URL=https://journeyhawk-production.up.railway.app/api npx expo start
// Or set API_URL in a .env file at the project root

const appJson = require('./app.json');

export default {
  ...appJson.expo,
  extra: {
    apiUrl: process.env.API_URL || 'enter your API URL in .env or as an environment variable',
  },
};
