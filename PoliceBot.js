// TODO: Cleanup old documentation; add new documentation
// TODO: Allow many of the command to be executed in bulk
const Discord = require("discord.js");
const Config = require("./Config.json");
const Client = new Discord.Client({
    "apiRequestMethod": "burst" // sequential or burst
});
/* Removed disabledEvents from ClientOptions and stopped removing all disabledEvents listeners because of role giving/
* taking was leading to timeouts. May reimplement/reinvestigate if memory issues are found again. */
Client.on('newListener', (event, listener) => {});

Client.on('rateLimit', rateLimitInfo => {
    log("==> RATE LIMITED <==");
});

//This event will run if the bot starts, and logs in, successfully.
Client.on("ready", async () => {
    Client.user.setActivity(Config.defaultActivity);
    log(`${verboseUserTag(Client.user)} started already connected to ${Client.guilds.size} Discord server(s). Serving ${Client.users.size-1} unique user(s) in ${Client.channels.size} channel(s).`);
    for (let key of Client.guilds) {
        let guild = Client.guilds.get(key[0]);
        log(`Preexisting server detected: ${verboseGuildTag(guild)} | Users: ${guild.memberCount-1} | Channels: ${guild.channels.size}`);
    }
});

//This event triggers when the bot joins a server.
Client.on("guildCreate", guild => {
    log(`${verboseUserTag(Client.user)} joined ${verboseGuildTag(guild)}`);
});

//This event triggers when the bot is removed from a server.
Client.on("guildDelete", guild => {
    log(`${verboseUserTag(Client.user)} was kicked/left ${verboseGuildTag(guild)}`);
});

Client.on("messageDelete", async message => {
    // Logging deleted messages: message.reply(`${message.createdAt} "${message.content}"`, {code: true});
});

// This event will run on every single message received, from any channel or DM.
Client.on("message", async message => {
    if (isBadMessage(message)) return;
    if (message.system) {
        onSystemMessage();
    } else if (message.author.bot) {
        onBotMessage();
    } else if (message.content.startsWith(Config.cmdPrefix)) {
        await cmdController(message);
        //Keep the CMDs out of chat
        message.delete();
    }
});

function isBadMessage(message) {
    return message.guild === null || !message.guild.available || message.author.id === Client.user.id;
}

function onBotMessage(storage) {}


function onSystemMessage() {}

function log(message) {
    console.log(`Discord-PoliceBot: ${message}`);
}

/* COMMAND AND FEATURE METHODS */

const runnable = {
    "softkick": cmdSoftKick,    // works
    "everyone": cmdEveryone,    // works
    "giveall": cmdGiveAll,      // works
    "takeall": cmdTakeAll,      // works
    "myid": cmdMyID,            // works
    "avatar": cmdAvatar,        // works
    "delete": cmdDelete,        // untested
};

function existsInRunnable(funcName) {
    return runnable[funcName] != null;
}

//rename (check), enabled (check), requireAdmin (check)
async function cmdController(message) {
    let args = message.content.substr(Config.cmdPrefix.length);
    args = args.split(" ");

    let cmd = args.shift().toLowerCase();
    if(existsInRunnable(cmd)) {
        let result = false;
        if(isAdmin(message.member)){
            result = runnable[cmd](message, args);
        }
        log(`${verboseUserTag(message.author)} ${(result) ? 'ran' : 'attempted to run'} '${cmd}${(args > 0) ? ' ' + args : ''}' in ${verboseChannelTag(message.channel)}`);
    }
}

function cmdMyID(message, args) {
    sendMessage(message.author, message.author, `Your Discord ID is: ${verboseUserTag(message.author)}`);
    return true;
}

function cmdAvatar(message, args) {
    let user;
    if (args.length > 1) {
        return;
    } else if (args.length === 1) {
        user = getUser(args[0]);
    } else {
        user = message.author;
    }
    if (user != null) {
        sendMessage(message.author, message.author, `${userToMention(user)}'s avatar can be found at: ${user.avatarURL}`);
    }
    return true;
}

// TODO: Allow users to append a message
function cmdEveryone(message, args) {
    if (args > 0) return;

    let atEveryone = "";
    for (let channelMember of message.channel.members) {
        atEveryone += ' ' + getUser(channelMember[0]).toString();
    }
    sendMessage(message.guild.member, message.channel, atEveryone);
    return true;
}

async function cmdSoftKick(message, args) {
    if (args.length !== 1) return;

    let kickee = getUser(args[0], message.guild);
    let auditReason = `${message.author.tag} soft kicked ${kickee.user.tag}`;
    /* Send the invite before kicking so that the bot shares at least one common server with kickee and thus the
    message can be delivered. */
    let invite = await message.guild.systemChannel.createInvite({maxUses: 1, unique: true}, auditReason);
    await sendMessage(message.user, kickee, auditReason.replace(message.author.tag, userToMention(message.author.id)).replace(kickee.user.tag,"you!") + `\n${invite.url}`);
    kickee.kick(auditReason);
    return true;
}

function cmdGiveAll(message, args) {
    return cmdMassRole(message, args, true);
}

function cmdTakeAll(message, args) {
    return cmdMassRole(message, args, false);
}

/*
 * @param {String} roleString - The supplied string used to searched for a server role.
 * @param {Boolean} give - If true, mass give a role. If false, mass remove a role.
 * @returns {Boolean} - If the mass role add/remove succeeded.
 */
function cmdMassRole(message, args, give) {
    //if(args !== 1) return;

    let role = message.guild.roles.find(function (element) {
        return element.name.search(new RegExp(args[0], 'i')) > -1;
    });

    if (role === null) {
        log(`${verboseUserTag(message.author)} attempted to ${give ? "give" : "remove"} the role "${args[0]}" ${give ? "to" : "from"} @everyone, but the role couldn't be found.`);
        return;
    }

    for (let key of message.guild.members) {
        let guildMember = getUser(key[0], message.guild);
        if (!guildMember.user.bot) {
            if (give) {
                guildMember.addRole(role.id);
            } else {
                guildMember.removeRole(role.id);
            }
        }
    }

    log(`${verboseUserTag(message.author)} ${give ? "gave" : "removed"} the role "${role.name}" ${give ? "to" : "from"} @everyone in ${verboseGuildTag(message.guild)}.`);
    return true;
}

async function cmdDelete(message, args) {
    // TODO: Convert delete functions to reusable code
    let fetchLimit = 50 + 1; // TODO: Figure out Discord's limit and pick a limit
    if (args.length === 1 && !isNaN(args[0])) {
        cmdDeleteNumber(message, args, fetchLimit);
    } else if (args.length === 1 && args[0].indexOf('<@') === 0) {
        cmdDeleteMention(message, args, fetchLimit);
    } else if (args.length >= 1) {
        cmdDeleteKeyword(message, args, fetchLimit);
    }
}

/* HELPER FUNCTIONS */

async function cmdDeleteNumber(message, args, fetchLimit) {
    let fetchedMessages = await message.channel.fetchMessages({limit: fetchLimit});
    fetchedMessages.delete(fetchedMessages.keyArray()[0]);
    let numDeleted = await cmdDelete(fetchedMessages);
    //console.log(`@${storage.msg.author.tag} bulk deleted ${Math.min(fetchedMessages.size - 1, 50)}/50 message(s) in ${storage.msg.guild.name} ==> ${storage.msg.channel.name} | Method: Number`);
    log(`${verboseUserTag(message.author)} bulk deleted ${numDeleted} message(s) in ${verboseChannelTag(message.channel)} | Method: Number`);
}

async function cmdDeleteMention(message, args, fetchLimit) {
    let user = getUser(args[0]);
    if (user === null) return;

    let fetchedMessages = await message.channel.fetchMessages({limit: fetchLimit});
    fetchedMessages.delete(fetchedMessages.keyArray()[0]);
    let hit = 0; //0 ==> never hit a mentioned users message || 1 ==> hit, continue if next is same user || 2 ==> was 1, then hit another user, don't continue
    fetchedMessages = fetchedMessages.filter(function (element) {
        if ((hit === 0 || hit === 1) && element.author.id === user.id) {
            hit = 1;
            return true;
        } else if (hit === 1 && element.author.id !== user.id) {
            hit = 2;
        }
        return false;
    });
    let numDeleted = await cmdDelete(fetchedMessages);
    console.log(`${verboseUserTag(message.author)} bulk deleted ${numDeleted} message(s) from ${verboseUserTag(user)} in ${verboseChannelTag(message.channel)} | Method: Mention`);
}

async function cmdDeleteKeyword(message, args, fetchLimit) {
    let fetchedMessages = await message.channel.fetchMessages({limit: fetchLimit});
    fetchedMessages.delete(fetchedMessages.keyArray()[0]);
    let numDeleted = await cmdDelete(fetchedMessages.filter(element => element.content.search(new RegExp(args.join(" "), 'i')) > -1));
    console.log(`@${verboseUserTag(message.author)} bulk deleted ${numDeleted} message(s) in ${verboseChannelTag(message.channel)} | Method: Keyword`);
}

async function cmdDelete(fetchedMessages) {
    let numDeleted = 0;
    for (let key of fetchedMessages) {
        fetchedMessages.get(key[0]).delete();
        numDeleted++;
    }
    return numDeleted;
}

/*
 * Resolves a user's (String) ID or mention ID to a Discord.JS User or GuildMember.
 * @param {String} id - A user' ID (either plain ID or a mention ID (<@!...>)).
 * @param {Guild} guild - A Discord.JS Guild.
 * @returns {User or GuildMember} - A Discord.JS User is return if no guild is supplied. Otherwise, a GuildMember is
 * returned.
 */
function getUser(id, guild) {
    if (id.indexOf("<@") === 0 && id.charAt(id.length - 1) === '>') { //TODO: id.indexOf("<@") === 0 ==> Discord.MessageMentions.USERS_PATTERN (RegExp)
        id = id.includes('!') ? id.substring(3, id.length - 1) : id.substring(2, id.length - 1);
    }
    let collection = guild == null ? Client.users : guild.members;
    return collection.find(function (user) {
        if (user.id.search(id) > -1) {
            return user;
        }
    });
}

function userToMention(user){
    return `<@!${user.id}>`
}

function getRole(guild, id) {
    return guild.roles.find(function (role) {
        if (role.id.search(id) > -1) {
            return role;
        }
    });
}

function isAdmin(member) {
    return member.permissions.has("ADMINISTRATOR");
}
/*
* Validates message input before attempting to send a message. Currently checks if the message is within the 2000
* character limit set by Discord. Useful if someone runs the 'everyone' command on a large server.
* @param sender
* @param receiver
* @param {String} message - Message to be sent.
* @returns {Boolean} - If the message was successfully sent.
 */
async function sendMessage(sender, receiver, message) {
    if (message.length > 2000) {
        await sender.send("You attempted to run a command that had an output that exceeded the character limit allowed by Discord; no message was sent.");
        return false;
    } else {
        await receiver.send(message);
        return true;
    }
}

function verboseUserTag(user) {
    return `${user.tag} (${user.id})`
}

function verboseChannelTag(channel) {
    return `${channel.guild.name}#${channel.name} (${channel.guild.id}#${channel.id})`
}

function verboseGuildTag(guild) {
    return `${guild.name} (${guild.id})`
}

Client.login(Config.botToken);