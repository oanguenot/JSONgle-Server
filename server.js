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

const initialize = () => {

    info("---------------- JSONGLE-SERVER started!");

    debug("Read env config");
    dotenv.config();

    info(`Started instance ${process.env.id}`);

    setLevelTo(process.env.logDefaultLevel);
    debug("Log level set to ", { 'level': getLogLevel() });

    debug("Initialize morgan");
    morgan(":method :url :status :res[content-length] - :response-time ms");

    debug("Initialize express");
    const app = express();

    debug("Set cors");
    app.use(cors());

    debug("Setup middleware for metrics");
    app.use(requestCounters);
    app.use(responseCounters);

    debug(`Setup REST API server on port ${process.env.restPort}`);
    const restServer = require('https').createServer(options, app);
    restServer.listen(8081, () => {
        debug(`REST API server started! successfully on port ${process.env.restPort}`);
    });

    debug("Setup routes for API server");
    require('./modules/routes/serviceability')(app);
    require('./modules/routes/metrics')(app);

    debug("Start collecting metrics");
    collect();

    debug(`Setup WebSocket server on port ${process.env.wsPort}`);
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
        debug(`WebSocket server started successfully on port ${process.env.wsPort}!`);
    });
}

initialize();

process.once("SIGHUP", function () {
    debug("process restarted");
})
