const { generateNewId } = require("./common");
const { JSONGLE_ERROR_CODE, JSONGLE_MESSAGE_TYPE } = require('./helper');

exports.describeHello = (serverId, serverVersion, serverDescription) => (
  {
    version: serverVersion,
    sn: serverId,
    info: serverDescription,
    connected: new Date().toJSON()
  }
);

exports.describeJoined = (description) => (
  {
    description,
    joined: new Date().toJSON()
  }
);

exports.buildIQ = (from, to, action, transaction, query, description) => (
  {
    id: generateNewId(),
    from,
    to,
    jsongle: {
      action,
      query,
      transaction,
      description,
    },
  }
);

exports.buildAck = (from, to, status, transaction) => (
  {
    id: generateNewId(),
    from: from,
    to: to,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.ACK,
      status,
      transaction
    }
  }
);

exports.buildError = (from, to, description) => (
  {
    id: generateNewId(),
    from: from,
    to: to,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.ERROR,
      description,
    },
  }
)

exports.buildSessionInfo = (from, to, sid, initiator, responder, reason, description) => (
  {
    id: generateNewId(),
    from,
    to,
    jsongle: {
      sid: sid,
      action: JSONGLE_MESSAGE_TYPE.INFO,
      reason,
      initiator: initiator,
      responder: responder,
      description,
    }
  }
)

exports.describeIQNotFound = (query) => (
  {
    errorCode: JSONGLE_ERROR_CODE.NOT_FOUND,
    errorDetails: `The query '${query}' is not supported`
  }
);

exports.describeErrorHello = (details) => (
  {
    errorCode: JSONGLE_ERROR_CODE.BAD_PARAMETERS,
    errorDetails: details
  }
)

exports.describeGenericError = (errorCode, errorDetails) => (
  {
    errorCode,
    errorDetails
  }
)

exports.isHelloValid = (hello) => {
  if (!hello || !hello.uid) {
    return false;
  }
  return true;
}

exports.buildEvent = (from, to, namespace, event, description) => (
  {
    id: generateNewId(),
    from: from,
    to: to,
    jsongle: {
      action: JSONGLE_MESSAGE_TYPE.EVENT,
      namespace,
      event,
      description,
    },
  }
);

