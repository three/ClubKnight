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

var configdefault = require("./config.default.js");
var config;

var argstatic = true,
    argtest = false,
    argforce = false,
    arginsecure = false,
    configfile = path.join(__dirname, "config.js"),
    configrequired = false,
    port = 8080;

function init() {
    //
    // COMMAND LINE ARGS
    //

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

    if ( commander.port !== undefined )
        port = parseInt( commander.port );
    if ( commander.nostatic )
        argstatic = false;
    if ( commander.test )
        argtest = true;
    if ( commander.force )
        argforce = true;
    if ( commander.insecure )
        arginsecure = true;
    if ( commander.config !== undefined ) {
        if ( commander.config == "" ) {
            console.warn("FATAL: Can't parse config file! (field empty)");
            process.exit(1);
        }
        configfile = path.join(process.cwd(),commander.config);
        configrequired = true;
    }

    //
    // WELCOME MESSAGE
    //

    console.log("ClubRU Version "+VERSION+".");

    //
    // CHECK VERSION
    //

    var ver = process.version.split(".");

    console.log("You are using NodeJS version: ", process.version);
    console.log("You are using platform: ", process.platform);

    if ( !argforce &&
        (process.platform !== "linux" && process.platform !== "win32") ) {
        console.error("Your platform is not supported!"
                    +" Please use Windows or Linux.");
        process.exit(1);
    }

    if ( !argforce && (ver[0] !== "v7" || parseInt(ver[1],10)<5) ) {
        console.error("Please use NodeJS v7, 7.5.0 or above!");
        process.exit(1);
    }

    //
    // LOAD CONFIGURATION
    //

    console.log("Using config file: "+configfile);

    var userconfig;
    if ( configrequired || fs.existsSync(configfile) ) {
        try {
            userconfig = require(configfile);
        } catch (err) {
            // In the case that the file is deleted between the existsSync and
            // and require calls, we will end up here, in addition to general
            // errors.
            console.warn("FATAL: Unable to load config file!");
            console.warn("Error:\n",err);
            process.exit(1);
        }

        if ( typeof userconfig !== "object" ) {
            console.warn("Config file exports a "+(typeof userconfig));
            console.warn("FATAL: Config file MUST export an object!");
            process.exit(1);
        }
    } else {
        console.log("Config file not found. Using all defaults.");
        userconfig = {};
    }

    // Since we have already checked the version, it's safe to use modern
    // JS featured like Object.assign.
    config = Object.assign({}, configdefault, userconfig, {
        nostatic: !argstatic,
        insecure: arginsecure,
    });

    //
    // WARNINGS
    //

    // Warn when using --insecure
    if ( arginsecure )
        console.log("WARNING: Passwords will not be stored securely!");

    if ( !argforce && process.platform == "linux" && process.getuid() == 0 ) {
        console.warn("ClubRU should NOT be run as root.");
        console.warn("Please see documentation for proper production setup.");
        console.warn("FATAL: Refusing to run as root (use --force by bypass)");
        process.exit(1);
    }


    //
    // TEST RESULTS
    //

    if ( argtest ) {
        console.log("ClubRU should work with your current NodeJS version.");
        process.exit(0);
    }

    //
    // START SERVER
    //

    // We hold off on loading the server module until after we check the
    // version, so we don't error if the syntax isn't supported by the
    // current node version.
    servermodule = require("./lib/server.js");

    servermodule.startServer(port, config);
}

init();
