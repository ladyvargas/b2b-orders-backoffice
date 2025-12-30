const axios = require("axios");

function client(baseURL, headers = {}) {
  return axios.create({
    baseURL,
    timeout: 5000,
    headers
  });
}

module.exports = { client };
