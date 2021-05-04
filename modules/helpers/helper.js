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
  EVENT: 'session-event'
};

exports.JSONGLE_EVENTS_NAMESPACE = {
  ROOM: 'room'
}

exports.JSONGLE_IQ_ERROR_RESPONSE = {
  SESSION_JOIN_FAILED: 'session-join-failed',
  IQ_NOT_FOUND: 'iq-not-found'
}

exports.JSONGLE_IQ_QUERY = {
  HELLO: 'session-hello',
  JOIN: 'session-join'
}

exports.JSONGLE_ERROR_CODE = {
  BAD_PARAMETERS: 400001,
  NOT_FOUND: 404001
}

exports.JSONGLE_ACK_VALUE = {
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILED: 'failed'
}

exports.JSONGLE_ROOM_EVENTS = {
  JOINED: 'joined',
  LEAVED: 'leaved'
}