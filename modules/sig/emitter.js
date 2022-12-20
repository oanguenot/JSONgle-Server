const { debug } = require("../services/logger");
const { COMMON, JSONGLE_EVENTS_NAMESPACE } = require("../helpers/helper");
const {addSentTotalCounter} = require("../services/prom");

const moduleName = "sig:emit";

exports.emitMessage = (message, socket, io, toAll = false) => {
  if (toAll) {
    debug({ module: moduleName, method: "SEND *", message });

    const mappedClients = io.sockets.adapter.rooms.get(message.to);
    if (mappedClients) {
      mappedClients.forEach((id) => {
        if (id !== socket.id) {
          const msg = { ...message };
          // emit message to members
          if (message.jsongle.namespace === JSONGLE_EVENTS_NAMESPACE.MUC) {
            msg.from = `${message.to}/${socket.data.uid}`;
          } else {
            msg.from = message.to;
          }
          msg.to = id;
          const client = io.of('/').sockets.get(id);
          client.emit(COMMON.JSONGLE, msg);

          const message_size = Buffer.byteLength(JSON.stringify(msg)) / 1000 / 1000;
          addSentTotalCounter(message_size);
        }
      });
    }
  } else {
    debug({ module: moduleName, method: "SEND", message });
    socket.emit(COMMON.JSONGLE, message);

    const message_size = Buffer.byteLength(JSON.stringify(message)) / 1000 / 1000;
    addSentTotalCounter(message_size);
  }
}
