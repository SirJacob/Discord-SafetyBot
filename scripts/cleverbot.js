const pb = require("../PoliceBot.js");
const h = require("../helper.js");
const Config = require("../config.json"); // Add to the config: "cleverbotToken": "YOUR_TOKEN"
let request = require("request"); // devDependencies

let channel;
let cleverbotState; // a.k.a cs

module.exports.initialize = function () {
    pb.events.on("message", async message => {
        if (message.author === pb.Client.user) return;
        if (channel !== message.channel) return;
        askCleverbot(message);
    });
};

module.exports.cleverbot = function (message, args) {
    if (!h.range(1, 2).includes(args.length)) return;
    cmd = args[0];
    if (cmd === "start" && args.length === 1) {
        channel = message.channel;
    } else if (cmd === "stop" && args.length === 1) {
        channel = undefined;
        cleverbotState = undefined;
    } else if (cmd === "getcs" && args.length === 1) {
        h.sendMessage(message.author, message.author, (cleverbotState === undefined) ?
            `No cleverbot state exists. A new chat instance will be started on your next chat.` :
            `Your cleverbot state is: ${cleverbotState} You can use ${Config.cmdPrefix}state ${cleverbotState} to continue this chat session later.`);
    } else if (cmd === "state" && args.length === 2) {
        if (channel === undefined) {
            h.sendMessage(message.author,message.author,`You must use '${Config.cmdPrefix}cleverbot start' first!`);
            return;
        }
        h.sendMessage(message.author, message.channel,
            `<@!${message.author.id}> changed Cleverbot's context state${(cleverbotState === undefined) ? ''
                : ` from ${cleverbotState}`} to '${args[1]}'`);
        cleverbotState = args[1];
    } else if (cmd === "new" && args.length === 1) {
        cleverbotState = undefined;
    }
};

function askCleverbot(message) {
    console.log(cleverbotState);
    let url = `https://www.cleverbot.com/getreply?key=${Config.cleverbotToken}&input=${encodeURI(message.content)}
    ${(cleverbotState === undefined) ? `` : `&cs=${cleverbotState}`}`;

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
            h.log(`Request Error: ${apiError}`);
            return;
        }
        output = JSON.parse(body);
        if (cleverbotState === undefined) cleverbotState = output["cs"];
        h.sendMessage(message.author, message.channel, `Cleverbot: ${output["output"]}`);
        console.log(cleverbotState);
    });
}