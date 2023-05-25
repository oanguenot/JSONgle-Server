const { setLevelTo, getLogLevel } = require("../services/logger");
const package = require('../../package.json');
const { CONFIG } = require("../services/config");
const {grab} = require("../services/prom");
const {getUptTime} = require("../helpers/common");
const {computeDisk, computeMemory, computeCPU, computeUptime, computeSystem} = require("../helpers/metrics");

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
   * Server Health
   * Return OK to indicate it works. Content is optional
   */
  app.get('/health', async (req, res) => {
    res.status(200).json({ "status": "OK" });
  });

  /**
   * Tests
   * Check that the server is able to do requests
   * Accepted properties:
   * - 'score': (Number) Score obtained from 0 to 100
   * - 'executionTime': (Number) Duration in ms to pass all tests (optional)
   */
  app.get('/tests', (req, res) => {
    if(io.engine) {
      res.status(200).json({score: 100, executionTime: 1});
    }
  });

  /**
   * Usage
   * Get usage from prometheus
   * Transform to JSON
   * Avoid any technical, node and process stats
   * Accepted properties (at least)
   * - 'users': (Number) Add 1 to each time a user connects
   * - 'conferences' (Number) Add 1 each time a conference or a room is created
   * - 'traffic' (Number) count the number of bytes IN+OUT
   * - 'sent': (Number) count the number of bytes sent to the users
   * - 'received': (Number) count the number of bytes received from the users
   * - 'duration': (Number) sum the total number of seconds for each user connected
   */
  app.get('/stats', async (req, res) => {
    const stats = await grab();
    const filteredStats = stats.split("\n").filter(line => (line.length > 0 && !line.startsWith("#") && !line.startsWith("technical_") && !line.startsWith("nodejs_") && !line.startsWith("process_")));
    const JSONStats = {};
    filteredStats.forEach(stat => {
      const values = stat.split(' ');
      if (values.length === 2) {
        JSONStats[values[0]] = Number(values[1]);
      }
    });

    res.status(200).json(JSONStats);
  });

  /**
   * Healthcheck
   * Accepted properties (at least)
   * - 'freeMemory': (Number) percent of free memory of the system
   * - 'freeCPU': (Number) percent of free CPU of the system
   * - 'freeDisk': (Number) percent of free Disk of the system
   * - 'uptime': (Number) Timestamp in ms of the system's start (starting 1970)
   * - 'executionTime': (Number) Duration in ms for executing the healthcheck
   */
  app.get('/telemetry', async (req, res) => {
      try {
        const startTime = Date.now();
        const data = {};
        data.memoryFree = computeMemory();
        data.diskFree = await computeDisk();
        data.cpuFree = await computeCPU();
        data.uptime = computeUptime();
        data.executionTime = Date.now() - startTime;
        data.system = computeSystem();
        res.status(200).json(data);
      } catch (err) {
        res.status(400).json({
          "errorCode": 400001,
          "errorMsg": "can't get the health measure"
        })
      }


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
