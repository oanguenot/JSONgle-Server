const { generateNewId } = require("./common");

const JSONGLE_MESSAGE_TYPE = {
  HELLO: 'session-hello',
  REGISTER_INFO: 'register-info',
};

exports.sessionHello = (serverId, serverVersion, serverDescription) => (
  {
    id: generateNewId(),
    from: serverId,
    to: `anonymous_<${generateNewId()}>`,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.HELLO,
      description: {
        version: serverVersion,
        sn: serverId,
        info: serverDescription,
        connected: new Date().toJSON()
      },
    },
  }
);

exports.sessionRegisterFailed = (serverId, error) => (
  {
    id: generateNewId(),
    from: serverId,
    to: `anonymous_<${generateNewId()}>`,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.REGISTER_INFO,
      reason: 'registration-failed',
      description: {
        error
      },
    },
  }
);
