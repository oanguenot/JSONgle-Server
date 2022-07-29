const bunyan = require("bunyan");
const { CONFIG } = require("./config");

let log = null;

exports.createLogger = () => {
    log = bunyan.createLogger({
        name: "zanalys-server",
        streams: [
            {
                name: 'console',
                level: CONFIG().logDefaultLevel || 'warn',
                stream: process.stdout,
                type: 'stream',
            },
            {
                name: 'file',
                type: 'rotating-file',
                level: 'debug',
                path: CONFIG().logPath || '/tmp/zanalys-server.log',
                period: CONFIG().logFilePeriod || '1d',   // daily rotation
                count: CONFIG().logFilesNumber || 3,       // keep 3 back copies
            }
        ]
    });
}

exports.info = (message, data) => {
    if (data) {
        log.info(message, data);
    } else {
        log.info(obfuscateMessage(message));
    }
};

exports.debug = (message, data) => {
    if (data) {
        log.debug(message, data);
    } else {
        log.debug(obfuscateMessage(message));
    }
}

exports.warning = (message, data) => {
    if (data) {
        log.warn(message, data);
    } else {
        log.warn(obfuscateMessage(message));
    }
}

exports.error = (message, data) => {
    if (data) {
        log.error(message, data);
    } else {
        log.error(obfuscateMessage(message));
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

const obfuscateMessage = (logMessage) => {
    if(!logMessage) return;

    const copyMessage = JSON.parse(JSON.stringify(logMessage));

    if("message" in copyMessage) {
        const { message } = copyMessage;
        if("jsongle" in message ) {
            const { jsongle } = message;
            if("description" in jsongle) {
                const { description } = jsongle;
                if ("dn" in description) {
                    description.dn = obfuscate(description.dn);
                }
                if ("member" in description) {
                    const {member} = description;
                    member.dn = obfuscate(member.dn);
                }
                if ("members" in description) {
                    const {members} = description;
                    members.forEach((member) => member.dn = obfuscate(member.dn));
                }
                if ("content" in description) {
                    description.content = obfuscate(description.content);
                }
                if ("additionalContent" in description) {
                    if (typeof description.additionalContent === "object") {
                        if (Array.isArray(description.additionalContent)) {
                            description.additionalContent = "[######]";
                        } else {
                            description.additionalContent = "{###: ######}";
                        }
                    } else {
                        description.additionalContent = "######";
                    }
                }
            }
        }
    }
    return copyMessage;
}

const obfuscate = (id) => {
    if (!id) {
        return "##";
    }
    if (id.length > 12) {
        return `${id.substring(0, 5)}#####${id.substring(id.length - 5)}`;
    } if (id.length > 6)  {
        return `${id.substring(0, 2)}###${id.substring(id.length - 2)}`;
    }
    return "####";
}
