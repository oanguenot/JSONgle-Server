let config_data = null;

module.exports = function () {
  // if the static data was already set. return it
  if (config_data != null && config_data != undefined) {
    return config_data;
  }

  config_data = require.main.require('./config/config.default.json') || {};

  //LOAD JSON
  if (process.env.NODE_ENV === undefined || process.env.NODE_ENV == null || process.env.NODE_ENV === 'development') {
    config_data = require.main.require('./config/config.development.json');
  } else if (process.env.NODE_ENV === 'production') {
    config_data = require('./config/config.production.json');
  }

  //LOAD FROM ENV VARIABLES
  config_data.MAX_CONCURRENT_CLIENTS = process.env.MAX_CONCURRENT_CLIENTS;

  return config_data;
}