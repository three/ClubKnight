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
                    new Buffer(0), // TODO: Argon stores salts for us
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
            return verifyPassword(user.pass, req.body.pass);
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

            crypto.randomBytes(30, (err,randomness) => {
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

    // Verify netid
    data.netid = body.netid.trim();
    if (!(/^[a-z0-9]{2,10}$/).test(data.netid)) {
        // Netid is invalid
        return Promise.resolve(data);
    }

    return hashPassword(body.pass).then((pass) => {
        data.pass = pass;
        data.valid = true;
        return Promise.resolve(data);
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
        }).then((hash) => {
            // The salt is included in the output of argon2, so we only
            // need to return the hash
            return hash;
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
