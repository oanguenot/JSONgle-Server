const { info, error, debug } = require("./logger");
const { addUsersCounter, minusUsersCounter, minusConferencesCounter, addUsersTotalCounter, addDurationTotalCounter,
  addReceivedTotalCounter
} = require("./prom");
const { buildEvent } = require("../helpers/jsongle");
const { JSONGLE_MESSAGE_TYPE, COMMON, JSONGLE_EVENTS_NAMESPACE, JSONGLE_ROOM_EVENTS } = require("../helpers/helper");

const { emitMessage } = require("../sig/emitter");
const { handleIQ, handleIQResult, sendIQGetHello: sendIQGetHello} = require("../sig/iq");
const { handleMessageToRelayInRoom, handlePropose, handleMessageWithAckToRelayInRoom, handleAccept, handleMetrics } = require("../sig/message");
const { isMessageQualified, isUserIdentified, isRoomMessageSentByAUserInRoom, isOtherMemberInRoom, isActionSupported } = require("../sig/middleware");

const moduleName = 'socket';

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
    addUsersTotalCounter();

    const totalUsers = io.engine.clientsCount;
    debug({ module: moduleName, label: `currently ${totalUsers} user(s) connected` });

    sendIQGetHello(socket, io);

    // Handle JSONGLE message
    socket.on(COMMON.JSONGLE, (message) => {
      debug({ module: moduleName, method: "RECV", message });

      const message_size = Buffer.byteLength(JSON.stringify(message)) / 1000 / 1000;
      addReceivedTotalCounter(message_size);

      if (!isMessageQualified(message, socket, io)) {
        return;
      }

      if (!isUserIdentified(message, socket, io)) {
        return;
      }

      if (!isRoomMessageSentByAUserInRoom(message, socket, io)) {
        return;
      }

      const namespace = message.jsongle.namespace;
      // Only applicable for room (not for muc)
      if (namespace !== JSONGLE_EVENTS_NAMESPACE.MUC) {
        if (!isOtherMemberInRoom(message, socket, io)) {
          return;
        }
      }

      if (!isActionSupported(message, socket, io)) {
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
        [JSONGLE_MESSAGE_TYPE.ACCEPT]: handleAccept,
        [JSONGLE_MESSAGE_TYPE.TERMINATE]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.TEXT]: handleMessageWithAckToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.CUSTOM]: handleMessageWithAckToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.EVENT]: handleMessageToRelayInRoom,
        [JSONGLE_MESSAGE_TYPE.METRICS]: handleMetrics,
      };

      actions[message.jsongle.action](message, socket, io);
    });

    // Handle clients disconnecting
    socket.on('disconnecting', () => {
      const rooms = socket.rooms;

      debug({ module: moduleName, label: `user ${socket.id} is disconnecting and was connected to rooms ${rooms}` })
      rooms.forEach(rid => {
        if (rid !== socket.id) {
          const mappedClients = io.sockets.adapter.rooms.get(rid);
          const connectToAMultiRoom = rid.startsWith(CFG.multiRoomPrefix);
          if (mappedClients) {
            mappedClients.forEach((id) => {
              if (id !== socket.id) {
                // inform members that a user left the room
                const client = io.of('/').sockets.get(id);
                const messageLeftRoom = buildEvent(CFG.id, client.id, connectToAMultiRoom ? JSONGLE_EVENTS_NAMESPACE.MUC : JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.LEFT, { member: socket.data, rid });
                emitMessage(messageLeftRoom, client, io);
              } else if (id === socket.id && mappedClients.size === 1) {
                  minusConferencesCounter();
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
      const issued = (socket.handshake && socket.handshake.issued) || Date.now();

      const minutes = (Date.now() - issued) / 1000 / 60;
     addDurationTotalCounter(minutes);

      const totalUsers = io.engine.clientsCount;
      debug({ module: moduleName, label: `${totalUsers} user(s) still connected` });
    });
  });
}
