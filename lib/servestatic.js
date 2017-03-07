/**
 * servestatic.js
 *
 * Serves the /static directory.
 */
/* eslint-env node */
"use strict";

const path = require("path");
const express = require("express");

var log = console;

function serveStatic(app) {
    let staticdir = path.join(__dirname, "../static");
    let indexfile = path.join(staticdir, "index.html");

    let route = express.static(staticdir);

    app.use(logRequest);
    app.use(route);

    app.get("/", function (req, res) {
        res.sendFile(indexfile);
    });
}

function logRequest(req, res, next) {
    log.info("Request for "+req.originalUrl+" from "+req.ip);

    next();
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    serveStatic,
    setLogger,
};
