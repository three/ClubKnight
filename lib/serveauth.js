/**
 * serveauth.js
 *
 * Serves authentication pages to authorize users (ensure they're rutgers
 * students)
 */
"use strict";

const path = require("path");
const bodyParser = require("body-parser");
const crypto = require("crypto");
var argon;

const persist = require("./persistence");

var log = console;
var insecure = false;

function serveAuth(app, opts) {
    // Because the argon2 module is seemingly impossible to compile on Windows
    // users have the option of an "insecure" mode, not requiring argon
    insecure = opts.insecure;
    if (!opts.insecure) {
        argon = require("argon2");
    }

    // Configure middleware to help with POST decoding
    app.use(bodyParser.urlencoded({
        extended: true,
    }));

    app.get("/register.html", function (req,res) {
        res.sendFile(authPage("register_GET.html"));
    });
    app.post("/register.html", function (req, res) {
        // TODO: We should probably send different responses if data is
        // not valid
        res.sendFile(authPage("register_POST.html"));

        // TODO: Don't log passwords
        log.info("User Registration", req.body);

        // Make sure request is valid
        if (!(/^[a-z0-9]{2,10}$/).test(req.body.netid)) {
            return;
        }

        sendValidationRequest(req.body.netid);
    });

    app.get("/login.html", function (req,res) {
        res.sendFile(authPage("login_GET.html"));
    });
    app.post("/login.html", function (req, res) {
        // TODO: Logging Passwords is bad
        log.info("Request to login.",req.body);

        if (!req.body.netid || !req.body.pass) {
            res.sendFile(authPage("login_POST0.html"));
            return;
        }

        var user;
        persist.getUserByNetid(req.body.netid).then((row) => {
            user = row;
            if ( user.valid===0 ) {
                res.sendFile(authPage("login_POST0.html"));
                return;
            }
            return verifyPassword(user.pass, req.body.pass);
        }).catch(() => {
            // No such user
            log.info("Couldn't find user");
            res.sendFile(authPage("login_POST0.html"));
        }).then((match) => {
            if (!match) {
                // Wrong password
                res.sendFile("login_POST0.html");
                return;
            }

            crypto.randomBytes(30, (err,randomness) => {
                log.info(err, randomness);
                var token = generateSecureToken(randomness);
                persist.addAuth(
                        user.netid, token, Date.now()+60*60*1000
                        );

                // TODO: Don't log tokens
                log.info("Using token:", token);

                res.cookie("auth", token, {maxAge: 60*60*1000});
                res.sendFile(authPage("login_POST1.html"));
            });

        }).catch( (err) => {
            log.info("Error, don't know what", err.message);
            res.sendFile(authPage("login_POST0.html"));
        });
    });

    app.get("/validate.html", function (req, res) {
        res.sendFile(authPage("validate_GET.html"));
    });
    app.post("/validate.html", function (req, res) {
        // TODO: Don't log this stuff
        log.info("Request to validate.", req.bedy);

        if (!(/[A-Z]{30}/).test(req.body.token)
         || !(/.{1,1000}/).test(req.body.pass) ) {
            res.sendFile(authPage("validate_POST0.html"));
            return;
        }

        var netid, hash;
        persist
            .popValidationByTokenAndUnexpired(req.body.token, Date.now())
            .then((row) => {
                log.info("ROW_: ", row);
                netid = row.netid;
                log.info("Got netid", netid);
                // Valid Token, hash the password
                return hashPassword(req.body.pass);
            }).then((h) => {
                hash = h;
                log.info("Got hash");
                // Determine is user exists
                return persist.doesUserExistWithNetid(netid);
            }).then((exists) => {
                log.info("exists: ", exists);
                if (exists) {
                    // User already exists, no need to create him
                    return Promise.resolve(true);
                } else {
                    // Add User
                    return persist.addUser(netid, hash, "", 0, 1)
                        .then(()=>Promise.resolve(false));
                }
            }).then((needUpdate) => {
                log.info("needUpdate: ",needUpdate);
                if (!needUpdate)
                    return Promise.resolve();
                return persist.updateUserPassByNetid(netid, hash);
            }).then(() => {
                log.info("Sending response.");
                res.sendFile(authPage("validate_POST1.html"));
            }).catch((e) => {
                log.info("Caught promise at end of validation.", e);
                res.sendFile(authPage("validate_POST0.html"));
            });
    });

    // Although it will probably be necessary to validate using email,
    // it may worth looking into passportjs-SAML to use Rutgers CAS directly.
}

function authPage(page) {
    let authdir = path.join(__dirname, "../auth");
    return path.join(authdir, page);
}

function sendValidationRequest(netid) {
    crypto.randomBytes(30, (err, randomness) => {
        var token = generateSecureToken(randomness);
        persist.addValidation(netid, token, Date.now()+3*60*60*1000);

        // TODO: Don't log this
        log.info("VALIDATION TOKEN CREATED: ", token);
    });
}

function hashPassword(pass) {
    // Depending on if we are in insecure mode passwords will either be
    // hashed using node's built-in SHA256 function or a secure Argon2
    // function.
    if (insecure) {
        // There's no gain to salting a sha256 hash, as a modern computer
        // will hash the string faster than it can download precalculated
        // hashes
        let hash = crypto.createHash("sha256").update(pass).digest("base64");
        return Promise.resolve(hash);
    } else {
        // Unfortunately, argon can not run securely in plain Javascript,
        // so we must use the compiled module
        return argon.generateSalt().then((salt) => {
            return argon.hash(pass, salt);
        });
    }
}

function verifyPassword(real, check) {
    if (insecure) {
        let hash = crypto.createHash("sha256").update(check).digest("base64");
        if ( hash == real ) {
            return Promise.resolve(true);
        }
    } else {
        return argon.verify(real, check);
    }
}

function generateSecureToken(randomness) {
    // 2 characters per byte of randomness
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
