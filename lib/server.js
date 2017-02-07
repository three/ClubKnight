/**
 * server.js
 *
 * Starts and manages server. The server consists of three main components:
 *  - Static Pages (disabled by option)
 *  - Websockets Server
 *  - Authentication Server
 */

"use strict";

const http = require("http");
const express = require("express");
const winston = require("winston");

const servestatic = require("./servestatic");
const servesocket = require("./servesocket");
const serveauth   = require("./serveauth");
const persistence = require("./persistence");

var running = false; 
var lobby, expressapp, server, io, logger;

function startServer(port, opts) {
    if (running)
        throw new Error("Server is already running.");
    running = true;

    console.log("Switching to Winston for logging...");
    logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                timestamp: () =>
                    "["+Date.now().toString(10)+"]"
            }),
        ],
    });
    logger.info("CLUB RU, Starting Server...");
    logger.info("Printing Version Information...");
    logger.info( JSON.stringify(process.versions) );

    expressapp = express();
    expressapp.set("port",port);

    persistence.setLogger(logger);
    persistence.initPersistence();

    servestatic.setLogger(logger);
    if (!opts.nostatic)
        servestatic.serveStatic(expressapp);

    serveauth.setLogger(logger);
    serveauth.serveAuth(expressapp);

    server = http.Server(expressapp);

    servesocket.setLogger(logger);
    servesocket.serveSocket(server);

    server.listen(port);

    logger.info("Listening on "+":"+port);
}

function stopServer() {
    if (!running)
        throw new Error("Server is not running.");

    // TODO: Stop and destruct all global objects. Gracefully report
    // to clients server is stopping.
    //running = false;
}

module.exports = {
    startServer,
    stopServer,
};
