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
};

exports.JSONGLE_IQ_ERROR_RESPONSE = {
  REGISTRATION_FAILED: 'registration-failed',
  IQ_NOT_FOUND: 'iq-not-found'
}

exports.JSONGLE_IQ_QUERY = {
  HELLO: 'session-hello',
}

exports.JSONGLE_ERROR_CODE = {
  BAD_PARAMETERS: 400001,
  NOT_FOUND: 404001
}