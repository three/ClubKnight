#!/usr/bin/env node
/*
 * clubru.js
 *
 * Provides an interface to start the ClubRU server.
 */

var VERSION = "0.0.1";

var commander = require("commander");
var fs = require("fs");
var path = require("path");
var servermodule;
var config;

var argstatic = true,
    argtest = false,
    argforce = false,
    arginsecure = false,
    configfile = path.join(__dirname, "config.js"),
    createconfig = true,
    port = 8080;

function init() {
    // The --nostatic option will be useful in production environments
    // where static files will be handled much more efficiently with nginx.
    commander
        .version(VERSION)
        .usage("./clubru.js [-bcfhntv] [-p port]")
        .option("-n, --nostatic", "don't serve static files")
        .option("-t, --test", "test for correct nodejs version and exit")
        .option("-p, --port <n>", "port to serve (default 8080)")
        .option("-f, --force", "always attempt to run (possibly insecure)")
        .option("-i, --insecure", "use alternatives to compiled pkgs"
            +" (insecure, NOT FOR PROD)")
        .option("-c, --config <file>", "Configuration file"
            + " (default config.js)")
        .parse(process.argv);

    if ( commander.port )
        port = parseInt( commander.port );
    if ( commander.nostatic )
        argstatic = false;
    if ( commander.test )
        argtest = true;
    if ( commander.force )
        argforce = true;
    if ( commander.insecure )
        arginsecure = true;
    if ( commander.config ) {
        eonfigfile = commander.config;
        createconfig = false;
    }

    if ( !argtest )
        welcomeMsg();

    if ( arginsecure )
        console.warn("WARNING: Passwords will not be stored securely!");

    // We require Node >=v7.5.0 due to the use of ECMAScript 6 features
    // like const, destructuring. etc.
    testVersion();

    if ( !argforce && process.platform == "linux" && process.getuid() == 0 ) {
        console.warn("ClubRU should NOT be run as root.");
        console.warn("Please see documentation for proper production setup.");
        process.exit(1);
    }

    if ( argtest ) {
        console.log("ClubRU should work with your current NodeJS version.");
        process.exit(0);
    }

    // Additional server settings (not command line flags) are stored in
    // config.js. If this file does not exist, we copy the default one.
    // NOTE: This is a small (but acceptable) race condition
    if ( createconfig ) {
        let configdef = path.join(__dirname, "config.default.js");
        console.log("You don't have a config file! Copying default.");

        let readS = fs.createReadStream(configdef);
        readS.on("error", (err) => {
            throw err;
        });
        let writeS = fs.createWriteStream(configfile);
        writeS.on("error", (err) => {
            throw err;
        });
        readS.pipe(writeS);

        writeS.on("close", () => {
            config = require("./config");
            start();
        });
    } else {
        start();
    }

}

function start() {
    // We hold off on loading the server module until after we check the
    // version, so we don't error if the syntax isn't supported by the
    // current node version.
    servermodule = require("./lib/server.js");

    let options = Object.assign({},config,{
        nostatic: !argstatic,
        insecure: arginsecure,
    });

    servermodule.startServer(port, options);
}

function welcomeMsg() {
    console.log("ClubRU Version "+VERSION+".");
}

function testVersion() {
    var ver = process.version.split(".");

    console.log("You are using NodeJS version: ", process.version);
    console.log("You are using platform: ", process.platform);

    if ( !argforce &&
        (process.platform !== "linux" && process.platform !== "win32") ) {
        console.error("Your platform is not supported!"
                    +" Please use Windows or Linux.");
        process.exit(1);
    }

    if ( !argforce && (ver[0] != "v7" || parseInt(ver[1])<5) ) {
        console.error("Please use NodeJS v7, 7.5.0 or above!");
        process.exit(1);
    }

    // TODO: Move this stuff out of testVersion
    console.log("Using config file: "+configfile);
    if ( fs.existsSync(configfile) ) {
        createconfig = false;
        try {
            config = require(configfile);
            console.assert(typeof config === "object",
                    "Config file MUST export object!");
        } catch (err) {
            console.error("Error while loading config!\n", err);
            process.exit(1);
        }
    } else {
        console.error("Your config file does NOT exist!");
        if ( !createconfig )
            process.exit(1);
    }
}

init();
