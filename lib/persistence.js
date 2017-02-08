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
        db.run("CREATE TABLE users ("
                +"id INTEGER PRIMARY KEY AUTOINCREMENT,"
                +"netid TEXT,"
                +"pass TEXT,"
                +"salt BLOB,"
                +"money INTEGER,"
                +"valid INTEGER"
                +")");

        // The "auth" table is used to store authentication keys that users
        // receive when they log in
        db.run("CREATE TABLE auth("
                +"id INTEGER PRIMARY KEY AUTOINCREMENT,"
                +"netid TEXT,"
                +"key TEXT,"
                +"expire INTEGER"
                +")");

        log.info("Sqlite3 database created.");
    });
}

// TODO: These functions should probably take objects to ease argument names

function addAuth($netid, $key, $expire) {
    db.run("INSERT INTO auth (netid, key, expire)"
            +"VALUES ($netid,$key,$expire)",
            {$netid, $key, $expire});
}

function registerUser($netid, $pass, $salt, $money, $valid) {
    db.run("INSERT INTO users"
            +"(netid, pass, salt, money, valid)"
            +"VALUES ($netid, $pass, $salt, $money, $valid)",
            {$netid, $pass, $salt, $money, $valid});
}

function getUserByNetid($netid) {
    return new Promise(function (resolve, reject) {
        db.get("SELECT * FROM users where netid=$netid",
                {$netid}, (err, row) => {
            if (!row) {
                log.info("No data for netid", $netid);
                reject();
                return;
            }
            log.info("Succesfully got user info!", row);
            resolve(row);
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
    registerUser,
    getUserByNetid,
};

