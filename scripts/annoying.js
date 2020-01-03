const h = require("../helper.js");

// TODO: Allow users to append a message
module.exports.everyone = function (message, args) {
    if (args > 0) return;

    let atEveryone = "";
    for (let channelMember of message.channel.members) {
        atEveryone += ' ' + h.getUser(channelMember[0]).toString();
    }
    h.sendMessage(message.guild.member, message.channel, atEveryone);
    return true;
};