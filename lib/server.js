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
const email       = require("./email");

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
    persistence.initPersistence({
    });

    email.setLogger(logger);
    email.initEmail({
        apikey: opts.sendgrid_apikey,
        valSubject: opts.email_valsubject,
        valBody: opts.email_valbody,
        from: opts.email_from,
        basedomain: opts.email_basedomain,
    });

    servestatic.setLogger(logger);
    if (!opts.nostatic)
        servestatic.serveStatic(expressapp);

    serveauth.setLogger(logger);
    serveauth.serveAuth(expressapp, {
        insecure: opts.insecure
    });

    server = http.Server(expressapp);

    servesocket.setLogger(logger);
    servesocket.serveSocket(server, {});

    server.listen(port);

    logger.info("Listening on "+":"+port);
}

function stopServer() {
    if (!running)
        throw new Error("Server is not running.");

    // TODO
    // running = false;

    throw new Error("Not Yet Implemented!");
}

module.exports = {
    startServer,
    stopServer,
};
