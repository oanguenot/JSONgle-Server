const bunyan = require("bunyan");
const log = bunyan.createLogger({ name: "webrtc-signaling" });

exports.info = (message, data) => {
    if (data) {
        log.info(message, data);
    } else {
        log.info(message);
    }
};

exports.debug = (message, data) => {
    if (data) {
        log.debug(message, data);
    } else {
        log.debug(message);
    }
}

exports.warning = (message, data) => {
    if (data) {
        log.warn(message, data);
    } else {
        log.warn(message);
    }
}

exports.error = (message, data) => {
    if (data) {
        log.error(message, data);
    } else {
        log.error(message);
    }
}

exports.setLevelTo = (level) => {
    log.debug("Set log level to", { 'level': level });
    log.level(level);
    return log.level();
}

exports.getLogLevel = () => {
    return log.level();
}