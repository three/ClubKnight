/**
 * persistence.js
 *
 * Stores and manages data that will remain persistent between server restarts
 */
/* eslint-env node */
"use strict";

const sqlite3 = require("sqlite3");
const path = require("path");
const fs = require("fs");

var log = console;

var db;

/**
 * Initialized Persistence module
 * This function is blocking (don't block in non-init functions).
 */
function initPersistence() {
    // Initialize persistent database on filesystem
    let dataDir = path.join(__dirname, "../data/");
    let dbFile = path.join(dataDir, "persistence.sqlite");
    if (!fs.existsSync(dataDir))
        fs.mkdirSync(dataDir);
    db = new sqlite3.Database(dbFile);

    db.serialize(function () {
        // The "users" table is used to store information about users, such
        // as how much money they have and what their netid is
        db.run("CREATE TABLE IF NOT EXISTS users ("
                +"id INTEGER PRIMARY KEY AUTOINCREMENT,"
                +"netid TEXT,"
                +"pass TEXT,"
                +"money INTEGER,"
                +"valid INTEGER"
                +")");

        // The "auth" table is used to store authentication keys that users
        // receive when they log in
        db.run("CREATE TABLE IF NOT EXISTS auth("
                +"id INTEGER PRIMARY KEY AUTOINCREMENT,"
                +"netid TEXT,"
                +"key TEXT,"
                +"expire INTEGER"
                +")");
        
        // The "validations" table is used to store validations for account
        // creation and password resets, which can be entered at /validate.html
        db.run("CREATE TABLE IF NOT EXISTS validations("
                +"netid TEXT,"
                +"token TEXT,"
                +"expire INTEGER"
                +")");

        log.info("Sqlite3 database opened and initalized at ", dbFile);
    });
}

/**
 * Creates an error based on node-sqlite
 */
function createError(orig, msg, data) {
    // Unfortunately, node-sqlite does not provide provide enough information
    // (eg: stack traces) to properly debug, so we must wrap in our own error
    // creating function. Using this function will cause createError to appear
    // on the stack trace, therefore the source of the error will the stack
    // frame above the top.
    var serialized = JSON.stringify(data);
    var fullMessage = orig.message + " " + msg + " " + serialized;
    var err = new Error(fullMessage);
    err.data = data;

    return err;
}

//
// Table "auth"
//

/**
 * Adds a row into the "auth" table.
 */
function addAuth(params) {
    const query = "INSERT INTO auth (netid, key, expire) "
                 +"VALUES ($netid,$key,$expire)";

    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err)
                reject(createError(err, "(in addAuth)", params));
            else
                resolve(true);
        });
    });
}

/**
 * Get auth in "auth" table
 */
function getAuth(params) {
    if (params.$key == "")
        return Promise.resolve(null);

    const query = "SELECT * FROM auth "
                 +"WHERE key=$key AND expire>$expire";

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err)
                reject(createError(err, "(in getAuth)", params));
            else
                resolve(row);
        });
    });
}

//
// Table "users"
//

/**
 * Add a row into "users" table.
 */
function addUser(params) {
    const query = "INSERT INTO users "
                 +"(netid, pass, money, valid) "
                 +"VALUES ($netid, $pass, $money, $valid)";

    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err)
                reject(createError(err, "(in addUser)", params));
            else
                resolve(true);
        });
    });
}

/**
 * Get user with specified netid
 */
function getUser(params) {
    const query = "SELECT * FROM users where netid=$netid";

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err)
                reject(createError(err, "(in getUser)", params));
            else
                resolve(row);
        });
    });
}

/**
 * Change password of "user" row with matching netid
 * Will resolve undefined if no such user exists
 */
function updateUserPass(params) {
    const query = "UPDATE users "
                 +"SET pass=$newpass "
                 +"WHERE netid=$netid";

    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err)
                reject(createError(err, "(in updateUserPass)", params));
            else
                resolve(true);
        });
    });
}

//
// Table "validations"
//

/**
 * Add a row into "validations" table
 */
function addValidation(params) {
    const query = "INSERT INTO validations "
                 +"(netid, token, expire) "
                 +"VALUES ($netid, $token, $expire)";

    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err)
                reject(createError(err, "(in addValidation)", params));
            else
                resolve(true);
        });
    });
}

/**
 * Finds and deletes row in "validations" by netid and with unexpired token
 * Resolves row that was deleted or undefined if no such row existed
 *
 * TODO: These operations should be atomic to prevent double validation
 */
function popValidation(params) {
    const queryFind = "SELECT * FROM validations "
                     +"WHERE token=$token AND expire>$expire";

    const queryDelete = "DELETE FROM validations WHERE token=$token";

    var paramsFind = params;
    var paramsDel = { $token: params.$token };

    return new Promise((resolve, reject) => {
        db.get(queryFind, paramsFind, (errFind, row) => {
            if (errFind) {
                reject(createError(errFind, "(in popValidation, find)", params));
                return;
            }

            db.run(queryDelete, paramsDel, (errDel) => {
                if (errDel)
                    reject(createError(errDel, "(in popValidation, del)", params));
                else
                    resolve(row);
            });
        });
    });
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    initPersistence,
    setLogger,

    addAuth,
    getAuth,

    addUser,
    getUser,
    updateUserPass,

    addValidation,
    popValidation,
};

