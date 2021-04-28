const { info, warning, error } = require("./logger");
const { addUsersCounter, minusUsersCounter } = require("./prom");
const package = require('../../package.json');
const { sessionHello, sessionRegisterFailed } = require("../helpers/jsongle");

const users = {};

const moduleName = '[io    ]';

exports.listen = (io) => {

  const registerNewUser = async (message, socket) => {
    info(`${moduleName} on 'REGISTER' `, message);

    const { rid, uid, dn } = message;

    if (!rid || !uid || !dn) {
      warning(`${moduleName} register not done - missing parameter`);
      socket.emit('jsongle', sessionRegisterFailed('Missing rid, uid or dn parameter'));
      return;
    } 

    const usersInRoom = await io.sockets(rid);
    info(`${moduleName} ${usersInRoom} person(s) already in room ${rid}`);

    socket.data = message;

    info(`${moduleName} joined room ${rid}`);
    socket.join(rid);

    usersInRoom.forEach(existingSocket => {
      existingSocket.emit('joined', message);
      socket.emit('already-joined', existingSocket.data)
    });
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
    socket.emit('jsongle', sessionHello(process.env.id, package.version, package.description));

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

    socket.on("jsongle", (message) => {
      info("[io    ] MESSAGE ", message);

      const actions = {
        'session-register': registerNewUser
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


