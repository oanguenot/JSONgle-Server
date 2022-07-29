const { setLevelTo, getLogLevel } = require("../services/logger");
const package = require('../../package.json');
const { CONFIG } = require("../services/config");

module.exports = (app, q) => {

  /**
   * Server About
   * Return the name, version and description of the server
   */
  app.get('/about', async (req, res) => {
    res.status(200).json({
      name: package.name,
      version: package.version,
      description: package.description,
      configuration: {
        backendServerURL: CONFIG().backendServerUrl,
      }
    });
  });

  /**
   * Server Ping
   * Return OK to indicate it works.
   */
  app.get('/ping', async (req, res) => {
    res.status(200).json({ "status": "OK" });
  });

  /**
   * Servers log levels
   * Change the log level live using an API
   */
  app.put('/logs/levels', (req, res) => {
    const level = req.body.level;
    const oldLevel = getLogLevel();
    if (level) {
      const newLevel = setLevelTo(level);
      if (newLevel === level) {
        res.status(200).json({ "level": newLevel, "was": oldLevel });
      } else {
        res.status(400).json({
          "errorCode": 400001,
          "errorMsg": "value provided is not accepted. Should be 'trace', 'debug', 'info', 'warn', 'error' or 'fatal'"
        })
      }
    }
  });

  /**
   * Servers logs
   * Download the latest log files
   */
  app.get('/logs', (req, res) => {
    res.download(CONFIG().logPath, function(err) {
      if(err) {
        console.log(err);
      }
    });
  });
}
