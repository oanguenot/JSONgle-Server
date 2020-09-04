const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const { logInfo } = require("./modules/Logger");
const morgan = require("morgan");
const { urlencoded } = require("express");

const { generateNewId } = require("./modules/helper")

morgan(":method :url :status :res[content-length] - :response-time ms");

const users = {};

io.sockets.on("connection", (socket, pseudo) => {
    logInfo(`[io    ] new client connected ${socket.id}`);

    // Send message about already connected users
    // var sockets = io.sockets.sockets;
    // Object.keys(sockets).forEach((id) => {
    //     if (id !== socket.id) {
    //         io.to(socket.id).emit("users", { action: "userDidConnect", data: { userId: id } });
    //     }
    // });

    socket.join("room");
    // socket.to("room").emit("users", { action: "userDidConnect", data: { userId: socket.id } });

    socket.on("hello", (message) => {

        users[message.id] = socket.id;

        logInfo("[io    ] HELLO ", message);
        socket.to("room").emit("hello", message);
    });

    socket.on("welcome", (message) => {
        logInfo("[io    ] WELCOME ", message);

        io.to(users[message.to]).emit("welcome", message.data);
    });

    socket.on("sig:offer", (message) => {
        logInfo("[io    ] OFFER ", message);
        socket.to("room").emit("sig:offer", message);
    });

    socket.on("sig:candidate", (message) => {
        logInfo("[io    ] ICE ", message);
        socket.to("room").emit("sig:candidate", message);
    });

    socket.on("disconnect", () => {
        console.log("DISCONNETED")

        let id = Object.keys(users).find((id) => {
            return (users[id] === socket.id);
        });

        delete users[id];
        socket.to("room").emit("bye", { id: id });
    });

    socket.on("jsongle", (message) => {
        logInfo("[io    ] MESSAGE ", message);

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
                        initiated: message.jsongle.initiated,
                        ended: message.jsongle.ended,
                        ended_reason: message.jsongle.ended_reason,
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

// io.sockets.on("disconnect", () => {
//     logInfo("[io    ] client connected");
// });

http.listen(8080, () => {
    logInfo("[server] started on port 8080");
});
