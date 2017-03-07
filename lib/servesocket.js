/**
 * servesocket.js
 *
 * Handles the socket.io backend
 */
/* eslint-env node */
"use strict";

const socketio = require("socket.io");

var log = console;

var io;

function serveSocket(server) {
    io = socketio(server);

    io.on("connection", handleConnection);
}

function handleConnection(socket) {
    socket.on("syn", data => {
        let tdiff = Date.now()-data.mytime;
        log.info("Client %d behind.", tdiff);

        socket.emit("ack", {
            timediff: tdiff,
        });
    });
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    serveSocket,
    setLogger,
};
