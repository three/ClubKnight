/**
 * play.js
 *
 * Client-Side Communication and rendering
 */
"use strict";

var play = (function () {

var $ =  (q)=>document.querySelector(q),
    $$ = (q)=>document.querySelectorAll(q),
    log = console;

var renderer = null;
var socket = null;

function init() {
    log.info("Setting up interface...");
    renderer = PIXI.autoDetectRenderer(1024,512);
    $("#pixi-container").appendChild(renderer.view);

    renderer.backgroundColor = 0x00FF00;
    renderer.render( new PIXI.Container() );

    $("#chat").addEventListener("keypress", e => {
        if (e.keyCode == 13) {
            $("#chat").value = "";
        }
    });

    PIXI.loader.add(["assets/overlay.svg"]).load(setup);
}

function setup() {
    log.info("Assets loaded.");

    socket = io(document.location.origin, {
        transports: ["websocket"],
    });
    socket.emit("syn", {
        mytime: Date.now(),
    });

    socket.on("ack", (data) => {
        log.info("Successfully connected to server!");
    });
}

return {
    init,

    _socket: ()=>socket,
    _renderer: ()=>renderer,
};

})();

window.addEventListener("load",play.init);
