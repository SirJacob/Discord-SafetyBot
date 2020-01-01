const pb = require("./PoliceBot.js");

/*
 * Resolves a user's (String) ID or mention ID to a Discord.JS User or GuildMember.
 * @param {String} id - A user' ID (either plain ID or a mention ID (<@!...>)).
 * @param {Guild} guild - A Discord.JS Guild.
 * @returns {User or GuildMember} - A Discord.JS User is return if no guild is supplied. Otherwise, a GuildMember is
 * returned.
 */
module.exports.getUser = function getUser(id, guild) {
    if (id.indexOf("<@") === 0 && id.charAt(id.length - 1) === '>') { //TODO: id.indexOf("<@") === 0 ==> Discord.MessageMentions.USERS_PATTERN (RegExp)
        id = id.includes('!') ? id.substring(3, id.length - 1) : id.substring(2, id.length - 1);
    }
    let collection = guild == null ? pb.Client.users : guild.members;
    return collection.find(function (user) {
        if (user.id.search(id) > -1) {
            return user;
        }
    });
};

module.exports.userToMention = function userToMention(user){
    return `<@!${user.id}>`
};

module.exports.getRole = function getRole(guild, id) {
    return guild.roles.find(function (role) {
        if (role.id.search(id) > -1) {
            return role;
        }
    });
};

module.exports.isAdmin = function isAdmin(member) {
    return member.permissions.has("ADMINISTRATOR");
};

/*
* Validates message input before attempting to send a message. Currently checks if the message is within the 2000
* character limit set by Discord. Useful if someone runs the 'everyone' command on a large server.
* @param sender
* @param receiver
* @param {String} message - Message to be sent.
* @returns {Boolean} - If the message was successfully sent.
 */
module.exports.sendMessage = async function sendMessage(sender, receiver, message) {
    if (message.length > 2000) {
        await sender.send("You attempted to run a command that had an output that exceeded the character limit allowed by Discord; no message was sent.");
        return false;
    } else {
        await receiver.send(message);
        return true;
    }
};

module.exports.verboseUserTag = function verboseUserTag(user) {
    return `${user.tag} (${user.id})`
};

module.exports.verboseChannelTag = function verboseChannelTag(channel) {
    return `${channel.guild.name}#${channel.name} (${channel.guild.id}#${channel.id})`
};

module.exports.verboseGuildTag = function verboseGuildTag(guild) {
    return `${guild.name} (${guild.id})`
};

module.exports.log = function log(message) {
    console.log(`Discord-PoliceBot: ${message}`);
};