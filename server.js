const express = require("express");
const cors = require('cors')

const path = require("path");
const { logInfo } = require("./modules/services/logger");
const morgan = require("morgan");
//const { urlencoded } = require("express");
var fs = require('fs');

const { generateNewId } = require("./modules/helper");
const socket = require('./modules/services/socket');
const { collect, requestCounters, responseCounters } = require("./modules/services/prom");

morgan(":method :url :status :res[content-length] - :response-time ms");

process.once("SIGHUP", function () {
    // Todo re-initialize data-models on reload
})

var app = express();

var options = {
    key: fs.readFileSync('./certificates/server.key'),
    cert: fs.readFileSync('./certificates/server.crt')
};

app.use(cors())
app.use(requestCounters);
app.use(responseCounters);

app.listen(8081, function () {
    console.log('CORS-enabled web server listening on port 8081')
})

require('./modules/routes/serviceability')(app);
require('./modules/routes/metrics')(app);


// Create server
var httpsServer = require('https').createServer(options);

const io = require('socket.io')(httpsServer, {
    cors: {
        origin: "https://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
  });

// Listen to clients
socket.listen(io);
httpsServer.listen(8080);

// Start collecting default metrics
collect();
