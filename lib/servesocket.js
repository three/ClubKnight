/**
 * servesocket.js
 *
 * Handles the socket.io backend
 *
 * TODO: Use different rooms for waitroom and lobby
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

const WAITROOM_STAGE_INACTIVE = "INACTIVE";
const WAITROOM_STAGE_JOIN     = "JOIN";
const WAITROOM_STAGE_CHECK    = "CHECK";
const WAITROOM_STAGE_READY    = "READY";

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
            netid: "",
            stage: WAITROOM_STAGE_INACTIVE,
            enterTime: -1,
        };
    }
}

/**
 * Reserves a spot in the waitroom.
 *
 * Returns -1 if no spot available
 */
function reserveWaitroom() {
    var waitid = 0;
    while ( waitroom[waitid].stage !== WAITROOM_STAGE_INACTIVE ) {
        waitid++;
        if ( waitid >= WAITSIZE )
            return -1;
    }
    waitroom[waitid].socket = null;
    waitroom[waitid].netid = "";
    waitroom[waitid].stage = WAITROOM_STAGE_JOIN;
    waitroom[waitid].enterTime = Date.now();
    return waitid;
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

//
// Recieving Structure
//

/*
 * Puts the data sent by socket into safe and usable form.
 *
 * Because of Javascript's type system, we do not necessarily know
 * the structure of what the client will send. For instance, the
 * client could send a number instead of an object, or make fields
 * undefined that should be defined. Before doing anything with the
 * recieved data, we must first ensure a valid structure.
 *
 * Example of struct:
 * { time: "number",
 *   username: /([A-Z]*)/,
 *   unique: { test: (x)=>(x<5) }
 * If element of struct is object, runs test method (like regex).
 *
 * TODO: How much havor is the wreaking on the optimizer?
 */
function checkStructure(data, struct) {
    if ( typeof data !== "object" )
        return false;

    for ( name in data ) {
        if (!(/^[A-Za-z][A-Za-z0-9]*$/).test(name)) {
            return false;
        }

        if (!struct.hasOwnProperty(name)) {
            return false;
        }
        let check = struct[name];
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

    // There's only one valid command a client can send when they first
    // connect: "login", which send their login information
    socket.on("login", (clientdata) => {
        // Check validity of request
        var data = unpackStructure(clientdata, {
            token: /[A-Z]{1,100}/,
        });
        if (data === null) {
            sendClientBad(socket, "Bad data during login.");
            return;
        }
        if (waitroom[waitid].stage !== WAITROOM_STAGE_JOIN) {
            sendClientBad(socket, "You already tried to login!");
            return;
        }

        // Request is valid, move into the next stage while
        // checking token
        waitroom[waitid].stage = WAITROOM_STAGE_CHECK;

        // Check what netid is associated with auth
        persist.getAuth({
            $key: data.token,
            $expire: Date.now(),
        }).then(row => {
            if (!row) {
                sendClientBad(socket, "Bad token!");
                return;
            }

            // Wait for the cron job to collect the socket
            waitroom[waitid].stage = WAITROOM_STAGE_READY;
            waitroom[waitid].netid = row.netid;
        }).catch(err => {
            log.error("Error during login.\n",err);
        });
    });
}


//
// "Cron Job"
//

var lastCronRun = -1;
var cronActive = false;

function initCron() {
    lastCronRun = Date.now();
    cronActive = true;
    runCron();
}

function runCron() {
    if (!cronActive)
        return;

    //TODO: Go through waitroom list and disconnect stragglers

    // First, we check the number of open lobby positions
    var openSpots = openLobbySpots();

    for (let i=0;i<waitroom.length;i++) {
        if (openSpots<1)
            break;
        if (waitroom[i].stage === WAITROOM_STAGE_READY) {
            var id = reserveLobbySpot(waitroom[i].socket);
            waitroom[i].socket.off("login");
            openSpots--;
        }
    }
    

    lastCronRun = Date.now();
    setTimeout(runCron, 500);
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
