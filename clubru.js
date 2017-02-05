#!/usr/bin/env node
/*
 * clubru.js
 *
 * Provides an interface to start the ClubRU server.
 */

var VERSION = "0.0.1";

var commander = require("commander");
var servermodule;

function init() {
    // We use command.js to parse command line arguments. We follow the
    // unix command-line conventions of --help and --version.
    var argstatic = true,
        argtest = false,
        port = 8080;

    // The --nostatic option will be useful in production environments
    // where static files will be handled much more efficiently with nginx.
    commander
        .version(VERSION)
        .usage("./clubru.js [-?hntv] [-p port]")
        .option("-n, --nostatic", "don't serve static files")
        .option("-t, --test", "test for correct nodejs version and exit")
        .option("-p, --port <n>", "port to serve (default 8080)")
        .parse(process.argv);

    if ( commander.port )
        port = parseInt( commander.port );
    if ( commander.nostatic )
        argstatic = false;
    if ( commander.test )
        argtest = true;

    if ( !argtest )
        welcomeMsg();

    // We require Node >=v7.5.0 due to the use of ECMAScript 6 features
    // like const, destructuring. etc.
    testVersion();

    if ( process.getuid() == 0 ) {
        console.warn("ClubRU should NOT be run as root.");
        console.warn("Please see documentation for proper production setup.");
        process.exit(1);
    }

    if ( argtest ) {
        console.log("ClubRU should work with your current NodeJS version.");
        process.exit(0);
    }

    // We hold off on loading the server module until after we check the
    // version, so we don't error if the syntax isn't supported by the
    // current node version.
    servermodule = require("./lib/server.js");
    servermodule.startServer(port,{
        nostatic: !argstatic,
    });
}

function welcomeMsg() {
    console.log("ClubRU Version "+VERSION+".");
}

function testVersion() {
    var ver = process.version.split(".");

    console.log("You are using NodeJS version: ", process.version);

    if ( ver[0] != "v7" || parseInt(ver[1])<5 ) {
        console.error("Please use NodeJS v7, 7.5.0 or above!");
        process.exit(1);
    }
}

init();
