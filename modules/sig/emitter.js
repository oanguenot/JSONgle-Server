const { debug } = require("../services/logger");
const { COMMON } = require("../helpers/helper");

const moduleName = "emitter";

exports.emitMessage = (message, socket, io, toAll = false) => {
  if (toAll) {
    debug({ module: moduleName, method: "SEND *", message });

    const mappedClients = io.sockets.adapter.rooms.get(message.to);
    if (mappedClients) {
      mappedClients.forEach((id) => {
        if (id !== socket.id) {
          // emit message to members
          message.from = message.to;
          message.to = id;
          const client = io.of('/').sockets.get(id);
          client.emit(COMMON.JSONGLE, message);
        }
      });
    }
  } else {
    debug({ module: moduleName, method: "SEND", message });
    socket.emit(COMMON.JSONGLE, message);
  }
}