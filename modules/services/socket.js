const { info, warning, error } = require("./logger");
const { addUsersCounter, minusUsersCounter } = require("./prom");
const package = require('../../package.json');
const { buildIQ, describeHello, buildError, describeErrorHello, isHelloValid, buildAck, buildEvent } = require("../helpers/jsongle");
const { JSONGLE_MESSAGE_TYPE, JSONGLE_IQ_QUERY, COMMON, JSONGLE_ERROR_CODE, JSONGLE_ACK_VALUE, JSONGLE_EVENTS_NAMESPACE, JSONGLE_ROOM_EVENTS } = require("../helpers/helper");
const { generateNewId } = require("../helpers/common");

const users = {};

const moduleName = '[io    ]';

const DEFAULT_MAX_CONCURRENT_USERS = 50;

exports.listen = (io) => {

  const registerUserToRoom = async (message, socket) => {
    return new Promise(async (resolve, reject) => {
      const { jsongle } = message;
      const { description } = jsongle;
      const { rid } = description;
    
      if (!rid) {
        warning(`${moduleName} can't join - missing parameter`);
        reject({
            errorCode: JSONGLE_ERROR_CODE.BAD_PARAMETERS,
          errorDetails: "Missing 'rid' parameter"
        })
        return;
      }

      const mappedClients = io.sockets.adapter.rooms.get(rid);

      if (mappedClients && mappedClients.size >= process.env.maxMembersPerRoom) {
        warning(`${moduleName} can't join - already ${mappedClients.size} persons in room ${rid}`);
        reject({
          errorCode: JSONGLE_ERROR_CODE.FORBIDDEN_FULL,
          errorDetails: "Max number of members per room already reached"
        })
        return;
      }

      info(`${moduleName} ${mappedClients ? mappedClients.size : 0} member(s) already in room ${rid}`);

      const members = [];
      if (mappedClients) {
        mappedClients.forEach((id) => {
          const client = io.of('/').sockets.get(id);
          client.emit(COMMON.JSONGLE, buildEvent(process.env.id, client.id, JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.JOINED, { member: socket.data, rid }))
          members.push(client.data);
        });
      }

      info(`${moduleName} ${socket.id} joined room ${rid}`);
      socket.join(rid);

      resolve({
          members,
        rid
      });
    })
  }

  unregisterUserFromRoom = async (message, socket) => {
    return new Promise(async (resolve, reject) => {
      const { jsongle } = message;
      const { description } = jsongle;
      const { rid } = description;

      if (!rid) {
        warning(`${moduleName} can't leave - missing parameter`);
        reject({
          errorCode: JSONGLE_ERROR_CODE.BAD_PARAMETERS,
          errorDetails: "Missing 'rid' parameter"
        })
        return;
      }

      let mappedClients = io.sockets.adapter.rooms.get(rid);

      if (!mappedClients || !mappedClients.has(socket.id)) {
        warning(`${moduleName} can't leave - user ${socket.id} not in room ${rid}`);
        reject({
          errorCode: JSONGLE_ERROR_CODE.MEMBER_NOT_FOUND,
          errorDetails: `Not member of room ${rid}`
        })
        return;
      }

      socket.leave(rid);
      info(`${moduleName} ${socket.id} left room ${rid}`);

      mappedClients = io.sockets.adapter.rooms.get(rid);
      info(`${moduleName} ${mappedClients ? mappedClients.size : 0} member(s) still in room ${rid}`);

      if (mappedClients) {
        mappedClients.forEach((id) => {
          const client = io.of('/').sockets.get(id);
          client.emit(COMMON.JSONGLE, buildEvent(process.env.id, client.id, JSONGLE_EVENTS_NAMESPACE.ROOM, JSONGLE_ROOM_EVENTS.LEFT, { member: socket.data, rid }))
        });
      }

      resolve({
        rid
      });

    })
  }

  handleIQ = async (message, socket) => {
    info(`${moduleName} on 'IQ-SET' query ${message.jsongle.query}`);

    const { jsongle } = message;

    switch (jsongle.query) {
      case JSONGLE_IQ_QUERY.JOIN:
        try {
          const result = await registerUserToRoom(message, socket);
          socket.emit(COMMON.JSONGLE, buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_RESULT, jsongle.transaction, jsongle.query, result));
        } catch (err) {
          socket.emit(COMMON.JSONGLE, buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, err));
        }
        break;
      case JSONGLE_IQ_QUERY.LEAVE:
        try {
          const result = await unregisterUserFromRoom(message, socket);
          socket.emit(COMMON.JSONGLE, buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_RESULT, jsongle.transaction, jsongle.query, result));
        } catch (err) {
          socket.emit(COMMON.JSONGLE, buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, err));
        }
        break;
      default:
        socket.emit(COMMON.JSONGLE, buildIQ(message.to, message.from, JSONGLE_MESSAGE_TYPE.IQ_ERROR, jsongle.transaction, jsongle.query, descriptionForIQNotFound(jsongle.query)))
    }
  }

  handleIQResult = async (message, socket) => {
    info(`${moduleName} on 'IQ-RESULT' query ${message.jsongle.query}`);

    const { jsongle } = message;

    switch (jsongle.query) {
      case JSONGLE_IQ_QUERY.HELLO:
        if (!isHelloValid(jsongle.description)) {
          error(`${moduleName} no 'uid' parameter set`);
          socket.emit(COMMON.JSONGLE, buildAck(process.env.id, message.from, JSONGLE_ACK_VALUE.FAILED, jsongle.transaction));
          socket.emit(COMMON.JSONGLE, buildError(process.env.id, message.from, describeErrorHello("Missing 'uid' parameter")));
          return;
        }

        // Store user identification information
        socket.data = jsongle.description;
        info(`${moduleName} user ${jsongle.description.uid} associated to socket ${socket.id}`);
        socket.emit(COMMON.JSONGLE, buildAck(process.env.id, message.from, JSONGLE_ACK_VALUE.SUCCESS, jsongle.transaction));
        break;
      default:
    }
  }

  // Middleware for limiting users
  io.use((socket, next) => {
    if (io.engine.clientsCount >= (process.env.maxConcurrentUsers || DEFAULT_MAX_CONCURRENT_USERS)) {
      error(`${moduleName} max number of client exceeded - client disconnected`);
      socket.disconnect(true);
    }
    next();
  });

  io.sockets.on("connection", (socket, pseudo) => {
    info(`${moduleName} new client connected ${socket.id}`);

    addUsersCounter();

    const totalUsers = io.engine.clientsCount;
    info(`${moduleName} #users=${totalUsers}`);

    // Emit hello to newcomer
    socket.emit(COMMON.JSONGLE, buildIQ(process.env.id, generateNewId(), JSONGLE_MESSAGE_TYPE.IQ_GET, generateNewId(), JSONGLE_IQ_QUERY.HELLO, describeHello(process.env.id, package.version, package.description)));

    socket.on("disconnect", () => {
      let id = Object.keys(users).find((id) => {
        return (users[id] === socket.id);
      });

      info(`${moduleName} on user ${socket.id} disconnected`);

      delete users[id];
      socket.to("room").emit("bye", { id: id });
      minusUsersCounter();

      const totalUsers = io.engine.clientsCount;
      info(`${moduleName} #users=${totalUsers}`);
    });

    socket.on(COMMON.JSONGLE, (message) => {
      info(message);

      if (!socket.data) {
        socket.emit(COMMON.JSONGLE, build)
      }

      const actions = {
        [JSONGLE_MESSAGE_TYPE.IQ_SET]: handleIQ,
        [JSONGLE_MESSAGE_TYPE.IQ_RESULT]: handleIQResult
      };

      if (message.jsongle.action in actions) {
        actions[message.jsongle.action](message, socket);
      }

      // TODO refactor
      // if (!(message.to in users)) {
      //   const abortMsg = {
      //     id: generateNewId(),
      //     from: "server",
      //     to: message.from,
      //     jsongle: {
      //       sid: message.jsongle.sid,
      //       action: "session-info",
      //       reason: "unreachable",
      //       initiator: message.jsongle.initiator,
      //       responder: message.jsongle.responder,
      //       description: {
      //         ended: new Date().toJSON(),
      //       },
      //     },
      //   };

        // Send a try to issuer
        //socket.emit("jsongle", abortMsg);
        //return;
      //}

      // TODO: refactor
      // if (message.jsongle.action === "session-propose") {
      //   const tryMsg = {
      //     id: generateNewId(),
      //     from: "server",
      //     to: message.from,
      //     jsongle: {
      //       sid: message.jsongle.sid,
      //       action: "session-info",
      //       reason: "trying",
      //       initiator: message.jsongle.initiator,
      //       responder: message.jsongle.responder,
      //       description: {
      //         tried: new Date().toJSON(),
      //         media: message.jsongle.media,
      //         additional_data: {
      //           initiator_name: "",
      //           initiator_photo: "",
      //           session_object: "",
      //         },
      //       },
      //     },
      //   };

      //   // Send a try to issuer
      //   socket.emit("jsongle", tryMsg);
      // }

      // Forward message to responder
      //io.to(users[message.to]).emit("jsongle", message);
    });
  });

}


