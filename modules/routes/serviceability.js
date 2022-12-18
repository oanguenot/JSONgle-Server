const { setLevelTo, getLogLevel } = require("../services/logger");
const package = require('../../package.json');
const { CONFIG } = require("../services/config");
const {grab} = require("../services/prom");
const {getUptTime} = require("../helpers/common");

module.exports = (app, io) => {

  /**
   * Server About
   * Return the name, version and description of the server
   */
  app.get('/about', async (req, res) => {
    res.status(200).json({
      name: package.name,
      version: package.version,
      description: package.description,
      started: getUptTime().toJSON(),
      configuration: {
        restPort: CONFIG().restPort,
        wsPort: CONFIG().wsPort,
        backendServerURL: CONFIG().backendServerUrl ? CONFIG().backendServerURL : "",
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

  /**
   * Tests
   * Check that the server is able to do requests
   */
  app.get('/tests', (req, res) => {
    if(io.engine) {
      res.status(200).json({score: 100});
    }
  });

  /**
   * Usage
   * Get usage
   */
  app.get('/stats', async (req, res) => {
    const stats = await grab();
    const filteredStats = stats.split("\n").filter(line => (line.length > 0 && !line.startsWith("#") && !(line.startsWith("technical_"))));
    res.status(200).json(filteredStats);
  });
}
