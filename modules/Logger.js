const bunyan = require("bunyan");
const log = bunyan.createLogger({ name: "webrtc-signaling" });

exports.logInfo = (message, data) => {
    log.info(message, data);
};
