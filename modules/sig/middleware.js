const { buildError, describeGenericError, buildSessionInfo } = require("../helpers/jsongle");
const { JSONGLE_ERROR_CODE, isACallMessageType, JSONGLE_SESSION_INFO_REASON, isMessageTypeSupported } = require("../helpers/helper");
const { CONFIG } = require("../services/config");
const { error } = require("../services/logger");
const { emitMessage } = require("./emitter");

const moduleName = "middleware";

const REPLY = {
  DISCARDED: false,
  ACCEPTED: true
}

// Middleware - Not a JSONgle message
exports.isMessageQualified = (message, socket, io) => {
  if (!message || !message.jsongle) {
    error({ module: moduleName, label: "Can't deal with message received, missing 'jsongle' property in message" });
    const messageNotHandled = buildError(CONFIG().id, message.from, describeGenericError(JSONGLE_ERROR_CODE.NO_JSONGLE_DATA, "Missing property 'jsongle' in message"));
    emitMessage(messageNotHandled, socket, io);
    return REPLY.DISCARDED;
  }
  return REPLY.ACCEPTED;
}

// Middleware - User not identified
exports.isUserIdentified = (message, socket, io) => {
  if (!socket.data) {
    error({ module: moduleName, label: `Can't deal with message received, user ${socket.id} is not yet registered` });
    const messageUserNotRegistered = buildError(CONFIG().id, message.from, describeGenericError(JSONGLE_ERROR_CODE.FORBIDDEN_NOT_REGISTERED, "session-hello message was not received or was not complete"));
    emitMessage(messageUserNotRegistered, socket, io);
    return REPLY.DISCARDED;
  }
  return REPLY.ACCEPTED;
}

// Middleware - Message sent to a room by a user not in that room
exports.isRoomMessageSentByAUserInRoom = (message, socket, io) => {
  if (message.to !== CONFIG().id) {
    if (!socket.rooms.has(message.to)) {
      error({ module: moduleName, label: `message not forwarded - ${socket.id} not in room ${message.to}` });
      const messageNotInRoom = buildError(CONFIG().id, message.from, describeGenericError(JSONGLE_ERROR_CODE.NOT_A_MEMBER, `Can't call - not in room ${message.to}`));
      emitMessage(messageNotInRoom, socket, io);
      return REPLY.DISCARDED;
    }
  }
  return REPLY.ACCEPTED;
}

// Middleware - Is there an other member in that room
exports.isOtherMemberInRoom = (message, socket, io) => {
  if (message.to !== CONFIG().id) {
    const members = io.sockets.adapter.rooms.get(message.to);
    if (members.size < 2) {
      error({ module: moduleName, label: `message not forwarded - no other member in room ${message.to}` });
      if (isACallMessageType(message.jsongle.action)) {
        const messageNotReachable = buildSessionInfo(CONFIG().id, message.from, message.jsongle.sid, message.jsongle.initiator, message.jsongle.responder, JSONGLE_SESSION_INFO_REASON.UNREACHABLE, { ended: new Date().toJSON() });
        emitMessage(messageNotReachable, socket, io);
      } else {
        const messageNotReachable = buildError(CONFIG().id, message.from, describeGenericError(JSONGLE_ERROR_CODE.NO_OTHER_MEMBER, `Can't transmit message - no other member in room ${message.to}`));
        emitMessage(messageNotReachable, socket, io);
      }
      return REPLY.DISCARDED;
    }
  }
  return REPLY.ACCEPTED;
}

exports.isActionSupported = (message, socket, io) => {
  if (!isMessageTypeSupported(message.jsongle.action)) {
    error({ module: moduleName, label: `Can't deal with message received, action ${message.jsongle.action} is not handled` });
    const messageNotHandled = buildError(CONFIG().id, message.from, describeGenericError(JSONGLE_ERROR_CODE.ACTION_NOT_ALLOWED, `Message of type ${message.jsongle.action} is not supported`));
    emitMessage(messageNotHandled, socket, io);
    return REPLY.DISCARDED;
  }
  return REPLY.ACCEPTED;
}
