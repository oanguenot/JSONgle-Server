const { info, error, debug } = require("./logger");
const { addUsersCounter, minusUsersCounter } = require("./prom");
const { buildError, buildEvent, describeGenericError } = require("../helpers/jsongle");
const { JSONGLE_MESSAGE_TYPE, COMMON, JSONGLE_ERROR_CODE, JSONGLE_EVENTS_NAMESPACE, JSONGLE_ROOM_EVENTS } = require("../helpers/helper");

const { emitMessage } = require("../sig/emitter");
const { handleIQ, handleIQResult, sendIQGetHello: sendIQGetHello } = require("../sig/iq");
const { handleMessageToRelayInRoom, handlePropose } = require("../sig/call");

const moduleName = 'socket';

const DEFAULT_MAX_CONCURRENT_USERS = 50;

exports.listen = (io, CFG) => {
  // Middleware for limiting users
  io.use((socket, next) => {
    if (io.engine.clientsCount >= (CFG.maxConcurrentUsers)) {
      error({ module: moduleName, label: `${socket.id} disconnected -  max number of client exceeded (${CFG.maxConcurrentUsers})` });
      socket.disconnect(true);
    }
    next();
  });

  //Middleware for checking the app token
  io.use((socket, next) => {
    const { handshake } = socket;
    const { auth } = handshake;

    if (!auth || !auth.appToken || auth.appToken !== CFG.appToken) {
      error({ module: moduleName, label: `${socket.id} disconnected - bad application token provided` });
      socket.disconnect(true);
    }
    next();
  });

  // Handle clients connection
  io.sockets.on("connection", (socket, pseudo) => {
    info({ module: moduleName, label: `new user connected ${socket.id}` });

    addUsersCounter();

    const totalUsers = io.engine.clientsCount;
    debug({ module: moduleName, label: `currently ${totalUsers} user(s) connected` });

    sendIQGetHello(socket, io);

    // Handle JSONGLE message
    socket.on(COMMON.JSONGLE, (message) => {
      debug({ module: moduleName, method: "RECV", message });

      if (!message || !message.jsongle) {
        error({ module: moduleName, label: "Can't deal with message received, missing 'jsongle' property in message" });
        const messageNotHandled = buildError(CFG.id, message.from, describeGenericError(JSONGLE_ERROR_CODE.NO_JSONGLE_DATA, "Missing property 'jsongle' in message"));
        emitMessage(messageNotHandled, socket, io);
        return;
      }

      if (!socket.data) {
        error({ module: moduleName, label: `Can't deal with message received, user ${socket.id} is not yet registered` });
        const messageUserNotRegistered = buildError(CFG.id, message.from, describeGenericError(JSONGLE_ERROR_CODE.FORBIDDEN_NOT_REGISTERED, "session-hello message was not received or was not complete"));
        emitMessage(messageUserNotRegistered, socket, io);
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
        actions[message.jsongle.action](message, socket, io);
      } else {
        error({ module: moduleName, label: `Can't deal with message received, action ${message.jsongle.action} is not handled` });
        const messageNotHandled = buildError(CFG.id, message.from, describeGenericError(JSONGLE_ERROR_CODE.ACTION_NOT_ALLOWED, "Message sent was not handled"));
        emitMessage(messageNotHandled, socket, io);
      }
    });

    // Handle clients disconnecting
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
                const messageLeftRoom = buildEvent(CFG.id, client.id, JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.LEFT, { member: socket.data, rid });
                emitMessage(messageLeftRoom, client, io);
              }
            });
          }
        }
      });
    });

    // Handle clients disconnection
    socket.on("disconnect", () => {
      info({ module: moduleName, label: `user ${socket.id} disconnected` });

      minusUsersCounter();

      const totalUsers = io.engine.clientsCount;
      debug({ module: moduleName, label: `${totalUsers} user(s) still connected` });
    });
  });
}
