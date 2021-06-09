const client = require('prom-client');
const ResponseTime = require('response-time');

let registry = null;

var metricsGetsCounter = new client.Counter({
  name: 'jsonglesig_metrics_requests_total',
  help: 'number of GET /metrics requests',
});

var numOfRequests = numOfRequests = new client.Counter({
  name: 'jsonglesig_all_requests_total',
  help: 'Number of requests made',
  labelNames: ['method']
});

var pathsTaken = new client.Counter({
  name: 'jsonglesig_all_paths_requests',
  help: 'Paths taken in the app',
  labelNames: ['path']
});

var responses = new client.Summary({
  name: 'jsonglesig_response_time_ms',
  help: 'Response time in millis',
  labelNames: ['method', 'path', 'status']
});

var users = new client.Gauge({
  name: 'jsonglesig_users_count',
  help: 'Number of simultaneous users',
  labelNames: ['users']
});
users.set(0);

var rooms = new client.Gauge({
  name: 'jsonglesig_rooms_count',
  help: 'Number of existing rooms',
  labelNames: ['rooms']
});
rooms.set(0);

exports.collect = () => {
  const collectDefaultMetrics = client.collectDefaultMetrics;
  const Registry = client.Registry;
  registry = new Registry();
  collectDefaultMetrics({ registry });
}

exports.grab = async () => {
  return await client.register.metrics();;
}

exports.incCounter = () => {
  metricsGetsCounter.inc();
}

exports.getContentType = () => {
  client.register.contentType;
}

exports.requestCounters = (req, res, next) => {
  if (req.path != '/metrics') {
    numOfRequests.inc({ method: req.method });
    pathsTaken.inc({ path: req.path });
  }
  next();
}

exports.responseCounters = ResponseTime((req, res, time) => {
  if (req.url != '/metrics') {
    responses.labels(req.method, req.url, res.statusCode).observe(time);
  }
});

// Reset all specific counters
exports.resetAllCustomMetrics = () => {
  this.resetRoomsCounter();
  this.resetUsersCounter();
}

// Users counters
exports.resetUsersCounter = () => {
  users.set(0);
}

exports.addUsersCounter = () => {
  users.inc(1);
}

exports.minusUsersCounter = () => {
  users.dec(1);
}

// Rooms counters
exports.resetRoomsCounter = () => {
  rooms.set(0);
}

exports.addRoomsCounter = () => {
  rooms.inc(1);
}

exports.minusRoomsCounter = () => {
  rooms.dec(1);
}

