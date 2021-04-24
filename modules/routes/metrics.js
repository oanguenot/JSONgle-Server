const { incCounter, grab, getContentType } = require("../services/prom");

module.exports = (app, q) => {

  app.get('/metrics', async (req, res) => {
    incCounter();
    res.set('Content-Type', getContentType());
    res.end(await grab());
  });
}