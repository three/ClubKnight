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
        db.run("CREATE TABLE users(id INTEGER PRIMARY KEY ASC, netid TEXT)");

        // The "auth" table is used to store authentication keys that users
        // receive when they log in
        db.run("CREATE TABLE auth(id INTEGER, key TEXT)");

        log.info("Sqlite3 database created.");
    });
}

function addAuth(netid, key) {
    db.run("INSERT INTO auth (key) VALUES ($key)", {key});
}

function registerUser(netid) {
    db.run("INSERT INTO users (netid) VALUES ($netid)", {netid});
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    initPersistence,
    setLogger,
};

