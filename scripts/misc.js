const h = require("../helper.js");

module.exports.myid = function (message, args) {
    h.sendMessage(message.author, message.author, `Your Discord ID is: ${h.verboseUserTag(message.author)}`);
    return true;
};

module.exports.avatar = function (message, args) {
    let user;
    if (args.length > 1) {
        return;
    } else if (args.length === 1) {
        user = h.getUser(args[0]);
    } else {
        user = message.author;
    }
    if (user != null) {
        h.sendMessage(message.author, message.author, `${h.userToMention(user)}'s avatar can be found at: ${user.avatarURL}`);
    }
    return true;
};

module.exports.ping = function (message, args) {
    if (args.length !== 0) return;
    h.sendMessage(message.author, message.author, `Pong!`);
    return true;
};