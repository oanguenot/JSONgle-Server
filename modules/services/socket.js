const { info, warning } = require("./logger");
const { addUsersCounter, minusUsersCounter } = require("./prom");
const package = require('../../package.json');

const users = {};

const moduleName = '[io    ]';

exports.listen = (io) => {

  // Middleware for limiting users
  io.use((socket, next) => {
    if (io.engine.clientsCount >= process.env.maxConcurrentUsers) {
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
    socket.emit('hello', { version: package.version, sn: package.name });

    socket.on("register", async (message) => {

      info(`${moduleName} on 'REGISTER' `, message);

      const { rid, uid, dn } = message;

      if (!rid || !uid || !dn) {
        warning(`${moduleName} register not done - missing parameter`);
        socket.emit('register-failed', { 'msg': 'Missing rid, uid or dn parameter' });
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
    });

    socket.on("welcome", (message) => {
      info("[io    ] WELCOME ", message);

      io.to(users[message.to]).emit("welcome", message.data);
    });

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

      if (!(message.to in users)) {
        const abortMsg = {
          id: generateNewId(),
          from: "server",
          to: message.from,
          jsongle: {
            sid: message.jsongle.sid,
            action: "session-info",
            reason: "unreachable",
            initiator: message.jsongle.initiator,
            responder: message.jsongle.responder,
            description: {
              ended: new Date().toJSON(),
            },
          },
        };

        // Send a try to issuer
        socket.emit("jsongle", abortMsg);
        return;
      }

      if (message.jsongle.action === "session-propose") {

        const tryMsg = {
          id: generateNewId(),
          from: "server",
          to: message.from,
          jsongle: {
            sid: message.jsongle.sid,
            action: "session-info",
            reason: "trying",
            initiator: message.jsongle.initiator,
            responder: message.jsongle.responder,
            description: {
              tried: new Date().toJSON(),
              media: message.jsongle.media,
              additional_data: {
                initiator_name: "",
                initiator_photo: "",
                session_object: "",
              },
            },
          },
        };

        // Send a try to issuer
        socket.emit("jsongle", tryMsg);
      }

      // Forward message to responder
      io.to(users[message.to]).emit("jsongle", message);
    });
  });

}


