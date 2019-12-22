const Discord = require("discord.js");
const Config = require("./Config.json");
const Raven = require('raven');
const ConfigMemory = require("./ConfigMemory.js");
const MySQL = require("./MySQL.js");
const Client = new Discord.Client({
    "disabledEvents": ["TYPING_START", "GUILD_MEMBER_UPDATE"],
    "apiRequestMethod": "burst"
});
let botName;
/*
 * BURN MEMORY LEAK, BURNNNNNNN!
 */
Client.on('newListener', (event, listener) => {
    if (event === "typingStart" || event === "guildMemberUpdate") {
        Client.removeAllListeners(event);
        //log(`Killed event: ${event}`);
    }
});

Client.on('rateLimit', rateLimitInfo => {
    log("<== BOT IS BEING RATE LIMITED ==>");
});

//This event will run if the bot starts, and logs in, successfully.
Client.on("ready", async () => {
    //Raven.config('').install();

    botName = Client.user.tag;

    //await Client.user.setActivity(`Keeping watch...`);
    Client.user.setActivity(`~OFF DUTY~`);
    log(`${botName} (ID: ${Client.user.id}) started already connected to ${Client.guilds.size} Discord server(s). Serving ${Client.users.size} unique user(s) in ${Client.channels.size} channel(s).`);
    for (let key of Client.guilds) {
        let guild = Client.guilds.get(key[0]);
        log(`Preexisting server detected: ${guild.name} | ID: ${guild.id} | Users: ${guild.memberCount} | Channels: ${guild.channels.size}`);
        ConfigMemory.mysqlLoad(guild.id);
    }
});

//This event triggers when the bot joins a server.
Client.on("guildCreate", guild => {
    log(`${botName} joined: ${guild.name} (id: ${guild.id}).`);
    ConfigMemory.mysqlLoad(guild.id);
});

//This event triggers when the bot is removed from a server.
Client.on("guildDelete", guild => {
    log(`${botName} was kicked/left ${guild.name} (id: ${guild.id})`);
    // TODO: Unload from memory (and delete (from DB) server config?)
});

Client.on("messageDelete", async message => {
    return;
    message.reply(`${message.createdAt} "${message.content}"`, {code: true});
});

// This event will run on every single message received, from any channel or DM.
Client.on("message", async message => {
    if (isBadMessage(message)) return;

    let storage = createInstanceMessageStorage(message);
    if (storage.msg.author.bot) {
        onBotMessage(storage);
        return;
    }
    if (storage.hasPrefix) {
        await cmdController(storage);
    }

    //Clean-up
    if (storage.hasPrefix || storage.content.toLowerCase() === "fuck diego") {
        message.delete(); //Keep the CMDs out of chat
    }
});

//|| message.author.id === Client.user.id || message.author.bot
function isBadMessage(message) {
    return message.guild === null || !message.guild.available || message.system || message.guild.id === '412804092923084811';
}

function onBotMessage(storage) {
    if (storage.msg.author.id === '247852652019318795' && storage.content.search(", I'm Dad!") > -1) {
        storage.msg.react('??');
    }
}

function createInstanceMessageStorage(message) {
    let storage = {
        msg: message,
        content: message.content.trim(),
        hasPrefix: false,
        cmd: "",
        joinedArgs: "",
        splitArgs: [],
        argsLength: 0
    };
    let msg = storage.content; //TODO: Remove this?
    if (msg.charAt(0) === Config.DiscordJS_chatPrefix) {
        storage.hasPrefix = true;
        if (msg.includes(" ")) { //Contains args...
            storage.cmd = msg.substring(Config.DiscordJS_chatPrefix.length, msg.indexOf(" "));
            storage.joinedArgs = msg.substring(Config.DiscordJS_chatPrefix.length + storage.cmd.length + 1);
            storage.splitArgs = msg.substring(Config.DiscordJS_chatPrefix.length + storage.cmd.length + 1).split(" ");
            storage.argsLength = storage.splitArgs.length;
        } else { //Doesn't contain args...
            storage.cmd = msg.substring(Config.DiscordJS_chatPrefix.length);
        }
    }
    return storage;
}

function log(message) {
    console.log(`DiscordJS: ${message}`);
}

/* COMMAND AND FEATURE METHODS */

const runnable = {
    "cmd_fakeKick": cmd_fakeKick, //check
    "cmd_everyone": cmd_everyone, //check
    "cmd_giveAll": cmd_giveAll, //check
    "cmd_takeAll": cmd_takeAll, //check
    "cmd_delete": cmd_delete, //check?
    "cmd_myID": cmd_myID, //check
    "cmd_avatar": cmd_avatar, //check
    "cmd_config": cmd_config //untested
};

function existsInRunnable(funcName) {
    return runnable[funcName] != null;
}

//rename (check), enabled (check), requireAdmin (check)
async function cmdController(storage) {
    let foundCmdFuncName;
    if (!existsInRunnable("cmd_" + storage.cmd)) {
        foundCmdFuncName = ConfigMemory.matchRename(storage.msg.guild.id, storage.cmd);
        if (foundCmdFuncName == null) {
            return;
        }
    } else {
        foundCmdFuncName = "cmd_" + storage.cmd;
    }
    if (!ConfigMemory.getValue(storage.msg.guild.id, foundCmdFuncName, "enabled")) {
        return;
    }
    let requiresAdmin = ConfigMemory.getValue(storage.msg.guild.id, foundCmdFuncName, "requireAdmin");
    if (isAdmin(storage.msg) || (!isAdmin(storage.msg) && !requiresAdmin)) {
        runnable[foundCmdFuncName].call(this, storage);
        //TODO: Log that user ran command with permission.
    } else {
        //TODO: Log that user attempted to run command w/o permission.
    }
}

function cmd_myID(storage) {
    storage.msg.author.send(`Your Discord UserID is: ${storage.msg.author.id}`);
}

function cmd_avatar(storage) {
    if (storage.argsLength !== 1) {
        return;
    }
    let user = getUser(storage.joinedArgs);
    if (user != null) {
        storage.msg.author.send(`${storage.joinedArgs}'s avatar can be found at: ${user.avatarURL}`);
    }
}

//TODO: Allow user to change config settings by rename
function cmd_config(storage) {
    if (storage.argsLength === 3 && ConfigMemory.getValue(storage.msg.guild.id, storage.splitArgs[0], storage.splitArgs[1]) != null) {
        ConfigMemory.setValue(storage.msg.guild.id, storage.splitArgs[0], storage.splitArgs[1], storage.splitArgs[2]);
    }
}

//TODO: Allow users to append a message
function cmd_everyone(storage) {
    let atEveryone = "";
    for (let key of storage.msg.channel.members) {
        atEveryone += ' ' + getUser(key[0]).toString();
    }
    storage.msg.channel.send(atEveryone);
}

//TODO: Invite from default channel (if possible)
async function cmd_fakeKick(storage) {
    if (storage.argsLength !== 1) {
        return;
    }
    let kickee = getUser(storage.splitArgs[0], storage.msg.guild);
    let reason = `${storage.msg.author.tag}: "${Config.DiscordJS_chatPrefix + storage.cmd} ${kickee.user.tag}"`;
    kickee.kick(reason);
    let invite = await storage.msg.channel.createInvite({maxUses: 1, unique: true}, reason);
    kickee.send(invite.url);
}

function cmd_giveAll(storage) {
    cmdMassRole(storage, true);
}

function cmd_takeAll(storage) {
    cmdMassRole(storage, false);
}

/*
 * @param {String} roleString - The supplied string used to searched for a server role.
 * @param {Boolean} give - If true, mass give a role. If false, mass remove a role.
 * @returns {Boolean} - If the mass role add/remove succeeded.
 */
function cmdMassRole(storage, give) {
    if (storage.argsLength !== 1) {
        return;
    }

    let role = storage.msg.guild.roles.find(function (element) {
        return element.name.search(new RegExp(storage.joinedArgs, 'i')) > -1;
    });

    if (role === null) {
        log(`@${storage.msg.author.tag} attempted to ${give ? "give" : "remove"} the role "${storage.joinedArgs}" ${give ? "to" : "from"} @everyone, but the role couldn't be found.`);
        return;
    }

    for (let key of storage.msg.guild.members) {
        let guildMember = getUser(key[0], storage.msg.guild);
        if (!guildMember.user.bot) {
            if (give) {
                guildMember.addRole(role.id);
            } else {
                guildMember.removeRole(role.id);
            }
        }
    }

    log(`@${storage.msg.author.tag} ${give ? "gave" : "removed"} the role "${role.name}" ${give ? "to" : "from"} @everyone in ${storage.msg.guild.id}.`);
}

//TODO: del:searchLimit, del:deleteLimit
async function cmd_delete(storage) {
    if (storage.argsLength === 0) {
        return;
    }
    //TODO: Convert delete functions to reusable code
    let fetchLimit = ConfigMemory.getValue(storage.msg.guild.id, 'cmd_delete', 'searchLimit') + 1;
    if (storage.argsLength === 1 && !isNaN(storage.joinedArgs)) {
        fetchLimit = Math.min(parseInt(storage.joinedArgs) + 1, ConfigMemory.getValue(storage.msg.guild.id, 'cmd_delete', 'deleteLimit') + 1);
        cmdDeleteNumber(storage, fetchLimit);
    } else if (storage.argsLength === 1 && storage.joinedArgs.indexOf('<@') === 0) {
        cmdDeleteMention(storage, fetchLimit);
    } else if (storage.argsLength >= 1) {
        cmdDeleteKeyword(storage, fetchLimit);
    }
}

async function cmdDeleteNumber(storage, fetchLimit) {
    let fetchedMessages = await storage.msg.channel.fetchMessages({limit: fetchLimit});
    fetchedMessages.delete(fetchedMessages.keyArray()[0]);
    let numDeleted = await cmdDelete(fetchedMessages);
    //console.log(`@${storage.msg.author.tag} bulk deleted ${Math.min(fetchedMessages.size - 1, 50)}/50 message(s) in ${storage.msg.guild.name} ==> ${storage.msg.channel.name} | Method: Number`);
    console.log(`@${storage.msg.author.tag} bulk deleted ${numDeleted} message(s) in ${storage.msg.guild.name} ==> ${storage.msg.channel.name} | Method: Number`);
}

async function cmdDeleteMention(storage, fetchLimit) {
    let user = getUser(storage.joinedArgs);
    if (user === null) {
        return;
    }

    let fetchedMessages = await storage.msg.channel.fetchMessages({limit: fetchLimit});
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
    console.log(`@${storage.msg.author.tag} bulk deleted ${numDeleted} message(s) from @${user.tag} in ${storage.msg.guild.name} ==> ${storage.msg.channel.name} | Method: Mention`);
}

async function cmdDeleteKeyword(storage, fetchLimit) {
    let fetchedMessages = await storage.msg.channel.fetchMessages({limit: fetchLimit});
    fetchedMessages.delete(fetchedMessages.keyArray()[0]);
    let numDeleted = await cmdDelete(fetchedMessages.filter(element => element.content.search(new RegExp(storage.joinedArgs, 'i')) > -1));
    console.log(`@${storage.msg.author.tag} bulk deleted ${numDeleted} message(s) in ${storage.msg.guild.name} ==> ${storage.msg.channel.name} | Method: Keyword`);
}

async function cmdDelete(fetchedMessages) {
    let numDeleted = 0;
    for (let key of fetchedMessages) {
        fetchedMessages.get(key[0]).delete();
        numDeleted++;
    }
    return numDeleted;
}

/* HELPER FUNCTIONS */

/*
 * Resolves a user's (String) ID or mention ID to a Discord.JS User or GuildMember.
 * @param {String} id - A user' ID (either plain ID or a mention ID (<@!...>).
 * @param {Guild} [guild] - A Discord.JS Guild.
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

function getRole(guild, id) {
    return guild.roles.find(function (role) {
        if (role.id.search(id) > -1) {
            return role;
        }
    });
}

function isAdmin(message) {
    return message.member.permissions.has("ADMINISTRATOR");
}

Client.login(Config.DiscordJS_botToken);
/*
    if(false && command === "ping") {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(Client.ping)}ms`);
    }
  if(false && command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{});
    // And we get the bot to say the thing:
    message.channel.send(sayMessage);
  }

  if(false && command === "kick") {
    // This command must be limited to mods and admins. In this example we just hardcode the role names.
    // Please read on Array.some() to understand this bit:
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
    if(!message.member.roles.some(r=>["Administrator", "Moderator"].includes(r.name)) )
      return message.reply("Sorry, you don't have permissions to use this!");

    // Let's first check if we have a member and if we can kick them!
    // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
    // We can also support getting the member by ID, which would be args[0]
    let member = message.mentions.members.first() || message.guild.members.get(args[0]);
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.kickable)
      return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");

    // slice(1) removes the first part, which here should be the user mention or ID
    // join(' ') takes all the various parts to make it a single string.
    let reason = args.slice(1).join(' ');
    if(!reason) reason = "No reason provided";

    // Now, time for a swift kick in the nuts!
    await member.kick(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't kick because of : ${error}`));
    message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);

  }

  if(false && command === "ban") {
    // Most of this command is identical to kick, except that here we'll only let admins do it.
    // In the real world mods could ban too, but this is just an example, right? ;)
    if(!message.member.roles.some(r=>["Administrator"].includes(r.name)) )
      return message.reply("Sorry, you don't have permissions to use this!");

    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.bannable)
      return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

    let reason = args.slice(1).join(' ');
    if(!reason) reason = "No reason provided";

    await member.ban(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
    message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
  }

  if(false && command === "purge") {
    // This command removes all messages from all users in the channel, up to 100.

    // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);

    // Ooooh nice, combined conditions. <3
    if(!deleteCount || deleteCount < 2 || deleteCount > 100)
      return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

    // So we get our messages, and delete them. Simple enough, right?
    const fetched = await message.channel.fetchMessages({limit: deleteCount});
    message.channel.bulkDelete(fetched)
      .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
  }
 */