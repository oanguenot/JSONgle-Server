const express = require("express");
const path = require("path");
const { logInfo } = require("./modules/Logger");
const morgan = require("morgan");
//const { urlencoded } = require("express");
var fs = require('fs');

const { generateNewId } = require("./modules/helper")

morgan(":method :url :status :res[content-length] - :response-time ms");

const users = {};

var options = {
    key: fs.readFileSync('./certificates/server.key'),
    cert: fs.readFileSync('./certificates/server.crt')
};

var app = require('https').createServer(options);
var io = require('socket.io').listen(app);
app.listen(8080);


io.sockets.on("connection", (socket, pseudo) => {
    logInfo(`[io    ] new client connected ${socket.id}`);

    socket.join("room");

    socket.on("hello", (message) => {

        users[message.id] = socket.id;

        logInfo("[io    ] HELLO ", message);
        socket.to("room").emit("hello", message);
    });

    socket.on("welcome", (message) => {
        logInfo("[io    ] WELCOME ", message);

        io.to(users[message.to]).emit("welcome", message.data);
    });

    socket.on("disconnect", () => {
        let id = Object.keys(users).find((id) => {
            return (users[id] === socket.id);
        });

        delete users[id];
        socket.to("room").emit("bye", { id: id });
    });

    socket.on("jsongle", (message) => {
        logInfo("[io    ] MESSAGE ", message);

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
