const sgMail = require('@sendgrid/mail')
const Config = require("../config.json"); // TODO: Object config memory
const l = require("../Logger.js");

/* Helper Functions */

module.exports.send = function send(SendGridMessageData) {
    sgMail
        .send(SendGridMessageData)
        .then(() => {
            l.formatLog(`Email sent via SendGrid API`, `VERBOSE`)
        })
        .catch((error) => {
            console.error(error)
        })
}

/* Setup/shutdown */

module.exports.initialize = function () {
    sgMail.setApiKey(Config.SENDGRID_API_KEY);
};
