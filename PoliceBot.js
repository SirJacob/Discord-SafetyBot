// TODO: Cleanup old documentation; add new documentation
// TODO: Allow many of the command to be executed in bulk
const Discord = require("discord.js");
const Config = require("./config.json");
const h = require("./helper.js");
const Client = new Discord.Client({
    "apiRequestMethod": "burst" // sequential or burst
});
module.exports.Client = Client;
/* Removed disabledEvents from ClientOptions and stopped removing all disabledEvents listeners because of role giving/
* taking was leading to timeouts. May reimplement/reinvestigate if memory issues are found again. */
Client.on('newListener', (event, listener) => {
});

Client.on('rateLimit', rateLimitInfo => {
    h.log("==> RATE LIMITED <==");
});

//This event will run if the bot starts, and logs in, successfully.
Client.on("ready", async () => {
    Client.user.setActivity(Config.defaultActivity);
    h.log(`${h.verboseUserTag(Client.user)} started already connected to ${Client.guilds.size} Discord server(s). Serving ${Client.users.size - 1} unique user(s) in ${Client.channels.size} channel(s).`);
    for (let key of Client.guilds) {
        let guild = Client.guilds.get(key[0]);
        h.log(`Preexisting server detected: ${h.verboseGuildTag(guild)} | Users: ${guild.memberCount - 1} | Channels: ${guild.channels.size}`);
    }

    require("fs").readdirSync(require("path").join(__dirname, "scripts")).forEach(function (file) {
        h.log(`Loading script: '${file}'`);
        let script = require("./scripts/" + file);
        for (let cmd in script) {
            if (!existsInRunnable(cmd)) {
                runnable[cmd] = script[cmd];
                h.log(`Loaded command '${cmd}' from script '${file}'`);
            } else {
                h.log(`Failed loading command '${cmd}' from script '${file}' (command already exists)`);
            }
        }
        h.log(`Finished loading script: '${file}'`);
    });
});

//This event triggers when the bot joins a server.
Client.on("guildCreate", guild => {
    h.log(`${h.verboseUserTag(Client.user)} joined ${h.verboseGuildTag(guild)}`);
});

//This event triggers when the bot is removed from a server.
Client.on("guildDelete", guild => {
    h.log(`${h.verboseUserTag(Client.user)} was kicked/left ${h.verboseGuildTag(guild)}`);
});

Client.on("messageDelete", async message => {
    // Logging deleted messages: message.reply(`${message.createdAt} "${message.content}"`, {code: true});
});

// This event will run on every single message received, from any channel or DM.
Client.on("message", async message => {
    if (isBadMessage(message)) return;
    if (message.system) {
        onSystemMessage(message);
    } else if (message.author.bot) {
        onBotMessage(message);
    } else if (message.content.startsWith(Config.cmdPrefix)) {
        await cmdController(message);
        //Keep the CMDs out of chat
        message.delete();
    }
});

function isBadMessage(message) {
    return message.guild === null || !message.guild.available || message.author.id === Client.user.id;
}

function onBotMessage(message) {
}


function onSystemMessage(message) {
}

const runnable = {};

function existsInRunnable(funcName) {
    return runnable[funcName] != null;
}

//rename (check), enabled (check), requireAdmin (check)
async function cmdController(message) {
    let args = message.content.substr(Config.cmdPrefix.length);
    args = args.split(" ");

    let cmd = args.shift().toLowerCase();
    if (existsInRunnable(cmd)) {
        let result = false;
        if (h.isAdmin(message.member)) {
            result = runnable[cmd](message, args);
        }
        h.log(`${h.verboseUserTag(message.author)} ${(result) ? 'ran' : 'attempted to run'} '${cmd}${(args > 0) ? ' ' + args : ''}' in ${h.verboseChannelTag(message.channel)}`);
    }
}


Client.login(Config.botToken);