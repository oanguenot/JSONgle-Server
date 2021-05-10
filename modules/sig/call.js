const { debug } = require("../services/logger");
const { emitMessage } = require('./emitter');
const { JSONGLE_SESSION_INFO_REASON, JSONGLE_ERROR_CODE } = require("../helpers/helper");
const { buildError, buildSessionInfo, describeGenericError } = require("../helpers/jsongle");

const moduleName = "sig:call";

const relayMessageToRoom = async (message, socket, io, callback) => {
  debug({ module: moduleName, label: `got ${message.jsongle.action} for room ${message.to}` });

  // Tests if client is in room 'message.to'
  if (!socket.rooms.has(message.to)) {
    error({ module: moduleName, label: `message not forwarded - ${socket.id} not in room ${message.to}` });
    const messageNoRecipient = buildError(process.env.id, message.from, describeGenericError(JSONGLE_ERROR_CODE.NOT_PART, `Can't call - not in room ${message.to}`));
    emitMessage(messageNoRecipient, socket, io);
    return;
  }

  // Tests if there is a recipient
  const members = io.sockets.adapter.rooms.get(message.to);
  if (members.size < 2) {
    // No recipient reachable
    error({ module: moduleName, label: `message not forwarded - no other member in room ${message.to}` });
    const messageNotReachable = buildSessionInfo(process.env.id, message.from, message.jsongle.sid, message.jsongle.initiator, message.jsongle.responder, JSONGLE_SESSION_INFO_REASON.UNREACHABLE, { ended: new Date().toJSON() });
    emitMessage(messageNotReachable, socket, io);
    return;
  }

  debug({ module: moduleName, label: `forward ${message.jsongle.action} to members of room ${message.to}` });
  emitMessage(message, socket, io, true);

  if (callback) {
    callback();
  }
}

exports.handlePropose = async (message, socket, io) => {
  relayMessageToRoom(message, socket, io, () => {
    const messageSessionInfoTrying = buildSessionInfo(process.env.id, message.from, message.jsongle.sid, message.jsongle.initiator, message.jsongle.responder, JSONGLE_SESSION_INFO_REASON.TRYING, { tried: new Date().toJSON() });
    emitMessage(messageSessionInfoTrying, socket, io);
  });
}

exports.handleMessageToRelayInRoom = async (message, socket, io) => {
  relayMessageToRoom(message, socket, io);
}