const { debug, warning, info, error } = require("../services/logger");
const package = require('../../package.json');
const { generateNewId } = require("../helpers/common");
const { buildIQ, describeHello, buildError, describeErrorHello, isHelloValid, buildAck, buildEvent } = require("../helpers/jsongle");
const { JSONGLE_MESSAGE_TYPE, JSONGLE_IQ_QUERY, JSONGLE_ERROR_CODE, JSONGLE_ACK_VALUE, JSONGLE_EVENTS_NAMESPACE, JSONGLE_ROOM_EVENTS } = require("../helpers/helper");
const { emitMessage } = require('./emitter');
const { CONFIG } = require('../services/config');
const { addRoomsCounter, addMucCounter, addMucTotalCounter, addRoomsTotalCounter} = require("../services/prom");

const moduleName = "sig:iq";

const registerUserToRoom = async (message, socket, io, connectToAMultiRoom = false) => {
  return new Promise(async (resolve, reject) => {
    const { jsongle } = message;
    const { description } = jsongle;
    const { rid } = description;

    if (!rid) {
      warning({ module: moduleName, label: "can't join - missing parameter" });
      reject({
        errorCode: JSONGLE_ERROR_CODE.BAD_PARAMETERS,
        errorDetails: "Missing 'rid' parameter"
      })
      return;
    }

    let mappedClients = io.sockets.adapter.rooms.get(rid);
    let size = (mappedClients && mappedClients.size) || 0;

    // Limit number of members per room
    if (!connectToAMultiRoom && size >= CONFIG().maxMembersPerRoom) {
      warning({ module: moduleName, label: `can't join - already ${size} persons in room ${rid}` });
      reject({
        errorCode: JSONGLE_ERROR_CODE.FORBIDDEN_FULL,
        errorDetails: "Max number of members per room already reached"
      })
      return;
    }

    // Limit number of members per multi room
    if (connectToAMultiRoom && size >= CONFIG().maxMembersPerMultiRoom) {
      warning({ module: moduleName, label: `can't join - already ${size} persons in multi room ${rid}` });
      reject({
        errorCode: JSONGLE_ERROR_CODE.FORBIDDEN_FULL,
        errorDetails: "Max number of members per multi room already reached"
      })
      return;
    }

    const members = [];
    if (mappedClients) {
      mappedClients.forEach((id) => {
        const client = io.of('/').sockets.get(id);
        const messageEventJoined = buildEvent(CONFIG().id, client.id, connectToAMultiRoom ? JSONGLE_EVENTS_NAMESPACE.MUC : JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.JOINED, { member: socket.data, rid });
        emitMessage(messageEventJoined, client, io);
        members.push(client.data);
      });
    } else {
      if (connectToAMultiRoom) {
        addMucCounter();
        addMucTotalCounter();
      } else {
        addRoomsCounter();
        addRoomsTotalCounter();
      }
    }

    info({ module: moduleName, label: `${socket.id} joined ${connectToAMultiRoom ? 'multiroom' : 'room'} ${rid}` });
    socket.join(rid);

    mappedClients = io.sockets.adapter.rooms.get(rid);
    size = (mappedClients && mappedClients.size) || 0;
    debug({ module: moduleName, label: `${size} member(s) in ${connectToAMultiRoom ? 'multiroom' : 'room'} ${rid}` });

    resolve({
      members,
      rid
    });
  })
}

const unregisterUserFromRoom = async (message, socket, io) => {
  return new Promise(async (resolve, reject) => {
    const { jsongle } = message;
    const { description } = jsongle;
    const { rid } = description;

    if (!rid) {
      warning({ module: moduleName, label: `can't leave - missing parameter` });
      reject({
        errorCode: JSONGLE_ERROR_CODE.BAD_PARAMETERS,
        errorDetails: "Missing 'rid' parameter"
      })
      return;
    }

    const connectToAMultiRoom = rid.startsWith(CONFIG().multiRoomPrefix);

    let mappedClients = io.sockets.adapter.rooms.get(rid);

    if (!mappedClients || !mappedClients.has(socket.id)) {
      warning({ module: moduleName, label: `can't leave - user ${socket.id} not in ${connectToAMultiRoom ? 'multiroom' : 'room'} ${rid}` });
      reject({
        errorCode: JSONGLE_ERROR_CODE.NOT_A_MEMBER,
        errorDetails: `Not member of ${connectToAMultiRoom ? 'multiroom' : 'room'} ${rid}`
      })
      return;
    }

    socket.leave(rid);
    info({ module: moduleName, label: `${socket.id} left ${connectToAMultiRoom ? 'multiroom' : 'room'} ${rid}` });

    mappedClients = io.sockets.adapter.rooms.get(rid);
    debug({ module: moduleName, label: `${mappedClients ? mappedClients.size : 0} member(s) still in ${connectToAMultiRoom ? 'multiroom' : 'room'} ${rid}` });

    if (mappedClients) {
      mappedClients.forEach((id) => {
        const client = io.of('/').sockets.get(id);
        const messageLeftEvent = buildEvent(CONFIG().id, client.id, connectToAMultiRoom ? JSONGLE_EVENTS_NAMESPACE.MUC : JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.LEFT, { member: socket.data, rid });
        emitMessage(messageLeftEvent, client, io);
      });
    }

    resolve({
      rid
    });
  })
}

exports.handleIQ = async (message, socket, io) => {
  debug({ module: moduleName, label: `got 'IQ-SET' - ${message.jsongle.query}` });

  const { jsongle } = message;

  switch (jsongle.query) {
    case JSONGLE_IQ_QUERY.MUC:
    case JSONGLE_IQ_QUERY.JOIN:
      try {
        const result = await registerUserToRoom(message, socket, io, jsongle.query === JSONGLE_IQ_QUERY.MUC);
        const messageIQResult = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_RESULT, jsongle.transaction, jsongle.query, result);
        emitMessage(messageIQResult, socket, io);
      } catch (err) {
        const messageIQError = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, err);
        emitMessage(messageIQError, socket, io);
      }
      break;
    case JSONGLE_IQ_QUERY.LEAVE:
      try {
        const result = await unregisterUserFromRoom(message, socket, io);
        const messageIQResult = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_RESULT, jsongle.transaction, jsongle.query, result);
        emitMessage(messageIQResult, socket, io);
      } catch (err) {
        const messageIQError = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, err);
        emitMessage(messageIQError, socket, io);
      }
      break;
    default:
      const messageIQErrorNotFound = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, descriptionForIQNotFound(jsongle.query));
      emitMessage(messageIQErrorNotFound, socket, io);
  }
}

exports.handleIQResult = async (message, socket, io) => {
  debug({ module: moduleName, label: `got 'IQ-RESULT' - ${message.jsongle.query}` });

  const { jsongle } = message;

  switch (jsongle.query) {
    case JSONGLE_IQ_QUERY.HELLO:
      if (!isHelloValid(jsongle.description)) {
        error({ module: moduleName, label: `no 'uid' parameter set` });
        const messageAckFailed = buildAck(CONFIG().id, message.from, JSONGLE_ACK_VALUE.FAILED, jsongle.transaction);
        emitMessage(messageAckFailed, socket, io);
        const messageErrorMissingParameter = buildError(CONFIG().id, message.from, describeErrorHello("Missing 'uid' parameter"));
        emitMessage(messageErrorMissingParameter, socket, io);
        return;
      }

      // Store user identification information
      socket.data = jsongle.description;
      info({ module: moduleName, label: `new user ${jsongle.description.uid} associated to socket ${socket.id}` });
      const messageAckSuccess = buildAck(CONFIG().id, message.from, JSONGLE_ACK_VALUE.SUCCESS, jsongle.transaction);
      emitMessage(messageAckSuccess, socket, io);
      break;
    default:
  }
}

exports.sendIQGetHello = (socket, io) => {
  // Emit hello to newcomer
  const messageHello = buildIQ(CONFIG().id, socket.id, JSONGLE_MESSAGE_TYPE.IQ_GET, generateNewId(), JSONGLE_IQ_QUERY.HELLO, describeHello(CONFIG().id, package.version, package.description));
  emitMessage(messageHello, socket, io);
}
