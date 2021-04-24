const client = require('prom-client');
const ResponseTime = require('response-time');

let registry = null;

var metricsGetsCounter = new client.Counter({
  name: 'jsongleserver_total_metrics_requests',
  help: 'number of GET /metrics requests',
});

var numOfRequests = numOfRequests = new client.Counter({
  name: 'jsongleserver_num_requests',
  help: 'Number of requests made',
  labelNames: ['method']
});

var pathsTaken = new client.Counter({
  name: 'jsongleserver_paths_requests',
  help: 'Paths taken in the app',
  labelNames: ['path']
});

var responses = new client.Summary({
  name: 'jsongleserver_response_time_ms',
  help: 'Response time in millis',
  labelNames: ['method', 'path', 'status']
})

exports.collect = () => {
  console.log("collect default metrics")
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