/**
 * serveauth.js
 *
 * Serves authentication pages to authorize users (ensure they're rutgers
 * students)
 */
"use strict";

const path = require("path");
const argon = require("argon2");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const persist = require("./persistence");

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

        // Validate user data format
        validateRegistrationData(req.body).then((data) => {
            if (!data.valid) {
                log.info("User sent invalid data.");
                return;
            }

            log.info("Comitting valid data to database.", data);
            persist.registerUser(
                    data.netid,
                    data.pass,
                    data.salt,
                    0, 1 // TODO: Validate they're a student
                    );
        }).catch((err) => {
            log.info("Error during data validation.", err);
        });

        res.sendFile(regpageP);
    });

    app.get("/login.html", function (req,res) {
        res.sendFile(loginpageG);
    });
    app.post("/login.html", function (req, res) {
        // TODO: Logging Passwords is bad
        log.info("Request to login.",req.body);

        if (!req.body.netid || !req.body.pass) {
            res.sendFile(loginpageP0);
            return;
        }

        var user;
        persist.getUserByNetid(req.body.netid).then((row) => {
            user = row;
            if ( user.valid===0 ) {
                res.sendFile(loginpageP0);
            }
            return argon.verify(user.pass, req.body.pass);
        }).catch(() => {
            // No such user
            log.info("Couldn't find user");
            res.sendFile(loginpageP0);
        }).then((match) => {
            if (!match) {
                // Wrong password
                res.sendFile(loginpageP0);
                return;
            }

            crypto.pseudoRandomBytes(30, (err,randomness) => {
                log.info(err, randomness);
                var token = generateSecureToken(randomness);
                persist.addAuth(
                        user.netid, token, Date.now()+60*60*1000
                        );

                // TODO: Don't log tokens
                log.info("Using token:", token);

                res.cookie("auth", token, {maxAge: 60*60*1000});
                res.sendFile(loginpageP1);
            });

        }).catch( (err) => {
            log.info("Error, don't know what", err.message);
            res.sendFile(loginpageP0);
        });
    });

    // Although it will probably be necessary to validate using email,
    // it may worth looking into passportjs-SAML to use Rutgers CAS directly.
}

function validateRegistrationData(body) {
    var data = {
        valid: false,
        netid: "",
        pass: "",
        salt: null, // TODO: Do we need to store the salt?
    };

    // Make sure we were sent the proper form fields
    if (!body.netid)
        return Promise.resolve(data);
    if (!body.pass)
        return Promise.resolve(data);

    // Make sure netid is valid. I'm probably being overly cautious in
    // not trusting javascript string from outside sources, but whatever
    for (let i=0;i<body.netid.length;i++) {
        let c = body.netid[i].charCodeAt(0);
        if (i>8) // How long can netid's be?
            return Promise.resolve(data);
        if (c<48)
            return Promise.resolve(data);
        if (c<58) // numbers
            data.netid += String.fromCharCode(c);
        if (c<65)
            return Promise.resolve(data);
        else if (c<91) // uppercase
            data.netid += String.fromCharCode(c+65);
        else if (c<97)
            return data;
        else if (c<123) // lowercase
            data.netid += String.fromCharCode(c);
        else
            return data;
    }

    return argon.generateSalt().then((salt) => {
        data.salt = salt;
        return argon.hash(body.pass, data.salt);
    }).then((pass) => {
        data.pass = pass;

        data.valid = true;
        return Promise.resolve(data);
    });
}

function generateSecureToken(randomness) {
    // 20 characters, each character contains
    // 4 bits of randomness
    var token="";
    for (let c of randomness) {
        let low  = c&0x0f;
        let high = c>>4;
        token += String.fromCharCode(low+65);
        token += String.fromCharCode(high+65);
    }
    return token;
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    serveAuth,
    setLogger,
};
