exports.COMMON = {
  JSONGLE: 'jsongle',
}

exports.JSONGLE_MESSAGE_TYPE = {
  SESSION_HELLO: 'session-hello',
  SESSIOn_JOINED: 'session-joined',
  IQ_SET: 'iq-set',
  IQ_ERROR: 'iq-error',
  IQ_RESULT: 'iq-result'
};

exports.JSONGLE_IQ_ERROR_RESPONSE = {
  REGISTRATION_FAILED: 'registration-failed',
  IQ_NOT_FOUND: 'iq-not-found'
}

exports.JSONGLE_IQ_QUERY = {
  REGISTER: 'register'
}

exports.JSONGLE_ERROR_CODE = {
  BAD_PARAMETERS: 400001,
  NOT_FOUND: 404001
}