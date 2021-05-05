/* TODO: All functions have not been tested with the latest release of Discord.js,
    some functions may no longer work or may not work as intended. */

const sb = require("./SafetyBot.js");
const fs = require('fs')
const l = require("./Logger");
const Config = require("./config.json");

/*
 * Resolves a user's (String) ID or mention ID to a Discord.JS User or GuildMember.
 * @param {String} id - A user' ID (either plain ID or a mention ID (<@!...>)).
 * @param {Guild} guild - A Discord.JS Guild.
 * @returns {User or GuildMember} - A Discord.JS User is return if no guild is supplied. Otherwise, a GuildMember is
 * returned.
 */
module.exports.getUser = function (id, guild) {
    if (id.indexOf("<@") === 0 && id.charAt(id.length - 1) === '>') { //TODO: id.indexOf("<@") === 0 ==> Discord.MessageMentions.USERS_PATTERN (RegExp)
        id = id.includes('!') ? id.substring(3, id.length - 1) : id.substring(2, id.length - 1);
    }
    let collection = guild == null ? sb.Client.users.cache : guild.members.cache;
    return collection.find(function (user) {
        if (user.id.search(id) > -1) {
            return user;
        }
    });
};

module.exports.userToMention = function (user) {
    return `<@!${user.id}>`
};

module.exports.getRole = function (guild, id) {
    return guild.roles.find(function (role) {
        if (role.id.search(id) > -1) {
            return role;
        }
    });
};

module.exports.isAdmin = function (guildMember) {
    return guildMember.hasPermission(`ADMINISTRATOR`);
    //return member.permissions.has("ADMINISTRATOR");
};

/*
* Validates message input before attempting to send a message. Currently checks if the message is within the 2000
* character limit set by Discord. Useful if someone runs the 'everyone' command on a large server.
* @param sender
* @param receiver
* @param {String} message - Message to be sent.
* @returns {Boolean} - If the message was successfully sent.
 */
module.exports.sendMessage = async function (sender, receiver, message) {
    if (message.length > 2000) {
        await sender.send("You attempted to run a command that had an output that exceeded the character limit allowed by Discord; no message was sent.");
        return false;
    } else {
        await receiver.send(message);
        return true;
    }
};

module.exports.sendEmbed = async function (receiver, embed) {
    await receiver.send({embed: embed});
}

module.exports.verboseUserTag = function (user) {
    return `${user.tag} (${user.id})`
};

module.exports.verboseChannelTag = function (channel) {
    return `${channel.guild.name}#${channel.name} (${channel.guild.id}#${channel.id})`
};

module.exports.verboseGuildTag = function (guild) {
    return `${guild.name} (${guild.id})`
};

/*
* Credit: https://stackoverflow.com/a/15453499/5216257
 */
module.exports.range = function (start, stop, step = 1) {
    let a = [start], b = start;
    while (b < stop) {
        a.push(b += step || 1);
    }
    return a;
};

module.exports.updateMessage = function updateMessage(newText, channel, lastMessage = undefined) {
    if (lastMessage === undefined) {
        channel.send(newText).then(function (message) {
            lastMessage = message;
        });
    } else {
        lastMessage.edit(newText);
    }
    return lastMessage;
};

module.exports.isUndefined = function isUndefined(obj) {
    return obj === undefined;
}

module.exports.readFile = async function readFile(path) {
    return new Promise((resolve => {
        fs.readFile(path, 'utf8', function (err, data) {
            if (err) {
                l.pFormatLog({
                    message: err,
                    level: `ERROR`,
                    tag: `FILE`
                });
            } else {
                l.pFormatLog({
                    message: `Read: '${path}'`,
                    level: `VERBOSE`,
                    tag: `FILE`
                });
            }
            resolve(data);
        });
    }));
}

module.exports.updateConfig = function (k, v) {
    if (Config[k] !== v) {
        Config[k] = v;
        fs.writeFileSync(`./config.json`, JSON.stringify(Config, null, 4));
        l.pFormatLog({
            message: `./config.json:${k} has been updated`,
            level: `VERBOSE`,
            tag: `FILE`
        });
        sb.events.emit("CONFIG_UPDATE", k);
    }
}

/* Credit: https://medium.com/irrelevant-code/javascript-deep-cloning-and-value-vs-reference-5bf09bf980d6 */
module.exports.deepCopy = function (object) {
    let output = Array.isArray(object) ? [] : {};
    for (let data in object) {
        let value = object[data]
        output[data] = (typeof value === "object") ? module.exports.deepCopy(value) : value;
    }
    return output;
}

module.exports.findOrCreateChannel = async function (guild, channelName, options) {
    guild.fetch();
    let returnChannel;
    guild.channels.cache.forEach((channel) => {
        //console.log(`${guild.channels.cache.get(guildID).name.toLowerCase()} vs ${channelName.toLowerCase()}`);
        if (channel.name.toLowerCase() === channelName.toLowerCase()) {
            returnChannel = channel;
        }
    });

    if (returnChannel === undefined) {
        l.formatLog(
            `The requested channel, ${channelName}, couldn't be found, so it is being created...`,
            `VERBOSE`,
            `API`
        );
        return await guild.channels.create(channelName, options);
    } else {
        return returnChannel;
    }
}
