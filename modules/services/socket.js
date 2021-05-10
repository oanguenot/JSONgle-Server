const { info, warning, error, debug } = require("./logger");
const { addUsersCounter, minusUsersCounter } = require("./prom");
const package = require('../../package.json');
const { buildIQ, describeHello, buildError, describeErrorHello, isHelloValid, buildAck, buildEvent, buildSessionInfo, describeGenericError } = require("../helpers/jsongle");
const { JSONGLE_MESSAGE_TYPE, JSONGLE_IQ_QUERY, COMMON, JSONGLE_ERROR_CODE, JSONGLE_ACK_VALUE, JSONGLE_EVENTS_NAMESPACE, JSONGLE_ROOM_EVENTS, JSONGLE_SESSION_INFO_REASON } = require("../helpers/helper");
const { generateNewId } = require("../helpers/common");

const users = {};

const moduleName = 'socket';

const DEFAULT_MAX_CONCURRENT_USERS = 50;

exports.listen = (io) => {

  const emitMessage = (message, socket, toAll = false) => {
    if (toAll) {
      debug({ module: moduleName, method: "SEND *", message });
      socket.to(message.to).emit(COMMON.JSONGLE, message);
    } else {
      debug({ module: moduleName, method: "SEND", message });
      socket.emit(COMMON.JSONGLE, message);
    }
  }

  const registerUserToRoom = async (message, socket) => {
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

      const mappedClients = io.sockets.adapter.rooms.get(rid);

      if (mappedClients && mappedClients.size >= process.env.maxMembersPerRoom) {
        warning({ module: moduleName, label: `can't join - already ${mappedClients.size} persons in room ${rid}` });
        reject({
          errorCode: JSONGLE_ERROR_CODE.FORBIDDEN_FULL,
          errorDetails: "Max number of members per room already reached"
        })
        return;
      }

      debug({ module: moduleName, label: `${mappedClients ? mappedClients.size : 0} member(s) already in room ${rid}` });

      const members = [];
      if (mappedClients) {
        mappedClients.forEach((id) => {
          const client = io.of('/').sockets.get(id);
          const messageEventJoined = buildEvent(process.env.id, client.id, JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.JOINED, { member: socket.data, rid });
          emitMessage(messageEventJoined, client);
          members.push(client.data);
        });
      }

      info({ module: moduleName, label: `${socket.id} joined room ${rid}` });
      socket.join(rid);

      debug({ module: moduleName, label: `${mappedClients ? mappedClients.size : 0} member(s) now in room ${rid}` });

      resolve({
          members,
        rid
      });
    })
  }

  const unregisterUserFromRoom = async (message, socket) => {
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

      let mappedClients = io.sockets.adapter.rooms.get(rid);

      if (!mappedClients || !mappedClients.has(socket.id)) {
        warning({ module: moduleName, label: `can't leave - user ${socket.id} not in room ${rid}` });
        reject({
          errorCode: JSONGLE_ERROR_CODE.MEMBER_NOT_FOUND,
          errorDetails: `Not member of room ${rid}`
        })
        return;
      }

      socket.leave(rid);
      info({ module: moduleName, label: `${socket.id} left room ${rid}` });

      mappedClients = io.sockets.adapter.rooms.get(rid);
      debug({ module: moduleName, label: `${mappedClients ? mappedClients.size : 0} member(s) still in room ${rid}` });

      if (mappedClients) {
        mappedClients.forEach((id) => {
          const client = io.of('/').sockets.get(id);
          const messageLeftEvent = buildEvent(process.env.id, client.id, JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.LEFT, { member: socket.data, rid });
          emitMessage(messageLeftEvent, client);
        });
      }

      resolve({
        rid
      });

    })
  }

  const handleIQ = async (message, socket) => {
    debug({ module: moduleName, label: `got 'IQ-SET' - ${message.jsongle.query}` });

    const { jsongle } = message;

    switch (jsongle.query) {
      case JSONGLE_IQ_QUERY.JOIN:
        try {
          const result = await registerUserToRoom(message, socket);
          const messageIQResult = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_RESULT, jsongle.transaction, jsongle.query, result);
          emitMessage(messageIQResult, socket);
        } catch (err) {
          const messageIQError = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, err);
          emitMessage(messageIQError, socket);
        }
        break;
      case JSONGLE_IQ_QUERY.LEAVE:
        try {
          const result = await unregisterUserFromRoom(message, socket);
          const messageIQResult = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_RESULT, jsongle.transaction, jsongle.query, result);
          emitMessage(messageIQResult, socket);
        } catch (err) {
          const messageIQError = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, err);
          emitMessage(messageIQError, socket);
        }
        break;
      default:
        const messageIQErrorNotFound = buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, descriptionForIQNotFound(jsongle.query));
        emitMessage(messageIQErrorNotFound, socket);
    }
  }

  const handleIQResult = async (message, socket) => {
    debug({ module: moduleName, label: `got 'IQ-RESULT' - ${message.jsongle.query}` });

    const { jsongle } = message;

    switch (jsongle.query) {
      case JSONGLE_IQ_QUERY.HELLO:
        if (!isHelloValid(jsongle.description)) {
          error({ module: moduleName, label: `no 'uid' parameter set` });
          const messageAckFailed = buildAck(process.env.id, message.from, JSONGLE_ACK_VALUE.FAILED, jsongle.transaction);
          emitMessage(messageAckFailed, socket);
          const messageErrorMissingParameter = buildError(process.env.id, message.from, describeErrorHello("Missing 'uid' parameter"));
          emitMessage(messageErrorMissingParameter, socket);
          return;
        }

        // Store user identification information
        socket.data = jsongle.description;
        info({ module: moduleName, label: `new user ${jsongle.description.uid} associated to socket ${socket.id}` });
        const messageAckSuccess = buildAck(process.env.id, message.from, JSONGLE_ACK_VALUE.SUCCESS, jsongle.transaction);
        emitMessage(messageAckSuccess, socket);
        break;
      default:
    }
  }

  const handlePropose = async (message, socket) => {
    handleMessageToRelayInRoom(message, socket, () => {
      const messageSessionInfoTrying = buildSessionInfo(process.env.id, message.from, message.jsongle.sid, message.jsongle.initiator, message.jsongle.responder, JSONGLE_SESSION_INFO_REASON.TRYING, { tried: new Date().toJSON() });
      emitMessage(messageSessionInfoTrying, socket);
    });
  }

  const handleMessageToRelayInRoom = async (message, socket, callback) => {
    debug({ module: moduleName, label: `got ${message.jsongle.action} for room ${message.to}` });

    // Tests if client is in room 'message.to'
    if (!socket.rooms.has(message.to)) {
      error({ module: moduleName, label: `message not forwarded - ${socket.id} not in room ${message.to}` });
      const messageNoRecipient = buildError(process.env.id, message.from, describeGenericError(JSONGLE_ERROR_CODE.NOT_PART, `Can't call - not in room ${message.to}`));
      emitMessage(messageNoRecipient, socket);
      return;
    }

    // Tests if there is a recipient
    const members = io.sockets.adapter.rooms.get(message.to);
    if (members.size < 2) {
      // No recipient reachable
      error({ module: moduleName, label: `message not forwarded - no other member in room ${message.to}` });
      const messageNotReachable = buildSessionInfo(process.env.id, message.from, message.jsongle.sid, message.jsongle.initiator, message.jsongle.responder, JSONGLE_SESSION_INFO_REASON.UNREACHABLE, { ended: new Date().toJSON() });
      emitMessage(messageNotReachable, socket);
      return;
    }

    message.from = message.to;
    debug({ module: moduleName, label: `forward ${message.jsongle.action} to members of room ${message.to}` });
    emitMessage(message, socket, true);

    if (callback) {
      callback();
    }
  }

  // Middleware for limiting users
  io.use((socket, next) => {
    if (io.engine.clientsCount >= (process.env.maxConcurrentUsers || DEFAULT_MAX_CONCURRENT_USERS)) {
      error({ module: moduleName, label: `${socket.id} disconnected -  max number of client exceeded` });
      socket.disconnect(true);
    }
    next();
  });

  io.sockets.on("connection", (socket, pseudo) => {
    info({ module: moduleName, label: `new user connected ${socket.id}` });

    addUsersCounter();

    const totalUsers = io.engine.clientsCount;
    debug({ module: moduleName, label: `currently ${totalUsers} user(s) connected` });

    // Emit hello to newcomer
    const messageHello = buildIQ(process.env.id, generateNewId(), JSONGLE_MESSAGE_TYPE.IQ_GET, generateNewId(), JSONGLE_IQ_QUERY.HELLO, describeHello(process.env.id, package.version, package.description));
    emitMessage(messageHello, socket);

    socket.on('disconnecting', () => {
      const rooms = socket.rooms;

      debug({ module: moduleName, label: `user ${socket.id} is disconnecting and was connected to rooms ${rooms}` })
      rooms.forEach(rid => {
        if (rid !== socket.id) {
          const mappedClients = io.sockets.adapter.rooms.get(rid);
          if (mappedClients) {
            mappedClients.forEach((id) => {
              if (id !== socket.id) {
                // inform members that a user left the room
                const client = io.of('/').sockets.get(id);
                const messageLeftRoom = buildEvent(process.env.id, client.id, JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.LEFT, { member: socket.data, rid });
                emitMessage(messageLeftRoom, client);
              }
            });
          }
        }
      });
    });

    socket.on("disconnect", () => {
      let id = Object.keys(users).find((id) => {
        return (users[id] === socket.id);
      });

      info({ module: moduleName, label: `user ${socket.id} disconnected` });
      delete users[id];

      minusUsersCounter();

      const totalUsers = io.engine.clientsCount;
      debug({ module: moduleName, label: `${totalUsers} user(s) still connected` });
    });

    socket.on(COMMON.JSONGLE, (message) => {
      debug({ module: moduleName, method: "RECV", message });

      if (!message || !message.jsongle) {
        error({ module: moduleName, label: "Can't deal with message received, missing 'jsongle' property in message" });
        const messageNotHandled = buildError(process.env.id, message.from, describeGenericError(JSONGLE_ERROR_CODE.NO_JSONGLE_DATA, "Missing property 'jsongle' in message"));
        emitMessage(messageNotHandled, socket);
        return;
      }

      if (!socket.data) {
        error({ module: moduleName, label: `Can't deal with message received, user ${socket.id} is not yet registered` });
        const messageUserNotRegistered = buildError(process.env.id, message.from, describeGenericError(JSONGLE_ERROR_CODE.FORBIDDEN_NOT_REGISTERED, "session-hello message was not received or was not complete"));
        emitMessage(messageUserNotRegistered, socket);
        return;
      }

      const actions = {
        [JSONGLE_MESSAGE_TYPE.IQ_SET]: handleIQ,
        [JSONGLE_MESSAGE_TYPE.IQ_RESULT]: handleIQResult,
        [JSONGLE_MESSAGE_TYPE.PROPOSE]: handlePropose,
        [JSONGLE_MESSAGE_TYPE.INFO]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.PROCEED]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.INITIATE]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.TRANSPORT]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.DECLINE]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.RETRACT]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.ACCEPT]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.TERMINATE]: handleMessageToRelayInRoom,
      };

      if (message.jsongle.action in actions) {
        actions[message.jsongle.action](message, socket);
      } else {
        error({ module: moduleName, label: `Can't deal with message received, action ${message.jsongle.action} is not handled` });
        const messageNotHandled = buildError(process.env.id, message.from, describeGenericError(JSONGLE_ERROR_CODE.ACTION_NOT_ALLOWED, "Message sent was not handled"));
        emitMessage(messageNotHandled, socket);
      }
    });
  });
}
