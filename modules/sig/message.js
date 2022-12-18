const { debug } = require("../services/logger");
const { emitMessage } = require('./emitter');
const { JSONGLE_SESSION_INFO_REASON, JSONGLE_EVENTS_NAMESPACE, JSONGLE_IM_EVENTS, JSONGLE_ACK_TYPE, JSONGLE_MESSAGE_TYPE } = require("../helpers/helper");
const { buildSessionInfo, buildEvent } = require("../helpers/jsongle");
const { CONFIG } = require('../services/config');
const { addMessagesCounter, addReactionsCounter, addP2PFailed, addP2PDurationCounter, addP2PTotalCounter} = require("../services/prom");

const moduleName = "sig:msg";

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

exports.handleAccept = async (message, socket, io) => {
  addP2PTotalCounter();
  this.handleMessageToRelayInRoom(message, socket, io);
}

exports.handleMessageToRelayInRoom = async (message, socket, io) => {
  // Add timestamp to message
  if (!("sent" in message.jsongle.description)) {
    message.jsongle.description.sent = new Date().toJSON();
  }
  message.jsongle.description.relayed = new Date().toJSON();
  relayMessageToRoom(message, socket, io, () => {
    // reaction events
    if (message.jsongle.event === JSONGLE_IM_EVENTS.REACTION && message.jsongle.namespace === JSONGLE_EVENTS_NAMESPACE.MUC) {
      // Update metrics
      addReactionsCounter();
    }
  });
}

exports.handleMessageWithAckToRelayInRoom = async (message, socket, io) => {
  // Add timestamp to message
  if (!("sent" in message.jsongle.description)) {
    message.jsongle.description.sent = new Date().toJSON();
  }
  message.jsongle.description.relayed = new Date().toJSON();
  relayMessageToRoom(message, socket, io, () => {
    const ackEvent = buildEvent(CONFIG().id, message.from, message.jsongle.namespace, JSONGLE_IM_EVENTS.ACK, { acknowledged: new Date().toJSON(), 'mid': message.id, type: JSONGLE_ACK_TYPE.SERVER_RECEIVED });
    emitMessage(ackEvent, socket, io);

    // muc messages
    if (message.jsongle.action === JSONGLE_MESSAGE_TYPE.TEXT && message.jsongle.namespace === JSONGLE_EVENTS_NAMESPACE.MUC) {
      // Update metrics
      addMessagesCounter();
    }
  });
}

exports.handleMetrics = (message) => {
  // Parse available metrics
  const {jsongle} = message;
  const {description} = jsongle;

  // Parse Error (remote consultation)
  if (description.error) {
    if (description.error === "ice-failed") {
      addP2PFailed();
    }
  }

  // Parse call duration
  if (description.duration) {
    addP2PDurationCounter(description.duration);
  }
}
