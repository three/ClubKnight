/**
 * persistence.js
 *
 * Stores and manages data that will remain persistent between server restarts
 */
"use strict";

const sqlite3 = require("sqlite3").verbose();

var log = console;

var db;

function initPersistence() {
    // TODO: Store database in a file so it, you know, persists
    db = new sqlite3.Database(":memory:");
    log.info("Creating sqlite3 database from memory.");

    // since we obviously don't have anything initialized, create the initial
    // database from scratch.
    db.serialize(function () {
        // The "users" table is used to store information about users, such
        // as how much money they have and what their netid is
        db.run("CREATE TABLE IF NOT EXISTS users ("
                +"id INTEGER PRIMARY KEY AUTOINCREMENT,"
                +"netid TEXT,"
                +"pass TEXT,"
                +"salt BLOB,"
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

        log.info("Sqlite3 database created.");
    });
}

// TODO: These functions should probably take objects to ease argument names

// TODO: Make all these functions fully promises-compliant

function addAuth($netid, $key, $expire) {
    db.run("INSERT INTO auth (netid, key, expire)"
            +"VALUES ($netid,$key,$expire)",
            {$netid, $key, $expire});
}

function addUser($netid, $pass, $salt, $money, $valid) {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO users"
                +"(netid, pass, salt, money, valid)"
                +"VALUES ($netid, $pass, $salt, $money, $valid)",
                {$netid, $pass, $salt, $money, $valid}, (err) => {
            (err?reject:resolve)();
        });
    });
}

function updateUserPassByNetid($netid, $newpass) {
    return new Promise((resolve, reject) => {
        db.run("UPDATE users "
                +"SET pass=$newpass "
                +"WHERE netid=$netid",
                {$netid, $newpass}, (err) => {
            (err?reject:resolve)(err);
        });
    });
}

function addValidation($netid, $token, $expire) {
    db.run("INSERT INTO validations"
            +"(netid, token, expire)"
            +"VALUES ($netid, $token, $expire)",
            {$netid, $token, $expire});
}

function getUserByNetid($netid) {
    return new Promise(function (resolve, reject) {
        db.get("SELECT * FROM users where netid=$netid",
                {$netid}, (err, row) => {
            if (!row) {
                log.info("No data for netid", $netid);
                reject();
                return;
            } else {
                log.info("Succesfully got user info!", row);
                resolve(row);
            }
        });
    });
}

function doesUserExistWithNetid($netid) {
    log.info("doesExist: ", $netid);
    return new Promise(function (resolve, reject) {
        db.get("SELECT * FROM users where netid=$netid",
                {$netid}, (err, row) => {
            log.info("Does ",$netid, " exist? ", !!row);
            resolve(!!row);
        });
    });
}

function popValidationByTokenAndUnexpired($token, $time) {
    return new Promise( (resolve, reject) => {
        // TODO: Make these atomic
        db.get("SELECT * FROM validations "
                +"WHERE token=$token AND expire>$time",
                {$token, $time}, (err, row) => {
            if (!row) {
                log.info("ROW,ERR: ", err, row);
                log.info("No validation with token", $token);
                reject();
                return;
            } else {
                log.info("Successfully found validation!", row);

                db.run("DELETE FROM validations WHERE token=$token",
                        {$token}, (err) => {
                    console.log("Deletion: ", err, row);
                    log.info(err);
                    if (err)
                        reject(err);
                    else
                        resolve(row);
                });
            }
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
    addUser,
    addValidation,

    getUserByNetid,
    popValidationByTokenAndUnexpired,
    doesUserExistWithNetid,
    updateUserPassByNetid,
};

