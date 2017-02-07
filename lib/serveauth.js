/**
 * serveauth.js
 *
 * Serves authentication pages to authorize users (ensure they're rutgers
 * students)
 */
"use strict";

const path = require("path");
const sodium = require("libsodium");
const bodyParser = require("body-parser");

var log = console;

function serveAuth(app) {
    // First configure middleware
    app.use(bodyParser.urlencoded({
        extended: true,
    }));

    let authdir = path.join(__dirname, "../auth");

    let loginpageG = path.join(authdir, "login_GET.html");
    let loginpageP0 = path.join(authdir, "login_POST0.html");
    let loginpageP1 = path.join(authdir, "login_POST1.html");
    let regpageG = path.join(authdir, "register_GET.html");
    let regpageP = path.join(authdir, "register_POST.html");

    app.get("/register.html", function (req,res) {
        res.sendFile(regpageG);
    });
    app.post("/register.html", function (req, res) {
        // TODO: Don't log passwords
        log.info("User Registration", req.body);
        res.sendFile(regpageP);
    });

    app.get("/login.html", function (req,res) {
        res.sendFile(loginpageG);
    });
    app.post("/login.html", function (req, res) {
        // TODO: Logging Passwords is bad
        log.info("Request to login.",req.body);
        if (req.body.netid)
            res.sendFile(loginpageP1);
        else
            res.sendFile(loginpageP0);
    });

    // TODO: The entire authentication process

    // Although it will probably be necessary to validate using email,
    // it may worth looking into passportjs-SAML to use Rutgers CAS directly.
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    serveAuth,
    setLogger,
};
