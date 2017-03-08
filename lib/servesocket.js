/**
 * servesocket.js
 *
 * Handles the socket.io backend
 */
/* eslint-env node */
"use strict";

const socketio = require("socket.io");

const persist = require("./persistence");

const LOBBYSIZE = 100;
const WAITSIZE = 100;

var log = console;

var lobby, waitroom, io;

//
// Data Types
//

/*
 * Initializes Wait room
 *
 * Players in the wait room are waiting to be authenticated
 * so they can join the actual server
 */
function initWaitroom() {
    waitroom = new Array(WAITSIZE);
    for (let i=0;i<WAITSIZE;i++) {
        waitroom[i] = {
            socket: null,
            active: false,
            enterTime: -1,
        };
    }
}

/**
 * Initializes Lobby
 *
 * By initializing the full size of the lobby at once,
 * we can more easily manage the array of players
 */
function initLobby() {
    lobby = new Array(LOBBYSIZE);
    for (let i=0;i<LOBBYSIZE;i++) {
        lobby[i] = {
            // Account
            localId: i,
            globalId: -1,
            netid: "",
            active: false,

            // Socket
            socket: null,

            // Area
            area: "",

            // Timing
            lastInteraction: -1,
            lastPosx: -1,
            lastPosy: -1,

            // Position and Movement
            posx: -1,
            posy: -1,
            tarx: -1,
            tary: -1,

            // Chat
            say: "",
            sayExpire: -1,
        };
    }
}

/**
 * Reserves a spot in the waitroom
 */
function reserveWaitroom() {
    var waitid = 0;
    while ( waitid < WAITSIZE && !waitroom[waitid].active )
        waitid++;
    if ( waitid >= WAITSIZE )
        return -1;
    return waitid;
}

//
// Recieving Structure
//


var recieveStructs = {
    login: {
        time: "number",
        token: /[A-Z]{1,100}/,
    }
};

// Because of Javascript's type system, we do not necessarily know
// the structure of what the client will send. For instance, the
// client could send a number instead of an object, or make fields
// undefined that should be defined. Before doing anything with the
// recieved data, we must first ensure a valid structure.

// TODO: How much havoc is this wreaking on the V8 optimizer?
function checkStructure(data, structName) {
    var struct = recieveStructs[structName];

    if ( typeof data !== "object" )
        return false;

    for ( name in data ) {
        if (!(/^[A-Za-z]{1,100}$/).test(name)) {
            return false;
        }

        let check = struct[name];
        if (typeof check === "undefined") {
            return false;
        }
        if (typeof struct[name] === "object") {
            if (!struct[name].test(data[name])) {
                return false;
            }
        } else {
            if (typeof data[name] !== struct[name]) {
                return false;
            }
        }
    }
    for ( name in struct ) {
        if (typeof data[name] === "undefined") {
            return false;
        }
    }
    return true;
}

function unpackStructure(data, structName) {
    let good = checkStructure(data, structName);
    if (good)
        return data;
    return null;
}

//
// Connections and Disconnections
//

/**
 * Called when client connects to socket
 */
function handleClientConnect(socket) {
    // Add the player to the waitroom until they decide to
    // authenticate
    var waitid = reserveWaitroom();
    if ( waitid<0 ) {
        // Out of room in waitroom, disconnect
        socket.disconnect();
        return;
    }
    waitroom[waitid].socket = socket;

    // Keep track of when players join waitroom so we can
    // kick stragglers
    waitroom[waitid].enterTime = Date.now();

    // The player object keeps references where the player is
    // located
    var player = {
        socket: socket,
        waitid: waitid,
        localid: -1,
    }

    // Add event handlers
    socket.on("disconnect", () => {
        handleClientDisconnect(socket);
    });
    socket.on("login", (clientdata) => {
        var data = unpackStructure(clientdata, "login");
        if (data === null)
            sendClientBad();
        handleClientLogin(player, data);
    });
}

/**
 * Called when client disconnects from socket
 */
function handleClientDisconnect(socket) {
    throw new Error("NYI");
}

//
// Handle Requests form Client
//

/**
 * Handle client authentication
 */
function handleClientLogin(player, data) {
    if (player.waitid < 0) {
        sendClientBad();
        return;
    }
}

/**
 * Handle client chatting
 */
function handleClientTalk(player, data) {
    throw new Error("NYI");
}

/**
 * Handle client moving
 */
function handleClientMove(player, data) {
    throw new Error("NYI");
}

/**
 * Handle client requesting data
 */
function handleRequestPositions(player, data) {
    throw new Error("NYI");
}

//
// Send Requests to Client
//

/**
 * Send activation to player
 */
function sendActivate(player, data) {
    throw new Error("NYI");
}

/**
 * Send Position data to player
 */
function sendPosition(player, data) {
    throw new Error("NYI");
}

//
// "Cron Job"
//

function initCron() {
}

//
// Module
//

function serveSocket(server) {
    io = socketio(server);

    io.on("connection", handleClientConnect);

    initWaitroom();
    initLobby();
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    serveSocket,
    setLogger,
};
