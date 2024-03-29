const morgan = require("morgan");
const fs = require('fs');
const express = require("express");

const cors = require('cors');

const { CONFIG, configure } = require("./modules/services/config");
const { info, debug, setLevelTo, getLogLevel, createLogger, error } = require("./modules/services/logger");
const socket = require('./modules/services/socket');
const { collect, requestCounters, responseCounters, resetAllCustomMetrics} = require("./modules/services/prom");
const {setUpTime} = require("./modules/helpers/common");

const moduleName = "server";

const initialize = () => {
    setUpTime();
    configure();
    createLogger();
    setLevelTo(CONFIG().logDefaultLevel);
    resetAllCustomMetrics();
    debug({ module: moduleName, label: `Log level set to ${getLogLevel()}` });

    debug({ module: moduleName, label: "---------------------------------------------------------------------" });
    info({ module: moduleName, label: "welcome to JSONgle Signaling Server!" });

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

    const options = {};
    let useHTTPS = false;

    if(CONFIG().useHTTPS) {
        if (fs.existsSync(String(CONFIG().key)) && fs.existsSync(String(CONFIG().cert))) {
            options.key = fs.readFileSync(String(CONFIG().key));
            options.cert = fs.readFileSync(String(CONFIG().cert));
            useHTTPS = true;
            debug({ module: moduleName, label: `using HTTPS` });
        } else {
            error({
                module: moduleName,
                label: `file ${String(CONFIG().key)} or ${String(CONFIG().cert)} is missing - can't start REST and Websocket servers in HTTPS`
            });
        }
    } else {
        debug({ module: moduleName, label: `using HTTP` });
    }

    debug({ module: moduleName, label: `setup REST API server on port ${CONFIG().restPort}` });
    const restServer = useHTTPS ? require('https').createServer(options, app) : require('http').createServer(options, app);
    restServer.listen(CONFIG().restPort, () => {
        debug({ module: moduleName, label: `${useHTTPS ? "HTTPS" : "HTTP"} REST API server started successfully on port ${CONFIG().restPort}` });
    });

    debug({ module: moduleName, label: "start collecting metrics" });
    collect();

    debug({ module: moduleName, label: `setup webSockets server on port ${CONFIG().wsPort}` });
    const wsServer = useHTTPS ? require('https').createServer(options): require('http').createServer(options);
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

    debug({ module: moduleName, label: "setup routes for API server" });
    require('./modules/routes/serviceability')(app, io);
    require('./modules/routes/metrics')(app, io);

    info({ module: moduleName, label: `initialization done!` });
};

initialize();

process.once("SIGHUP", function () {
    debug({ module: moduleName, label: "process restarted" });
});
