module.exports = (app, q) => {

  app.get('/about', async (req, res) => {
    res.status(200).json({ name: 'jsongle-server', version: '1.0', description: 'JSONgle Server for WebRTC signaling protocol' })
  });

  app.get('/ping', async (req, res) => {
    res.status(200).json({ "status": "OK" })
  });

  app.put('/logs/levels', () => {
    res.status(200).json({ "console": "debug" })
  });
}