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

    app.get("/register.html", function (req,res) {
        res.sendFile(authPage("register_GET.html"));
    });
    app.post("/register.html", function (req, res) {
        // Make sure request is valid
        let netid = req.body.netid;
        if (!(/^[a-z0-9]{2,10}$/).test(netid)) {
            // TODO: Different files for failure
            res.sendFile(authPage("register_POST.html"));
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
            res.sendFile(authPage("register_POST.html"));
        }).catch((err) => {
            res.sendFile(authPage("register_POST.html"));
            log.error("Uncaught error while sending validation.\n", err);
        });
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
                return Promise.resolve(null);
            }
            return verifyPassword(user.pass, pass);
        }).then((match) => {
            if (match===null) return Promise.resolve(null);

            // Refuse to login if password doesn't match
            if (!match) {
                res.sendFile(authPage("login_POST0.html"));
                return Promise.resolve(null);
            }

            return generateSecureToken(30);
        }).then((key) => {
            if (key===null) Promise.resolve(null);

            // Add generated token to authentication table
            // TODO: Don't respond until after adding to table
            let expireTime = Date.now()+60*60*1000; // 1 hour
            res.cookie("auth", key, {maxAge: 60*60*1000});
            res.sendFile(authPage("login_POST1.html"));

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
            if (!row) {
                // We don't have that validation with that token
                res.sendFile(authPage("validate_POST0.html"));

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
