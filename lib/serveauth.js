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
const email = require("./email");

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

    app.get("/auth/register", function (req,res) {
        res.redirect(301, "/register.html");
    });
    app.post("/auth/register", function (req, res) {
        res.setHeader("Content-Type", "application/json");

        // Make sure request is valid
        let netid = req.body.netid;
        if (!(/^[a-z0-9]{2,10}$/).test(netid)) {
            res.status(400);
            res.send(JSON.stringify({
                success: -1,
                message: "Invalid netid",
                netid: null,
            }));
            return;
        }

        let valtoken;
        generateSecureToken(30).then((token) => {
            let expireTime = Date.now()+3*60*60*1000; // 3 hours
            valtoken = token;

            //TODO: Don't log the validation code
            log.info("Created validation token for ", netid, ": ", token);

            return persist.addValidation({
                $netid: netid,
                $token: token,
                $expire: expireTime,
            })
        }).then((succ) => {
            return email.sendValidation({
                netid: netid,
                token: valtoken
            });
        }).then((r) => {
            res.send(JSON.stringify({
                success: 1,
                message: "You registered successfully!",
                netid: netid,
            }));
        }).catch((err) => {
            log.error("Uncaught error while sending validation.\n", err);
            res.status(500);
            res.send(JSON.stringify({
                success: -1,
                message: "Unknown Error (see log)",
                netid: null,
            }));
        });
    });

    app.get("/auth/login", function (req,res) {
        res.redirect(301, "/login.html");
    });
    app.post("/auth/login", function (req, res) {
        // TODO: Seperate JSON return logic into seperate function
        res.setHeader("Content-Type", "application/json");

        // Destruct request and ensure it's valid
        var { netid, pass } = req.body;
        if (!netid || !pass) {
            res.status(400);
            res.setHeader("Content-Type", "application/json");
            res.send(JSON.stringify({
                success: -1,
                message: "Invalid netid or password!",
                netid: null,
                auth: null,
            }));
            return;
        }

        var user;
        //TODO: Restructure to avoid using null to short circuit
        persist.getUser({$netid: netid}).then((row) => {
            user = row;

            // Refuse to login if user hasn't been validated, or user
            // with netid doesn't exist
            if ( !user || user.valid === 0 ) {
                res.status(400);
                res.send(JSON.stringify({
                    success: -1,
                    message: "Invalid netid or password!",
                    netid: null,
                    auth: null,
                }));
                return Promise.resolve(null);
            }
            return verifyPassword(user.pass, pass);
        }).then((match) => {
            if (match===null) return Promise.resolve(null);

            // Refuse to login if password doesn't match
            if (!match) {
                res.status(400);
                res.send(JSON.stringify({
                    success: -1,
                    message: "Invalid netid or password!",
                    netid: null,
                    auth: null,
                }));
                return Promise.resolve(null);
            }

            return generateSecureToken(30);
        }).then((key) => {
            if (key===null) return Promise.resolve(null);

            // Add generated token to authentication table
            // TODO: Don't respond until after adding to table
            let expireTime = Date.now()+60*60*1000; // 1 hour
            res.cookie("auth", key, {maxAge: 60*60*1000});
            res.send(JSON.stringify({
                success: 1,
                message: "Successfully logged in.",
                netid: netid,
                auth: key,
            }));

            return persist.addAuth({
                $netid: netid,
                $key: key,
                $expire: expireTime,
            });
        }).then((s) => {
            if (!s) return Promise.resolve(null);
        }).catch((err) => {
            // If we reach this point there's a bug in the code
            log.error("Uncaught error during login!\n", err);
            res.status(500);
            res.setHeader("Content-Type", "application/json");
            res.send(JSON.stringify({
                success: -1,
                message: "",
                netid: null,
                auth: null,
            }));
        }).catch((err) => {
            // TODO: Add this to all functions promises that respond in catch
            log.error("Error while catching error (login)!\n", err);
        });
    });

    app.get("/auth/validate", function (req, res) {
        res.redirect(301, "/validate.html");
    });
    app.post("/auth/validate", function (req, res) {
        // Destructure and validate data
        var { token: token,
              pass: newpass } = req.body;
        if (!(/[A-Z]{30}/).test(token)) {
            res.status(400);
            res.send(JSON.stringify({
                success: -1,
                message: "Invalid token!",
            }));
            return;
        }
        if (!(/.{1,1000}/).test(newpass)) {
            res.status(400);
            res.send(JSON.stringify({
                success: -2,
                message: "Invalid password!",
            }));
            return;
        }

        var netid, hash;
        persist.popValidation({
            $token: token,
            $expire: Date.now(),
        }).then((row) => {
            if (!row) {
                // We don't have that validation with that token
                res.status(400);
                res.send(JSON.stringify({
                    success: -1,
                    message: "Invalid token!",
                }));

                // Unfortunately, ES6 promises don't give us an easy way (eg.
                // promise.stop) to short-circuit promises. When/if we switch
                // to NodeJS V7.6, this chain can be replaces with async
                // functions which (hopefully) will solve this problem.
                // To avoid doing something "dirty" like throwing errors,
                // we just use falsy values as a short-circuit signal.
                //
                // TODO: Find a better solution (this does not handle errors
                // well)
                return Promise.resolve(null);
            }

            // Validation is valid
            netid = row.netid;
            return hashPassword(newpass);
        }).then((h) => {
            if (!h) return Promise.resolve(null);

            hash = h;
            return persist.getUser({
                $netid: netid,
            });
        }).then((user) => {
            if (user===null) return Promise.resolve(null);

            if (!user) {
                return persist.addUser({
                    $netid: netid,
                    $pass: hash,
                    $money: 0,
                    $valid: 1,
                });
            } else {
                return persist.updateUserPass({
                    $netid: netid,
                    $newpass: hash,
                });
            }
        }).then((s) => {
            if (!s) return Promise.resolve(null);

            res.send(JSON.stringify({
                success: 1,
                message: "Your account has been successfully validated!",
            }));
        }).catch((err) => {
            log.error("Uncaught error while validating!\n", err);
            res.status(500);
            res.send(JSON.stringidy({
                success: -3,
                message: "Error while validating (see log)",
            }));
            return;
        });
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
        return Promise.resolve( hash == real );
    } else {
        return argon.verify(real, check);
    }
}

function generateSecureToken(bytesEntropy) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(bytesEntropy, (err, randomness) => {
            if (err)
                reject(err);
            else
                resolve(entropyToPlainText(randomness));
        });
    });
}

function entropyToPlainText(randomness) {
    // 2 characters per byte of randomness
    // (this could be improved, base64?)
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
