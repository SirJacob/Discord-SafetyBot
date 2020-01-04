const h = require("../helper.js");
let request = require("request"); // devDependencies

let serverIP;
let url;

let channel;
let lastMessage;
let appendText;

let timer;

module.exports.mcstatus = async function (message, args) {
    if (!h.range(1, 2).includes(args.length)) return;

    if (lastMessage !== undefined) module.exports.terminate();

    channel = message.channel;
    serverIP = args[0];
    url = `https://api.mcsrvstat.us/2/${serverIP}`;
    if (args[1] !== undefined) appendText = args[1];

    updateStatus();
    timer = setInterval(updateStatus, 120000);
    return true;
};

module.exports.terminate = async function () {
    if (timer !== undefined) clearInterval(timer);
    if (lastMessage !== undefined) lastMessage.delete();
};

function updateStatus() {
    h.log(`Updating server status on '${serverIP}'`);

    request(url, function (error, response, body) {
        let server = JSON.parse(body);
        if (server["online"]) {
            lastMessage = h.updateMessage(`
            ${server["motd"]["clean"][0]}
            IP: ${serverIP}
            The server is UP with ${server["players"]["online"]}/${server["players"]["max"]} players online
            (data refreshes every 2 mins)

${appendText}`, channel, lastMessage);
        } else {
            lastMessage = h.updateMessage(`The server is DOWN! :(`, channel, lastMessage);
        }
    });
}