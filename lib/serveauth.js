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
        // Destruct request and ensure it's valid
        var { netid, pass } = req.body;
        if (!netid || !pass) {
            res.sendFile(authPage("login_POST0.html"));
            return;
        }

        var user;
        persist.getUser({$netid: netid}).then((row) => {
            user = row;

            // Refuse to login if user hasn't been validated, or user
            // with netid doesn't exist
            if ( !user || user.valid === 0 ) {
                res.sendFile(authPage("login_POST0.html"));
                return;
            }
            return verifyPassword(user.pass, pass);
        }).then((match) => {
            // Refuse to login if password doesn't match
            if (!match) {
                res.sendFile("login_POST0.html");
                return;
            }

            return generateRandomToken(30);
        }).then((token) => {
            // Add generated token to authentication table
            let expireTime = Date.now()+60*60*1000; // 1 hour
            persist.addAuth({
                $netid: netid,
                $token: token,
                $expire: expireTime,
            });
            res.cookie("auth", token, {maxAge: 60*60*1000});
            res.sendFile(authPage("login_POST1.html"));
        }).catch((err) => {
            // If we reach this point there's a bug in the code
            log.error("Uncaught error during login!\n", err.message);
            res.sendFile(authPage("login_POST0.html"));
        });
    });

    app.get("/validate.html", function (req, res) {
        res.sendFile(authPage("validate_GET.html"));
    });
    app.post("/validate.html", function (req, res) {
        // Destructure and validate data
        var { token: token,
              pass: newpass } = req.body;
        if (!(/[A-Z]{30}/).test(token)
         || !(/.{1,1000}/).test(newpass) ) {
            res.sendFile(authPage("validate_POST0.html"));
            return;
        }

        var netid, hash;
        persist.popValidation({
            $token: token,
            $expire: Date.now(),
        }).then((row) => {
            // Netid is valid and in table, now we must has the password
            netid = row.netid;
            return hashPassword(newpass);
        }).then((h) => {
            hash = h;
            return getUser({
                $netid: netid,
            });
        }).then((user) => {
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
        }).then(() => {
            res.sendFile(authPage("validate_POST1.html"));
        }).catch((err) => {
            log.error("Uncaught error while validating!\n", err);
            res.sendFile(authPage("validate_POST0.html"));
        });
    });
}

function authPage(page) {
    let authdir = path.join(__dirname, "../auth");
    return path.join(authdir, page);
}

function sendValidationRequest(netid) {
    return generateSecureToken(30).then((token) => {
        let expireTime = Date.now()+3*60*60*1000; // 3 hours
        persist.addValidation({
            $netid: netid,
            $token: token,
            $expire: expireTime,
        });

        //TODO: Use SendGrid to send validation email
        log.info("Created validation token for ", netid, ": ", token);
        log.info("Token has NOT been sent to user");
        return Promise.resolve(true);
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
        Promise.resolve( hash == real );
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
