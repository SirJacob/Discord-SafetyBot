// TODO: Cleanup old documentation; add new documentation
// TODO: Allow many of the command to be executed in bulk
const Discord = require("discord.js");
const Config = require("./config.json");
const h = require("./helper.js");
const fs = require("fs");
const path = require("path");
const pbEvents = new (require('events').EventEmitter);
const Client = new Discord.Client({
    "apiRequestMethod": "burst" // sequential or burst
});
/* Exports that scripts can use */
module.exports.Client = Client;
module.exports.terminate = terminate;
module.exports.events = pbEvents;

/* Removed disabledEvents from ClientOptions and stopped removing all disabledEvents listeners because of role giving/
* taking was leading to timeouts. May reimplement/reinvestigate if memory issues are found again. */
Client.on('newListener', (event, listener) => {
});

Client.on('rateLimit', rateLimitInfo => {
    h.log("Discord API rate limit warning!");
});

let botReady = false;

//This event will run if the bot starts, and logs in, successfully.
Client.on("ready", async () => {
    Client.user.setActivity(Config.defaultActivity);
    h.log(`${h.verboseUserTag(Client.user)} online. Connected to ${Client.guilds.size} Discord server(s) serving ${Client.users.size} unique user(s) in ${Client.channels.size} channel(s).`);
    for (let key of Client.guilds) {
        let guild = Client.guilds.get(key[0]);
        h.log(`Reconnected to ${h.verboseGuildTag(guild)} | Users: ${guild.memberCount} | Channels: ${guild.channels.size}`);
    }

    // Create a scripts folder
    let scriptsFolder = path.join(__dirname, "scripts");
    if (!fs.existsSync(scriptsFolder)) {
        h.log(`Creating a scripts folder`);
        fs.mkdirSync(scriptsFolder);
    }

    let loadedScripts = 0;
    let loadedCmds = 0;
    // TODO: More robust script loading
    fs.readdirSync(scriptsFolder).forEach(function (file) {
        h.log(`Loading script: '${file}'`);
        let script = require("./scripts/" + file);
        for (let cmd in script) {
            if (cmd === "initialize") {
                h.log(`Initializing '${file}'`);
                script[cmd]();
            } else if (cmd === "terminate") {
                terminationScripts.push(script[cmd]);
            } else if (!existsInRunnable(cmd)) {
                h.log(`Loading command '${cmd}' from '${file}'`);
                runnable[cmd] = script[cmd];
                loadedCmds += 1;
            } else {
                h.log(`Failed loading command '${cmd}' from '${file}' (command already exists)`);
            }
        }
        h.log(`Loaded script: '${file}'`);
        loadedScripts += 1;
    });
    h.log(`Finished loading ${loadedCmds} cmds from ${loadedScripts} scripts`);
    botReady = true;
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
    if (!botReady) return;
    if (isBadMessage(message)) return;
    if (message.system) {
        onSystemMessage(message);
    } else if (message.author.bot) {
        onBotMessage(message);
    } else if (message.content.startsWith(Config.cmdPrefix)) {
        await cmdController(message);
        //Keep the CMDs out of chat
        message.delete();
    } else {
        pbEvents.emit("message", message);
    }
});

function isBadMessage(message) {
    return message.guild === null || !message.guild.available || message.author.id === Client.user.id;
}

function onBotMessage(message) {
}


function onSystemMessage(message) {
}

let runnable = {};

function existsInRunnable(funcName) {
    return runnable[funcName] != null;
}

//rename (check), enabled (check), requireAdmin (check)
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
    if (existsInRunnable(cmd)) {
        let result = false;
        if (h.isAdmin(message.member)) {
            result = runnable[cmd](message, args);
        }
        h.log(`${h.verboseUserTag(message.author)} ${(result) ? 'ran' : 'attempted to run'} '${cmd}${(args > 0) ? ' ' + args : ''}' in ${h.verboseChannelTag(message.channel)}`);
    }
}

let terminationScripts = [];

async function terminate() {
    h.log(`Running termination scripts and exiting`);
    botReady = false;
    for (let script in terminationScripts) {
        await terminationScripts[script](); // TODO: Timeout on termination scripts to prevent hanging?
    }
    process.exit(0);
}

Client.login(Config.botToken);