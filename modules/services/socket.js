const { info, warning, error } = require("./logger");
const { addUsersCounter, minusUsersCounter } = require("./prom");
const package = require('../../package.json');
const { sessionHello, iqError, descriptionForIQNotFound, sessionJoined } = require("../helpers/jsongle");
const { JSONGLE_MESSAGE_TYPE, JSONGLE_IQ_ERROR_RESPONSE, JSONGLE_IQ_QUERY, COMMON, JSONGLE_ERROR_CODE } = require("../helpers/helper");

const users = {};

const moduleName = '[io    ]';

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

  // Middleware for limiting users
  io.use((socket, next) => {
    if (io.engine.clientsCount >= process.env.maxConcurrentUsers) {
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
    socket.emit(COMMON.JSONGLE, sessionHello(process.env.id, package.version, package.description));

    // socket.on("welcome", (message) => {
    //   info("[io    ] WELCOME ", message);

    //   io.to(users[message.to]).emit("welcome", message.data);
    // });

    socket.on("disconnect", () => {
      let id = Object.keys(users).find((id) => {
        return (users[id] === socket.id);
      });

      delete users[id];
      socket.to("room").emit("bye", { id: id });
      minusUsersCounter();
    });

    socket.on(COMMON.JSONGLE, (message) => {
      info(message);

      const actions = {
        [JSONGLE_MESSAGE_TYPE.IQ_SET]: handleIQ
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


