// TODO: On join, let people know the command to start cleverbot
// TODO: Fix weird character output on cleverbot speaking a non-English lang

const pb = require("../PoliceBot.js");
const h = require("../helper.js");
const Config = require("../config.json"); // Add to the config: "cleverbotToken": "YOUR_TOKEN"
let request = require("request"); // devDependencies
const fs = require("fs");
const path = require("path");

let memory = {};
let memoryPath = path.join(__dirname, "..", "cleverbotMemory.json");
let messagesSent = 0;

const googleTranslateToken = Config.googleTranslateToken;
let saveMemoryTimer;

module.exports.initialize = function () {
    if (fs.existsSync(memoryPath)) {
        memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    }

    for (let key of pb.Client.guilds) {
        let guild = pb.Client.guilds.get(key[0]);
        if (memory[guild.id] === undefined) memory[guild.id] = {};
    }

    saveMemoryTimer = setInterval(saveMemory, 120000);

    pb.events.on("message", async message => {
        if (memory[message.guild.id]["channel"]["id"] !== message.channel.id) return;
        if (message.content.toLowerCase() === "find me a picture of a giraffe holding a poster") { // easter egg
            h.sendMessage(message.author, message.channel, {
                files: ['https://cdn.discordapp.com/attachments/339222007197597697/663681291262099477/unknown.png']
            });
        } else {
            askCleverbot(message);
        }
    });
};

pb.Client.on("guildCreate", guild => {
    if (memory[guild.id] === undefined) memory[guild.id] = {};
    h.sendMessage(guild.systemChannel, guild.systemChannel, `Thanks for adding me to your server!
Type the follow command in a channel you wish to start chatting with Cleverbot in: ${Config.cmdPrefix}cleverbot start
Other commands can be found by typing: ${Config.cmdPrefix}cleverbot help`);
});

module.exports.cleverbot = async function (message, args) {
    if (!h.range(1, 2).includes(args.length)) return;

    let cmd = args[0];
    if (cmd === "start" && args.length === 1) {
        memory[message.guild.id]["channel"] = message.channel;
        //pb.Client.user.setActivity(`Talking in #${message.channel.name}`); // This can only be used when servicing one server
        await h.sendMessage(message.author, message.channel, `Thanks for setting me up <@!${message.author.id}>! Anyone can reply to this channel to chat with me now!`);
        await h.sendMessage(message.author, message.channel, `Don't forget, if you need help you can type: ${Config.cmdPrefix}cleverbot help`);
    } else if (cmd === "stop" && args.length === 1) {
        memory[message.guild.id]["channel"] = undefined;
        memory[message.guild.id]["cleverbotState"] = undefined;
        //pb.Client.user.setActivity(Config.defaultActivity); // This can only be used when servicing one server
        h.sendMessage(message.author, message.channel, `Okay <@!${message.author.id}>, I'll stop chatting in this channel.`);
    } else if (cmd === "getcs" && args.length === 1) {
        h.sendMessage(message.author, message.author, (memory[message.guild.id]["cleverbotState"] === undefined) ?
            `No cleverbot state exists. A new chat instance will be started on your next chat.` :
            `Your cleverbot state is: ${memory[message.guild.id]["cleverbotState"]} You can use ${Config.cmdPrefix}cleverbot state "${memory[message.guild.id]["cleverbotState"]}" to continue this chat session later.`);
    } else if (cmd === "state" && args.length === 2) {
        if (memory[message.guild.id]["channel"] === undefined) {
            h.sendMessage(message.author, message.author, `You must use '${Config.cmdPrefix}cleverbot start' first!`);
            return;
        }
        h.sendMessage(message.author, message.channel,
            `<@!${message.author.id}> changed Cleverbot's context state${(memory[message.guild.id]["cleverbotState"] === undefined) ? ''
                : ` from ${memory[message.guild.id]["cleverbotState"]}`} to ${args[1]}`);
        memory[message.guild.id]["cleverbotState"] = args[1];
    } else if (cmd === "new" && args.length === 1) {
        memory[message.guild.id]["cleverbotState"] = undefined;
    } else if (cmd === "help" && args.length === 1) {
        h.sendMessage(message.author, message.author, `Cleverbot Commands:
${Config.cmdPrefix}cleverbot start -> Start talking to Cleverbot in this channel.
${Config.cmdPrefix}cleverbot stop -> Stop talking to Cleverbot in this channel.
${Config.cmdPrefix}cleverbot new -> Start a new conversation with Cleverbot.
${Config.cmdPrefix}cleverbot getcs -> Get Cleverbot's state. This is needed to go back to a previous conversation.
${Config.cmdPrefix}cleverbot state "CLEVERBOT_STATE_HERE" -> Supply a Cleverbot state and return to a previous conversation.

Note: Right now, Cleverbot can only talk in one channel at a time.
Developed by: <@!125113255436877824> (https://github.com/SirJacob/Discord-PoliceBot/tree/cleverbot)
Cleverbot costs money to maintain, please consider supporting for any amount <3 https://paypal.me/CoryUgone`);
    } else if (cmd === "stats" && args.length === 1){
        h.sendMessage(message.author, message.author, `${messagesSent} messages have been sent since restart.`);
    }
    return true;
};

function askCleverbot(message) {
    /* Cleverbot API */
    let url = `https://www.cleverbot.com/getreply?key=${Config.cleverbotToken}&input=${encodeURI(message.content)}
    ${(memory[message.guild.id]["cleverbotState"] === undefined) ? `` : `&cs=${memory[message.guild.id]["cleverbotState"]}`}`;

    request(url, function (error, response, body) {
        let apiError; // From: https://www.cleverbot.com/api/howto/
        switch (response.statusCode) {
            case 401:
                apiError = `Unauthorised due to missing or invalid API key or POST request, the Cleverbot API only accepts GET requests`;
                break;
            case 404:
                apiError = `API not found`;
                break;
            case 413:
            case 414:
                apiError = `Request too large if you send a request over 64Kb`;
                break;
            case 502:
            case 504:
                apiError = `Unable to get reply from API server, please contact us`;
                break;
            case 503:
                apiError = `Too many requests from a single IP address or API key`;
                break;
        }
        if (response.statusCode !== 200) {
            h.log(`Cleverbot API Request Error: ${apiError}`);
            return;
        }
        let output = JSON.parse(body);
        if (memory[message.guild.id]["cleverbotState"] === undefined) memory[message.guild.id]["cleverbotState"] = output["cs"];
        let cleverbotResponse = output["output"];
        if (cleverbotResponse.endsWith('.')) {
            cleverbotResponse = cleverbotResponse.substring(0, cleverbotResponse.length - 1);
        }
        /* Google Translate API */
        let translatedResponse = "";
        let detectedSourceLanguage = "";
        let targetLang = Config.cleverbotTargetLang || "en";
        if (googleTranslateToken === undefined) { // Google Translate (free)
            url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURI(cleverbotResponse)}`;
            request(url, function (error, response, body) {
                if (response.statusCode !== 200) {
                    h.log(`translate.googleapis API Request Error: Status Code ${response.statusCode}`);
                    return;
                }
                let output = JSON.parse(body);
                detectedSourceLanguage = output[2];
                translatedResponse = output[0][0][0];
                // TODO: Fix duplicate code
                if (detectedSourceLanguage === "en" || translatedResponse === cleverbotResponse) {
                    output = cleverbotResponse;
                } else {
                    output = `${translatedResponse} (${detectedSourceLanguage}: ${cleverbotResponse})`;
                }
                h.sendMessage(message.author, message.channel, output);
            });
        } else { // Google Cloud Translation API (paid)
            url = `https://translation.googleapis.com/language/translate/v2?target=${targetLang}&key=${googleTranslateToken}&q=${encodeURI(cleverbotResponse)}`;
            request(url, function (error, response, body) {
                if (response.statusCode !== 200) {
                    h.log(`translation.googleapis API Request Error: Status Code ${response.statusCode}`);
                    return;
                }
                let output = JSON.parse(body)["data"]["translations"][0];
                detectedSourceLanguage = output["detectedSourceLanguage"];
                translatedResponse = output["translatedText"];
                // TODO: Fix duplicate code
                if (detectedSourceLanguage === "en" || translatedResponse === cleverbotResponse) {
                    output = cleverbotResponse;
                } else {
                    output = `${translatedResponse} (${detectedSourceLanguage}: ${cleverbotResponse})`;
                }
                h.sendMessage(message.author, message.channel, output);
            });
        }
    });
    messagesSent += 1;
}

function saveMemory() {
    fs.writeFileSync(memoryPath, JSON.stringify(memory));
    h.log(`Wrote memory to disk`);
}

module.exports.terminate = function () {
    if (saveMemoryTimer !== undefined) clearInterval(saveMemoryTimer);
    saveMemory();
};