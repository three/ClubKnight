const path = require("path");

module.exports = {
    // Persistence
    database: path.join(__dirname,"data/persistence.sqlite"),

    // SendValidations
    sendgrid_apikey: "", // Log tokens instead of sending them
};
