const express = require("express");
const dotenv = require('dotenv');
const cors = require('cors')
const { info, debug, setLevelTo, getLogLevel } = require("./modules/services/logger");
const morgan = require("morgan");
const fs = require('fs');

const socket = require('./modules/services/socket');
const { collect, requestCounters, responseCounters } = require("./modules/services/prom");

const options = {
    key: fs.readFileSync('./certificates/server.key'),
    cert: fs.readFileSync('./certificates/server.crt')
};

const moduleName = "server";

const initialize = () => {

    dotenv.config();
    setLevelTo(process.env.logDefaultLevel);
    debug("Log level set to ", { 'level': getLogLevel() });

    debug({ module: moduleName, label: "---------------------------------------------------------------------" });
    info({ module: moduleName, label: "welcome to JSONgle-Server!" });

    info({ module: moduleName, label: `initialize instance ${process.env.id}...` });

    debug({ module: moduleName, label: "initialize morgan" });
    morgan(":method :url :status :res[content-length] - :response-time ms");

    debug({ module: moduleName, label: "initialize express" });
    const app = express();

    debug({ module: moduleName, label: "set cors" });
    app.use(cors());

    debug({ module: moduleName, label: "setup middleware for metrics" });
    app.use(requestCounters);
    app.use(responseCounters);

    debug({ module: moduleName, label: `setup REST API server on port ${process.env.restPort}` });
    const restServer = require('https').createServer(options, app);
    restServer.listen(8081, () => {
        debug({ module: moduleName, label: `REST API server started successfully on port ${process.env.restPort}` });
    });

    debug({ module: moduleName, label: "setup routes for API server" });
    require('./modules/routes/serviceability')(app);
    require('./modules/routes/metrics')(app);

    debug({ module: moduleName, label: "start collecting metrics" });
    collect();

    debug({ module: moduleName, label: `setup webSockets server on port ${process.env.wsPort}` });
    const wsServer = require('https').createServer(options);
    const io = require('socket.io')(wsServer, {
        cors: {
            origin: process.env.corsPolicyOrigin,
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    socket.listen(io);
    wsServer.listen(process.env.wsPort, () => {
        debug({ module: moduleName, label: `webSockets server started successfully on port ${process.env.wsPort}` });
    });

    info({ module: moduleName, label: `initialization done!` });
}

initialize();

process.once("SIGHUP", function () {
    debug({ module: moduleName, label: "process restarted" });
})
