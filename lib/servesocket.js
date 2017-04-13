/**
 * servesocket.js
 *
 * Handles the socket.io backend
 *
 * TODO: Previous designs had seperate lobbys for waitroom and players,
 * but I switched to a single lobby for simplicity. In the future it
 * may be worth having different lobbies.
 *
 * TODO: Sync times
 */
/* eslint-env node */
"use strict";

const socketio = require("socket.io");
//const persist = require("./persistence");

const LOBBYSIZE = 100;

var log = console;

var io;

//
// Data Types
//

// Socket ids are unique to each socket
var nextSocketId = 1;

/**
 * Class Player
 *
 * The player represents each user who joins the server. For performance, each
 * class instance gets "reused" (this way old instances don't need to be
 * garbage-collected).
 */
function Player(id) {
    this.lobbyid = id;
    if ( 0 > id || id >= LOBBYSIZE ) {
        throw new Error("Bad lobby id ("+id+")! Expected number "
            +"between 0 and LOBBYSIZE.");
    }

    this.reset();
}
Player.prototype.reset = function () {
    // Socket to communicate over
    this.socket = null;

    // Player netid (name visible to other players)
    this.netid = "";

    // Stage (see STAGE_)
    this.stage = STAGE_INACTIVE;

    // Socket ID
    this.socketid = -1;
}
Player.prototype.safeOn = function (name, struct, cb) {
    var sid = this.checkSocketId();

    var player = this;
    this.socket.on(name, function (data) {
        if (this._gamesocketid != sid) {
            throw new Error("Got data from dead socket!");
        }

        var safeStruct = unpackStructure(data, struct);
        if ( safeStruct == null ) {
            log.info("User (netid="+player.netid+") sent bad data!");
            player.lightDisconnect("Client Error!");
            return;
        }

        cb(safeStruct);
    });
}
Player.prototype.lightDisconnect = function (msg) {
    void(msg);
    throw new Error("NYI");
}
Player.prototype.hardDisconnect = function () {
    throw new Error("NYI");
}
Player.prototype.join = function (socket) {
    this.socketid = socket._gamesocketid;
    this.socket = socket;

    socket.on("disconnect", (data) => {
        void(data);
        this.reset();

        throw new Error("NYI");
    });

    this.safeOn("login", {
        token: /[A-Z]{1,100}/,
    }, (data) => {
        log.tell("User tried to login", data, this);
    });

    this.safeOn("changePosition", {
        posx: "number",
        posy: "number",
        tarx: "number",
        tary: "number"
    }, (data) => {
        log.tell("User changes position.", data, this);
    });

    this.stage = STAGE_CONNECTED;
}
Player.prototype.checkSocketId = function () {
    if (this._gamesocketid != this.socket.id) {
        throw new Error("Socket IDs do not match! this.socketid="
            +this.socket.id
            +",this.socket._gamesocketid="+this._gamesocketid+".");
    }

    return this.socket.id;
}

/**
 * Enum STAGE_$
 *
 * Used in Player to represent the stage.
 */
const STAGE_INACTIVE  = "STAGE_INACTIVE";
const STAGE_CONNECTED = "STAGE_CONNECTED";
//const STAGE_LOGIN     = "STAGE_LOGIN";
//const STAGE_ACTIVE    = "STAGE_ACTIVE";

/**
 * array waitroom[LOBBYSIZE]
 *
 * A record of all players in the lobby. We attach some functions to the array
 * to preserve the module's namespace and keep everything clean.
 */

var lobby = new Array(LOBBYSIZE);
for (let i=0;i<LOBBYSIZE;i++) {
    lobby[i] = new Player(i);
}

lobby.nextAvailableId = function () {
    for (let i=0;i<LOBBYSIZE;i++) {
        if (lobby[i].stage == STAGE_INACTIVE) {
            return i;
        }
    }
    return -1;
}

/**
 * unpackStructure
 *
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
 * TODO: How much havoc is the wreaking on the optimizer?
 */

function unpackStructure(data, struct) {
    if (checkStructure(data,struct))
        return data;
    else
        return null;
}

function checkStructure(data, struct) {
    if ( typeof data !== "object" )
        return false;

    for ( let name in data ) {
        if (!(/^[A-Za-z][A-Za-z0-9]*$/).test(name)) {
            return false;
        }

        if (!struct.hasOwnProperty(name)) {
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
    for ( let name in struct ) {
        if (typeof data[name] === "undefined") {
            return false;
        }
    }
    return true;
}

//
// Socket Connection
//

/**
 * Called when client connects to socket
 */
function handleSocketConnect(socket) {
    let id = lobby.nextAvailableId();
    if ( id < 0 ) {
        socket.disconnect();
    }

    socket._gamesocketid = (nextSocketId++);
    lobby[id].join(socket);
}

//
// Module
//

function serveSocket(server) {
    io = socketio(server);

    io.on("connection", handleSocketConnect);
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    serveSocket,
    setLogger,
};
