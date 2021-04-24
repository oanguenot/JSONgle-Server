const { info } = require("./logger");
const { addUsersCounter, minusUsersCounter } = require("./prom");

const users = {};

exports.listen = (io) => {

  io.on('connection', socket => {
    console.log(">>>connected")
    addUsersCounter();
  })

  io.sockets.on("connection", (socket, pseudo) => {
    info(`[io    ] new client connected ${socket.id}`);

    socket.join("room");

    socket.on("hello", (message) => {
      users[message.id] = socket.id;

      info("[io    ] HELLO ", message);
      socket.to("room").emit("hello", message);
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


