const { debug } = require("../services/logger");
const { emitMessage } = require('./emitter');
const { JSONGLE_SESSION_INFO_REASON, JSONGLE_ERROR_CODE } = require("../helpers/helper");
const { buildError, buildSessionInfo, describeGenericError } = require("../helpers/jsongle");
const { CONFIG } = require('../services/config');

const moduleName = "sig:call";

const relayMessageToRoom = async (message, socket, io, callback) => {
  debug({ module: moduleName, label: `forward ${message.jsongle.action} to members of room ${message.to}` });
  emitMessage(message, socket, io, true);

  if (callback) {
    callback();
  }
}

exports.handlePropose = async (message, socket, io) => {
  relayMessageToRoom(message, socket, io, () => {
    const messageSessionInfoTrying = buildSessionInfo(CONFIG().id, message.from, message.jsongle.sid, message.jsongle.initiator, message.jsongle.responder, JSONGLE_SESSION_INFO_REASON.TRYING, { tried: new Date().toJSON() });
    emitMessage(messageSessionInfoTrying, socket, io);
  });
}

exports.handleMessageToRelayInRoom = async (message, socket, io) => {
  relayMessageToRoom(message, socket, io);
}