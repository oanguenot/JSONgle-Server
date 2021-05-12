const morgan = require("morgan");
const fs = require('fs');
const express = require("express");

const cors = require('cors')

const { CONFIG, configure } = require("./modules/services/config");
const { info, debug, setLevelTo, getLogLevel, createLogger } = require("./modules/services/logger");
const socket = require('./modules/services/socket');
const { collect, requestCounters, responseCounters } = require("./modules/services/prom");

const moduleName = "server";

const initialize = () => {

    configure();
    createLogger();
    setLevelTo(CONFIG().logDefaultLevel);
    debug({ module: moduleName, label: `Log level set to ${getLogLevel()}` });

    debug({ module: moduleName, label: "---------------------------------------------------------------------" });
    info({ module: moduleName, label: "welcome to JSONgle-Server!" });

    info({ module: moduleName, label: `initialize instance ${CONFIG().id}...` });

    debug({ module: moduleName, label: "initialize morgan" });
    morgan(":method :url :status :res[content-length] - :response-time ms");

    debug({ module: moduleName, label: "initialize express" });
    const app = express();

    debug({ module: moduleName, label: "set cors" });
    app.use(cors());

    debug({ module: moduleName, label: "setup middleware for metrics" });
    app.use(requestCounters);
    app.use(responseCounters);

    const options = {
        key: fs.readFileSync(String(CONFIG().key)),
        cert: fs.readFileSync(String(CONFIG().cert))
    };

    debug({ module: moduleName, label: `setup REST API server on port ${CONFIG().restPort}` });
    const restServer = require('https').createServer(options, app);
    restServer.listen(8081, () => {
        debug({ module: moduleName, label: `REST API server started successfully on port ${CONFIG().restPort}` });
    });

    debug({ module: moduleName, label: "setup routes for API server" });
    require('./modules/routes/serviceability')(app);
    require('./modules/routes/metrics')(app);

    debug({ module: moduleName, label: "start collecting metrics" });
    collect();

    debug({ module: moduleName, label: `setup webSockets server on port ${CONFIG().wsPort}` });
    const wsServer = require('https').createServer(options);
    const io = require('socket.io')(wsServer, {
        cors: {
            origin: CONFIG().corsPolicyOrigin,
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    socket.listen(io, CONFIG());
    wsServer.listen(CONFIG().wsPort, () => {
        debug({ module: moduleName, label: `webSockets server started successfully on port ${CONFIG().wsPort}` });
    });

    info({ module: moduleName, label: `initialization done!` });
}

initialize();

process.once("SIGHUP", function () {
    debug({ module: moduleName, label: "process restarted" });
})
