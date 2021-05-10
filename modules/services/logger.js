const bunyan = require("bunyan");

function messageSerializer(req) {
    return {
        from: req.from,
        to: req.to,
        action: req.jsongle ? req.jsongle.action : 'not-jongle'
    }
}


const log = bunyan.createLogger({
    name: "jsongle-server",
    serializers: {
        req: messageSerializer
    },
    streams: [
        {
            name: 'console',
            level: process.env.logDefaultLevel || 'warn',
            stream: process.stdout,
            type: 'stream',
        },
        {
            name: 'file',
            type: 'rotating-file',
            level: 'debug',
            path: process.env.logPath || '/tmp/jsongle-server.log',
            period: process.env.logFilePeriod || '1d',   // daily rotation
            count: process.env.logFilesNumber || 3,       // keep 3 back copies
        }]
});

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