const pb = require("../PoliceBot.js");

module.exports.exit = function (message, args) {
    if (args.length !== 0) return;
    pb.terminate();
    return true;
};