// app.config.js — replaces app.json, reads API_URL from .env
// To use local backend:  API_URL=http://192.168.x.x:3000/api npx expo start
// To use production:     API_URL=https://journeyhawk-production.up.railway.app/api npx expo start
// Or set API_URL in a .env file at the project root

const appJson = require('./app.json');


//UPDATE the ip address inside the url with your LAN ip
//can be found with ipconfig on windows (or search up how to do it if your machine is different)
export default {
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra || {}),
    apiUrl: process.env.API_URL || 'http://192.168.86.38:3000/api',
    eas: {
      projectId: "a827226e-54cb-4693-bda5-dbaf38842f5b",
    },
  },
};

