// TODO: Cleanup old documentation; add new documentation
// TODO: Allow many of the command to be executed in bulk
// TODO: Sharding?
const Discord = require("discord.js");
const Config = require("./config.json");
const h = require("./helper.js");
const fs = require("fs");
const path = require("path");
const sbEvents = new (require('events').EventEmitter);
const Client = new Discord.Client({
    "apiRequestMethod": "burst" // sequential or burst
});
const l = require("./Logger.js");
const {ScriptManager} = require("./ScriptManager");
/* Exports that scripts can use */
module.exports.Client = Client;
module.exports.terminate = terminate;
module.exports.events = sbEvents;

Client.on('rateLimit', rateLimitInfo => {
    l.pFormatLog({
        message: `The Discord API is rate limiting our connection! Consider implementing queueing.`,
        level: `WARN`,
        tag: `API`
    })
});

let botReady = false;

//This event will run if the bot starts, and logs in, successfully.
Client.on("ready", async () => {
    let con = new l.Logger(`INFO`, `API`);

    con.log(`${h.verboseUserTag(Client.user)} connected to Discord API.`);
    sub_printSummaryReconnect(con);

    con.setTag(`SCRIPTS`);
    // Create a scripts folder
    let scriptsFolder = path.join(__dirname, "scripts");
    if (!fs.existsSync(scriptsFolder)) {
        con.log(`Creating a scripts folder.`);
        fs.mkdirSync(scriptsFolder);
    }

    fs.readdirSync(scriptsFolder).forEach(function (file) {
        con.log(`Discovered ${file}`);
        ScriptManager.loadScript(file);
    });
    con.log(ScriptManager);
    Client.user.setActivity(Config.defaultActivity); // This can only be used when servicing one server

    con.logORTag(`Bot ready!`, `BOOT`);
    botReady = true;
});

function sub_printSummaryReconnect(con) {
    let memberCount = 0;
    for (let key of Client.guilds.cache) {
        let guild = Client.guilds.cache.get(key[0]);
        con.logORLevel(`Reconnected to ${h.verboseGuildTag(guild)} with ${guild.memberCount} user(s) & ${guild.channels.cache.size} channel(s)`, `VERBOSE`);
        memberCount += guild.memberCount;
    }
    // TODO: memberCount- change potential reach to total reach (only count unique users)
    con.log(`Summary Reconnect (Total Reach):
    ${Client.guilds.cache.size} server(s)
    ${memberCount} user(s) (Potential Reach (<=) - Non-unique users counted)
    ${Client.channels.cache.size} channel(s)\n`)
}


//This event triggers when the bot joins a server.
Client.on("guildCreate", guild => {
    l.iLog(`${h.verboseUserTag(Client.user)} joined ${h.verboseGuildTag(guild)}`);
});

//This event triggers when the bot is removed from a server.
Client.on("guildDelete", guild => {
    l.iLog(`${h.verboseUserTag(Client.user)} was kicked/left ${h.verboseGuildTag(guild)}`);
});

Client.on("messageDelete", async message => {
    // Logging deleted messages: message.reply(`${message.createdAt} "${message.content}"`, {code: true});
});

// This event will run on every single message received, from any channel or DM.
Client.on("message", async message => {
    if (!botReady || isBadMessage(message)) return;
    if (message.system) {
        onSystemMessage(message);
    } else if (message.author.bot) {
        onBotMessage(message);
    } else if (message.content.startsWith(Config.cmdPrefix)) {
        await cmdController(message);
        //Keep the CMDs out of chat
        message.delete();
    } else {
        sbEvents.emit("MESSAGE_USER", message);
    }
});

/*
message.guild === null => ignore DMs
!message.guild.available => ensure guild is online and accessible
message.author.id === Client.user.id => ensure we don't hear ourselves talk
 */
function isBadMessage(message) {
    return message.guild === null || !message.guild.available || message.author.id === Client.user.id;
}

/* UNUSED */
function onBotMessage(message) {
    sbEvents.emit("MESSAGE_BOT", message);
}

/* UNUSED */
function onSystemMessage(message) {
    sbEvents.emit("MESSAGE_SYSTEM", message);
}

/*
Prepares the command by separating it into it's command and argument components. Then passes the request to
ScriptManager.
 */
async function cmdController(message) {
    let splitMe = message.content.substr(Config.cmdPrefix.length);

    /* Regular expression credit: https://stackoverflow.com/a/18647776/5216257 */
    //The parenthesis in the regex creates a captured group within the quotes
    let regex = /[^\s"]+|"([^"]*)"/gi;
    let args = [];
    do {
        //Each call to exec returns the next regex match as an array
        var match = regex.exec(splitMe);
        if (match != null) {
            //Index 1 in the array is the captured group if it exists
            //Index 0 is the matched text, which we use if no captured group exists
            args.push(match[1] ? match[1] : match[0]);
        }
    } while (match != null);

    let cmd = args.shift().toLowerCase();
    ScriptManager.attemptCommand(message, cmd, args);
    // TODO: Logging failed non-authorization based security Object test
}

// TODO: Timeout on termination scripts to prevent hanging?
// TODO: Better use of async/promise system
async function terminate() {
    botReady = false;
    l.pFormatLog({
        message: `PoliceBot.terminate(): Shutdown request, please wait while termination scripts are executed...`,
        level: `INFO`,
        tag: `SCRIPTS`
    });
    ScriptManager.terminateAll();
    process.exit(0);
}

//h.log(`[API] Attempting to connect to Discord API...`);
Client.login(Config.botToken);
//member.roles.cache.some(role => role.name === 'Mod');
