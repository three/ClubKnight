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
const bodyparser = require("body-parser");
const winston = require("winston");

const servestatic = require("./servestatic");
const servesocket = require("./servesocket");
const serveauth   = require("./serveauth");
const persistence = require("./persistence");
const email       = require("./email");

var running = false; 
var lobby, expressapp, server, io, logger;

function startServer(port, opts, initCallback) {
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

    // Express
    logger.info("Initializing Express (w/ middleware)...");
    expressapp = express();
    expressapp.set("port",port);
    expressapp.use(bodyparser.urlencoded({
        extended: true,
    }));

    // Persistence
    persistence.setLogger(logger);
    if ( opts.serveauth || opts.servelobby ) {
        logger.info("Initializing Persistence...");
        persistence.initPersistence({
        });
    } else {
        logger.info("Server NOT initializing Persistence");
    }

    // Email
    email.setLogger(logger);
    if ( opts.serveauth ) {
        logger.info("Initializing Email...");
        email.initEmail({
            apikey: opts.sendgrid_apikey,
            valSubject: opts.email_valsubject,
            valBody: opts.email_valbody,
            from: opts.email_from,
            basedomain: opts.email_basedomain,
        });
    } else {
        logger.info("Server NOT initializing Email");
    }

    // Static
    servestatic.setLogger(logger);
    if ( opts.servestatic ) {
        logger.info("Initializing Static...");
        servestatic.serveStatic(expressapp);
    } else {
        logger.info("Server NOT initializing Static");
    }

    // Auth
    serveauth.setLogger(logger);
    if ( opts.serveauth ) {
        logger.info("Initializing Auth...");
        serveauth.serveAuth(expressapp, {
            insecure: opts.insecure
        });
    } else {
        logger.info("Server NOT initializing Auth");
    }

    // Server
    logger.info("Starting Server...");
    server = http.Server(expressapp);

    // Lobby
    servesocket.setLogger(logger);
    if ( opts.servelobby ) {
        logger.info("Initializing Lobby...");
        servesocket.serveSocket(server, {});
    } else {
        logger.info("Server NOT initializing Lobby");
    }

    logger.info("-- ALL MODULES INITIALIZED! --");
    server.listen(port);

    logger.info("Listening on "+":"+port);

    setImmediate(function () {
        // TODO: Wait for each module to finish first
        initCallback();
    });
}

function stopServer() {
    if (!running)
        throw new Error("Server is not running.");

    running = false;
    // TODO: Gracefully tell all modules to stop
    return;
}

module.exports = {
    startServer,
    stopServer,
};
