const { generateNewId } = require("./common");
const { JSONGLE_MESSAGE_TYPE, JSONGLE_IQ_ERROR_RESPONSE } = require('./helper');

exports.sessionHello = (serverId, serverVersion, serverDescription) => (
  {
    id: generateNewId(),
    from: serverId,
    to: `anonymous_<${generateNewId()}>`,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.SESSION_HELLO,
      description: {
        version: serverVersion,
        sn: serverId,
        info: serverDescription,
        connected: new Date().toJSON()
      },
    },
  }
);

exports.sessionJoined = (serverId, to, description) => (
  {
    id: generateNewId(),
    from: serverId,
    to: to || `anonymous_<${generateNewId()}>`,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.SESSIOn_JOINED,
      description,
    },
  }
);

exports.iqError = (from, to, transaction, query, description) => (
  {
    id: generateNewId(),
    from: from,
    to: to || `anonymous_<${generateNewId()}>`,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.IQ_ERROR,
      query,
      transaction,
      description,
    },
  }
);

exports.iqResult = (from, to, transaction, query, description) => (
  {
    id: generateNewId(),
    from: from,
    to: to || `anonymous_<${generateNewId()}>`,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.IQ_RESULT,
      query,
      transaction,
      description,
    },
  }
);

exports.descriptionForIQNotFound = (query) => (
  {
    errorCode: JSONGLE_IQ_ERROR_RESPONSE.IQ_NOT_FOUND,
    errorDetails: `The query '${query}' is not supported`
  }
);

