const client = require('prom-client');
const ResponseTime = require('response-time');

let registry = null;

var metricsGetsCounter = new client.Counter({
  name: 'technical_metrics_requests_total',
  help: 'number of GET /metrics requests',
});

var numOfRequests = new client.Counter({
  name: 'technical_all_requests_total',
  help: 'Number of requests made',
  labelNames: ['method']
});

var pathsTaken = new client.Counter({
  name: 'technical_all_paths_requests',
  help: 'Paths taken in the app',
  labelNames: ['path']
});

var responses = new client.Summary({
  name: 'technical_response_time_ms',
  help: 'Response time in millis',
  labelNames: ['method', 'path', 'status']
});

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

/* -------------------------------------------------- Business Metrics for users -------------------------------------------------- */

/**
 * Count the number of users that are currently connected to the SIG server
 */
var users = new client.Gauge({
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
var users_total = new client.Counter({
  name: 'users_total',
  help: 'Total of users that have connected to the SIG server',
  labelNames: ['users_total']
});

exports.addUsersTotalCounter = () => {
  users_total.inc(1);
}

/* -------------------------------------------------- Business Metrics for Remote Consultation -------------------------------------------------- */

/**
 * Number of remote consultation rooms opened by doctors (live)
 */
var rooms = new client.Gauge({
  name: 'remote_consultations_opened_count',
  help: 'Number of simultaneous rooms opened for remote consultations for doctors',
  labelNames: ['remote_consultations_opened_count']
});
rooms.set(0);

exports.resetRoomsCounter = () => {
  rooms.set(0);
}

exports.addRoomsCounter = () => {
  rooms.inc(1);
}

exports.minusRoomsCounter = () => {
  rooms.dec(1);
}

/**
 * Number of remote consultations rooms opened in total
 */
var rooms_total = new client.Counter({
  name: 'remote_consultations_opened_total',
  help: 'Total of rooms opened for remote consultations',
  labelNames: ['remote_consultations_opened_total']
});

exports.addRoomsTotalCounter = () => {
  rooms_total.inc(1);
}

/**
 * Number of remote consultation in progress (live)
 */
var remoteConsultations = new client.Gauge({
  name: 'remote_consultations_count',
  help: 'Number of simultaneous remote consultations in progress',
  labelNames: ['remote_consultations_count']
});
remoteConsultations.set(0);

exports.resetRemoteConsultationsCounter = () => {
  remoteConsultations.set(0);
}

exports.addRemoteConsultationsCounter = () => {
  remoteConsultations.inc(1);
}

exports.minusRemoteConsultationsCounter = () => {
  remoteConsultations.dec(1);
}

var remoteConsultations_total = new client.Counter({
  name: 'remote_consultations_total',
  help: 'Total of remote consultations done',
  labelNames: ['remote_consultations_total']
});

exports.addRemoteConsultationsTotalCounter = () => {
  remoteConsultations_total.inc(1);
}

var remoteConsultations_duration = new client.Counter({
  name: 'remote_consultations_duration',
  help: 'Total duration of remote consultations done',
  labelNames: ['remote_consultations_duration']
});

exports.addRemoteConsultationsDurationCounter = (duration) => {
  remoteConsultations_duration.inc(duration);
}

var failed = new client.Counter({
  name: 'remote_consultations_failed_total',
  help: 'Total of sessions that did not succeed (ICE Failed)',
  labelNames: ['remote_consultations_failed_total'],
});

exports.addRemoteConsultationsFailed = () => {
  failed.inc(1);
}

/* -------------------------------------------------- Business Metrics for Discussion Groups -------------------------------------------------- */

/**
 * Number of groups opened (live)
 */
var groups = new client.Gauge({
  name: 'groups_opened_count',
  help: 'Number of active groups of discussion (with at least one member connected)',
  labelNames: ['groups_opened_count']
});
groups.set(0);

exports.resetMucCounter = () => {
  groups.set(0);
}

exports.addMucCounter = () => {
  groups.inc(1);
}

exports.minusMucCounter = () => {
  groups.dec(1);
}

/**
 * Number of groups opened in total
 */
var groups_total = new client.Counter({
  name: 'groups_total',
  help: 'Total of groups opened',
  labelNames: ['groups_total']
});

exports.addMucTotalCounter = () => {
  groups_total.inc(1);
}

var messages = new client.Counter({
  name: 'messages_total',
  help: 'Total of messages exchanged in groups',
  labelNames: ['messages_total']
});

exports.addMessagesCounter = () => {
  messages.inc(1);
}

var reactions = new client.Counter({
  name: 'reactions_total',
  help: 'Total of reactions exchanged in groups',
  labelNames: ['reactions_total']
});

exports.addReactionsCounter = () => {
  reactions.inc(1);
}

/* -------------------------------------------------- Business Metrics for Browsers -------------------------------------------------- */

var chrome = new client.Counter({
  name: 'browser_chrome_total',
  help: 'Total of sessions made using the Chrome or Chromium based browser',
  labelNames: ['browser_chrome_total'],
});

exports.addChrome = () => {
  chrome.inc(1);
}

var firefox = new client.Counter({
  name: 'browser_firefox_total',
  help: 'Total of sessions made using the Firefox browser',
  labelNames: ['browser_firefox_total'],
});

exports.addFirefox = () => {
  firefox.inc(1);
}

var safari = new client.Counter({
  name: 'browser_safari_total',
  help: 'Total of sessions made using the Safari browser',
  labelNames: ['browser_safari_total'],
});

exports.addSafari = () => {
  safari.inc(1);
}

var others = new client.Counter({
  name: 'browser_others_total',
  help: 'Total of sessions made using other browsers',
  labelNames: ['browser_others_total'],
});

exports.addOthers = () => {
  others.inc(1);
}

/* -------------------------------------------------- Business Metrics for System -------------------------------------------------- */

var ios = new client.Counter({
  name: 'system_ios_total',
  help: 'Total of sessions made on Iphone/Ipad',
  labelNames: ['system_ios_total'],
});

exports.addIOS = () => {
  ios.inc(1);
}

var android = new client.Counter({
  name: 'system_android_total',
  help: 'Total of sessions made on Android',
  labelNames: ['system_android_total'],
});

exports.addAndroid = () => {
  android.inc(1);
}

var windows = new client.Counter({
  name: 'system_windows_total',
  help: 'Total of sessions made on Windows',
  labelNames: ['system_windows_total'],
});

exports.addWindows = () => {
  windows.inc(1);
}

var macOs = new client.Counter({
  name: 'system_macos_total',
  help: 'Total of sessions made on MacOs',
  labelNames: ['system_macos_total'],
});

exports.addMacOS = () => {
  macOs.inc(1);
}

var otherOS = new client.Counter({
  name: 'system_others_total',
  help: 'Total of sessions made on other systems',
  labelNames: ['system_others_total'],
});

exports.addOtherOS = () => {
  otherOS.inc(1);
}

/* -------------------------------------------------- Business Metrics for Route -------------------------------------------------- */

var relay = new client.Counter({
  name: 'route_relay_total',
  help: 'Total of sessions done using the Turn server',
  labelNames: ['turn_relay_total'],
});

exports.addRelay = () => {
  relay.inc(1);
}

var direct = new client.Counter({
  name: 'route_direct_total',
  help: 'Total of sessions done without using the Turn server',
  labelNames: ['turn_relay_total'],
});

exports.addDirect = () => {
  direct.inc(1);
}

/* -------------------------------------------------- Business Metrics for MOS -------------------------------------------------- */

var excellent = new client.Counter({
  name: 'mos_excellent_total',
  help: 'Total of sessions having a MOS score > 4.2',
  labelNames: ['mos_excellent_total'],
});

exports.addExcellent = () => {
  excellent.inc(1);
}

var good = new client.Counter({
  name: 'mos_good_total',
  help: 'Total of sessions done having a MOS score > 4.0',
  labelNames: ['mos_good_total'],
});

exports.addGood = () => {
  good.inc(1);
}

var fair = new client.Counter({
  name: 'mos_fair_total',
  help: 'Total of sessions done having a MOS score > 3.6',
  labelNames: ['mos_fair_total'],
});

exports.addFair = () => {
  fair.inc(1);
}

var poor = new client.Counter({
  name: 'mos_poor_total',
  help: 'Total of sessions done having a MOS score > 3.2',
  labelNames: ['mos_poor_total'],
});

exports.addPoor = () => {
  poor.inc(1);
}

var bad = new client.Counter({
  name: 'mos_bad_total',
  help: 'Total of sessions done having a MOS score < 3.2',
  labelNames: ['mos_bad_total'],
});

exports.addBad = () => {
  bad.inc(1);
}

/* -------------------------------------------------- Others -------------------------------------------------- */

// Reset all specific gauges
exports.resetAllCustomMetrics = () => {
  this.resetRoomsCounter();
  this.resetUsersCounter();
  this.resetMucCounter();
  this.resetRemoteConsultationsCounter();
}
