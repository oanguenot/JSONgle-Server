exports.COMMON = {
  JSONGLE: 'jsongle',
}

exports.JSONGLE_MESSAGE_TYPE = {
  IQ_SET: 'iq-set',
  IQ_GET: 'iq-get',
  IQ_ERROR: 'iq-error',
  IQ_RESULT: 'iq-result',
  ERROR: 'session-error',
  ACK: 'ack',
  EVENT: 'session-event',
  PROPOSE: 'session-propose',
  INFO: 'session-info',
  PROCEED: 'session-proceed',
  INITIATE: 'session-initiate',
  TRANSPORT: 'transport-info',
  DECLINE: 'session-decline',
  RETRACT: 'session-retract',
  ACCEPT: 'session-accept',
  TERMINATE: 'session-terminate',
  TEXT: 'session-text',
  CUSTOM: 'session-custom'
};

exports.isACallMessageType = (type) => {
  const callMessageType = [
    this.JSONGLE_MESSAGE_TYPE.PROPOSE,
    this.JSONGLE_MESSAGE_TYPE.INFO,
    this.JSONGLE_MESSAGE_TYPE.PROCEED,
    this.JSONGLE_MESSAGE_TYPE.INITIATE,
    this.JSONGLE_MESSAGE_TYPE.TRANSPORT,
    this.JSONGLE_MESSAGE_TYPE.DECLINE,
    this.JSONGLE_MESSAGE_TYPE.RETRACT,
    this.JSONGLE_MESSAGE_TYPE.ACCEPT,
    this.JSONGLE_MESSAGE_TYPE.TERMINATE,
  ];

  return callMessageType.includes(type);
}

exports.isMessageTypeSupported = (type) => {
  const messageType = [
    this.JSONGLE_MESSAGE_TYPE.IQ_SET,
    this.JSONGLE_MESSAGE_TYPE.IQ_RESULT,
    this.JSONGLE_MESSAGE_TYPE.TEXT,
    this.JSONGLE_MESSAGE_TYPE.CUSTOM,
    this.JSONGLE_MESSAGE_TYPE.PROPOSE,
    this.JSONGLE_MESSAGE_TYPE.INFO,
    this.JSONGLE_MESSAGE_TYPE.PROCEED,
    this.JSONGLE_MESSAGE_TYPE.INITIATE,
    this.JSONGLE_MESSAGE_TYPE.TRANSPORT,
    this.JSONGLE_MESSAGE_TYPE.DECLINE,
    this.JSONGLE_MESSAGE_TYPE.RETRACT,
    this.JSONGLE_MESSAGE_TYPE.ACCEPT,
    this.JSONGLE_MESSAGE_TYPE.TERMINATE,
    this.JSONGLE_MESSAGE_TYPE.EVENT,
  ];

  return messageType.includes(type);
}

exports.JSONGLE_SESSION_INFO_REASON = {
  TRYING: 'trying',
  UNREACHABLE: 'unreachable'
}

exports.JSONGLE_EVENTS_NAMESPACE = {
  ROOM: 'room',
  MESSAGE: 'message'
}

exports.JSONGLE_IQ_QUERY = {
  HELLO: 'session-hello',
  JOIN: 'session-join',
  LEAVE: 'session-leave',
}

exports.JSONGLE_ERROR_CODE = {
  BAD_PARAMETERS: 400001,
  NO_JSONGLE_DATA: 400002,
  FORBIDDEN_FULL: 403001,
  FORBIDDEN_NOT_REGISTERED: 403002,
  NOT_FOUND: 404001,
  NOT_A_MEMBER: 404002,
  NO_OTHER_MEMBER: 404003,
  ACTION_NOT_ALLOWED: 405001,
}

exports.JSONGLE_ACK_VALUE = {
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILED: 'failed'
}

exports.JSONGLE_ROOM_EVENTS = {
  JOINED: 'joined',
  LEFT: 'left'
}

exports.JSONGLE_IM_EVENTS = {
  ACK: 'ack'
}