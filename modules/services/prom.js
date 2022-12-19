const client = require('prom-client');
const ResponseTime = require('response-time');

let registry = null;

let metricsGetsCounter = new client.Counter({
  name: 'technical_metrics_requests_total',
  help: 'number of GET /metrics requests',
});

let numOfRequests = new client.Counter({
  name: 'technical_all_requests_total',
  help: 'Number of requests made',
  labelNames: ['method']
});

let pathsTaken = new client.Counter({
  name: 'technical_all_paths_requests',
  help: 'Paths taken in the app',
  labelNames: ['path']
});

let responses = new client.Summary({
  name: 'technical_response_time_ms',
  help: 'Response time in millis',
  labelNames: ['method', 'path', 'status']
});

exports.collect = () => {
  // const collectDefaultMetrics = client.collectDefaultMetrics;
  // const Registry = client.Registry;
  // registry = new Registry();
  // collectDefaultMetrics({ registry });
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

/* -------------------------------------------------- Business Metrics for users -------------------------------------------------- */

/**
 * Count the number of users that are currently connected to the SIG server
 */
let users = new client.Gauge({
  name: 'users_count',
  help: 'Number of simultaneous users that are currently connected to the SIG server',
  labelNames: ['users_count']
});
users.set(0);

exports.resetUsersCounter = () => {
  users.set(0);
}

exports.addUsersCounter = () => {
  users.inc(1);
}

exports.minusUsersCounter = () => {
  users.dec(1);
}

/**
 * Count the number of users that have connected to the SIG server
 */
let users_total = new client.Counter({
  name: 'users_total',
  help: 'Total of users that have connected to the SIG server',
  labelNames: ['users_total']
});

exports.addUsersTotalCounter = () => {
  users_total.inc(1);
}

/**
 * Count the number of minutes connected for all users to the SIG server
 */
let duration_total = new client.Counter({
  name: 'duration_total',
  help: 'Total of time connected for all users in minutes',
  labelNames: ['duration_total']
});

exports.addDurationTotalCounter = (minutes) => {
  duration_total.inc(minutes);
}

/* -------------------------------------------------- Business Metrics for traffic -------------------------------------------------- */

let recv_total = new client.Counter({
  name: 'recv_total',
  help: 'Total of MB received for all users',
  labelNames: ['recv_total']
});

exports.addReceivedTotalCounter = (MB) => {
  recv_total.inc(MB);
}

let sent_total = new client.Counter({
  name: 'sent_total',
  help: 'Total of MB sent for all users',
  labelNames: ['sent_total']
});

exports.addSentTotalCounter = (MB) => {
  sent_total.inc(MB);
}

/* -------------------------------------------------- Business Metrics for conferences endpoint -------------------------------------------------- */

/**
 * Number of conferences
 */
let conferences = new client.Gauge({
  name: 'conferences_count',
  help: 'Number of active conferences',
  labelNames: ['conferences_count']
});
conferences.set(0);

exports.resetConferencesCounter = () => {
  conferences.set(0);
}

exports.addConferencesCounter = () => {
  conferences.inc(1);
}

exports.minusConferencesCounter = () => {
  conferences.dec(1);
}

/**
 * Number of conferences opened in total
 */
let conferences_total = new client.Counter({
  name: 'conferences_total',
  help: 'Total of conferences created so far',
  labelNames: ['conferences_total']
});

exports.addConferencesTotalCounter = () => {
  conferences_total.inc(1);
}

/**
 * Number of p2p calls
 */
let p2p = new client.Gauge({
  name: 'p2p_count',
  help: 'Number of simultaneous p2p calls',
  labelNames: ['p2p_count']
});
p2p.set(0);

exports.resetP2PCounter = () => {
  p2p.set(0);
}

exports.addP2PCounter = () => {
  p2p.inc(1);
}

exports.minusP2PCounter = () => {
  p2p.dec(1);
}

let p2p_total = new client.Counter({
  name: 'p2p_total',
  help: 'Total of p2p done',
  labelNames: ['p2p_total']
});

exports.addP2PTotalCounter = () => {
  p2p_total.inc(1);
}

let p2p_duration_total = new client.Counter({
  name: 'p2p_duration_total',
  help: 'Total duration of p2p',
  labelNames: ['p2p_duration_total']
});

exports.addP2PDurationCounter = (duration) => {
  p2p_duration_total.inc(duration);
}

let p2p_failed = new client.Counter({
  name: 'p2p_failed_total',
  help: 'Total of sessions that did not succeed (ICE Failed)',
  labelNames: ['p2p_failed_total'],
});

exports.addP2PFailed = () => {
  p2p_failed.inc(1);
}

let messages = new client.Counter({
  name: 'messages_total',
  help: 'Total of messages exchanged in groups',
  labelNames: ['messages_total']
});

exports.addMessagesCounter = () => {
  messages.inc(1);
}

let reactions = new client.Counter({
  name: 'reactions_total',
  help: 'Total of reactions exchanged in groups',
  labelNames: ['reactions_total']
});

exports.addReactionsCounter = () => {
  reactions.inc(1);
}

/* -------------------------------------------------- Others -------------------------------------------------- */

// Reset all specific gauges
exports.resetAllCustomMetrics = () => {
  this.resetConferencesCounter();
  this.resetUsersCounter();
  this.resetP2PCounter();
  users_total.inc(0);
  conferences_total.inc(0);
  duration_total.inc(0);
  recv_total.inc(0);
  sent_total.inc(0);
  reactions.inc(0);
  messages.inc(0);
  p2p_total.inc(0);
  p2p_failed.inc(0);
}
