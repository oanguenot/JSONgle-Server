const { info, warning, error } = require("./logger");
const { addUsersCounter, minusUsersCounter } = require("./prom");
const package = require('../../package.json');
const { buildIQ, describeHello, buildError, describeErrorHello, isHelloValid, buildAck } = require("../helpers/jsongle");
const { JSONGLE_MESSAGE_TYPE, JSONGLE_IQ_ERROR_RESPONSE, JSONGLE_IQ_QUERY, COMMON, JSONGLE_ERROR_CODE } = require("../helpers/helper");
const { generateNewId } = require("../helpers/common");

const users = {};

const moduleName = '[io    ]';

const DEFAULT_MAX_CONCURRENT_USERS = 50;

exports.listen = (io) => {

  const registerUserToRoom = async (description, socket) => {

    return new Promise(async (resolve, reject) => {
      const { rid, uid, dn } = description;
    
      if (!rid || !uid || !dn) {
        warning(`${moduleName} can't register - missing parameter`);
        reject({
          query: JSONGLE_IQ_ERROR_RESPONSE.REGISTRATION_FAILED,
          description: {
            errorCode: JSONGLE_ERROR_CODE.BAD_PARAMETERS,
            errorDetails: 'Missing rid, uid or dn parameter'
          }
        })
        return;
      }

      info(`${moduleName} register ${uid} to room ${rid}`);

      const usersInRoom = await io.sockets(rid);
      info(`${moduleName} ${usersInRoom} person(s) already in room ${rid}`);

      socket.data = description;

      info(`${moduleName} joined room ${rid}`);
      socket.join(rid);

      const joined = [];

      usersInRoom.forEach(existingSocket => {
        existingSocket.emit(COMMON.JSONGLE, sessionJoined(process.env.id, existingSocket.data.uid, description));
        joined.push(existingSocket.data);
      });

      resolve({
        query: JSONGLE_MESSAGE_TYPE.IQ_RESULT,
        description: {
          joined
        }
      })
    })
  }

  handleIQ = async (message, socket) => {
    info(`${moduleName} on 'IQ-SET' query ${message.jsongle.query}`);

    const { jsongle } = message;

    switch (jsongle.query) {
      case JSONGLE_IQ_QUERY.REGISTER:
        try {
          const result = await registerUserToRoom(jsongle.description, socket);
          socket.emit(COMMON.JSONGLE, iqResult(message.to, message.from, jsongle.transaction, result.query, result.description));
        } catch (err) {
          socket.emit(COMMON.JSONGLE, iqError(message.to, message.from, jsongle.transaction, err.query, err.description));
        }
        break;
      default:
        socket.emit(COMMON.JSONGLE, iqError(message.to, message.from, jsongle.transaction, JSONGLE_IQ_ERROR_RESPONSE.IQ_NOT_FOUND, descriptionForIQNotFound(jsongle.query)))
    }
  }

  handleIQResult = async (message, socket) => {
    info(`${moduleName} on 'IQ-RESULT' query ${message.jsongle.query}`);

    const { jsongle } = message;

    switch (jsongle.query) {
      case JSONGLE_IQ_QUERY.HELLO:
        if (!isHelloValid(jsongle.description)) {
          error(`${moduleName} no 'uid' parameter set`);
          socket.emit(COMMON.JSONGLE, buildAck(process.env.id, message.from, jsongle.transaction));
          socket.emit(COMMON.JSONGLE, buildError(process.env.id, message.from, describeErrorHello("Missing 'uid' parameter")));
          return;
        }

        // Store user identification information
        socket.data = jsongle.description;
        info(`${moduleName} user ${jsongle.description.uid} associated to socket ${socket.id}`);
        socket.emit(COMMON.JSONGLE, buildAck(process.env.id, message.from, jsongle.transaction));
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


