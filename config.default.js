const path = require("path");

module.exports = {
    // Persistence
    database: path.join(__dirname,"data/persistence.sqlite"),

    // SendValidations
    sendgrid_apikey: "",
    email_basedomain: "scarletmail.rutgers.edu",
    email_from: "noreply@example.org",

    // Validation Email
    email_valsubject: "[ClubKnight] Please confirm you're a Rutgers student",
    email_valbody: "Your validation token is %%VALTOKEN%%. Please go to example.org/validate.html",
};
