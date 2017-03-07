/**
 * email.js
 *
 * Sends email
 *
 * TODO: Rate limiting per netid (low priority)
 */
/* eslint-env node */
"use strict";

const sendgrid = require("sendgrid");

var log = console;

var options;
var sg;

function initEmail(opts) {
    options = opts;

    if (options.apikey)
        sg = sendgrid(options.apikey);
}

function sendValidation(data) {
    if (!sg) {
        log.info("SendGrid not setup properly. Will not send validation.");
        return Promise.resolve(null);
    }

    var mail = getValidationEmail(data);
    var req = sg.emptyRequest({
        method: "POST",
        path: "/v3/mail/send",
        body: mail.toJSON(),
    });

    return new Promise((resolve, reject) => {
        sg.API(req, (err,res) => {
            if (err) {
                reject(err);
                log.error("SendGrid Error (dumping response JSON)\n",
                        JSON.stringify(res));
            } else {
                resolve(res);
            }
        });
    });
}

function getValidationEmail(data) {
    var {
        netid,
        token,
    } = data;

    var from = new sendgrid.mail.Email(options.from);
    var to = new sendgrid.mail.Email(netid+"@"+options.basedomain);

    var content = new sendgrid.mail.Content(
            "text/plain",
            options.valBody.replace("%%VALTOKEN%%", token)
            );

    var mail = new sendgrid.mail.Mail(
            from,
            options.valSubject,
            to,
            content
            );
    return mail;
}

function setLogger(logger) {
    log = logger;
}

module.exports = {
    initEmail,
    setLogger,

    sendValidation,
};
