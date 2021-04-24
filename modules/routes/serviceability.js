const { setLevelTo, getLogLevel } = require("../services/logger");

module.exports = (app, q) => {

  app.get('/about', async (req, res) => {
    res.status(200).json({ name: 'jsongle-server', version: '1.0', description: 'JSONgle Server for WebRTC signaling protocol' })
  });

  app.get('/ping', async (req, res) => {
    res.status(200).json({ "status": "OK" })
  });

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
}