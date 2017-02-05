/**
 * serveauth.js
 *
 * Serves authentication pages to authorize users (ensure they're rutgers
 * students)
 */
"use strict";

var log = console;

function serveAuth(express) {
    // TODO: The entire authentication process

    // Although it will probably be necessary to validate using email,
    // it may worth looking into passportjs-SAML to use Rutgers CAS directly.
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    serveAuth,
    setLogger,
};
