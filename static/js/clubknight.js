/**
 * clubknight.js
 *
 * Client-Side Rendering
 */
"use strict";

var play = (function () {

const ASSET_SERVER = "https://cdn-clubknight-world.s3.amazonaws.com";

var $ =  (q)=>document.querySelector(q),
    $$ = (q)=>document.querySelectorAll(q);

var renderer = null;
var socket = null;

function init() {
    // Start PIXIJS Rendering
    renderer = PIXI.autoDetectRenderer(1024,576);
    $("#pixi-container").appendChild(renderer.view);

    renderer.backgroundColor = 0x00FF00;
    renderer.render( new PIXI.Container() );

    PIXI.loader.add({
        name: "welcome",
        url: ASSET_SERVER+"/images/welcome.png"
    }).load(setup);
}

function setup() {
    var stage = new PIXI.Container();
    var welcome = new PIXI.Sprite(
        PIXI.loader.resources["welcome"].texture
    );
    welcome.position.set(0,0);
    stage.addChild(welcome);

    renderer.render(stage);

    $("#progressbar").classList.add("hidden");
}

return {
    init,

    _socket: ()=>socket,
    _renderer: ()=>renderer,
};

})();

window.addEventListener("load",play.init);
