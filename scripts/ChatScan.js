const sb = require("../SafetyBot.js");
const h = require("../helper.js");
const Discord = require("discord.js");
const request = require('request');
const l = require("../Logger.js");
const con = new l.Logger(`VERBOSE`);
const Config = require("../config.json");

// badWords from http://www.bannedwordlist.com/
const badWords = ["anal", "anus", "arse", "ass", "ballsack", "balls", "bastard", "bitch", "biatch", "blowjob", "blow job", "bollock", "bollok", "boner", "boob", "buttplug", "clitoris", "cock", "coon", "crap", "cunt", "damn", "dick", "dildo", "dyke", "fag", "feck", "fellate", "fellatio", "felching", "fuck", "f u c k", "fudgepacker", "fudge packer", "flange", "Goddamn", "God damn", "hell", "homo", "jerk", "jizz", "knobend", "knob end", "labia", "muff", "nigger", "nigga", "penis", "piss", "poop", "prick", "pube", "pussy", "queer", "scrotum", "sex", "shit", "s hit", "sh1t", "slut", "smegma", "spunk", "tit", "tosser", "turd", "twat", "vagina", "wank", "whore", "idgaf"];
const logChannels = {};

const scanMode_off = 0;
const scanMode_blacklist = 1;
const scanMode_unicornNLP = 2;
const scanMode = scanMode_unicornNLP;

// TODO: Log infractions to db? (discord audit log won't work well)
sb.events.on("MESSAGE_USER", message => {
    scanMsg(message).then(result => {
        if (result !== false) {
            /* Failed Scan */
            message.react('⚠');
            logToChannel(message,
                `[WARN] ChatScan - Offensive Content`,
                0xffff00, // Yellow
                `User: ${message.author}
    Message: ${message.cleanContent.trim()}
    Matched Rule: ${result}
    Posted on: ${message.createdAt}
    
    Goto: ${message.url}`,
                message.url);
        }
    });
});

sb.events.on("CONFIG_UPDATE", key => {
    if (key === `SafeJoin_GuildID`) {
        sb.Client.guilds.fetch(Config.SafeJoin_GuildID).then((guild) => {
            module.exports.setupLogChannel(guild);
        })
    }
});

sb.Client.on("messageUpdate", async (oldMessage, newMessage) => {
    let oldMsg = oldMessage.content;
    let newMsg = newMessage.content;
    if (oldMsg.length === 0 || (oldMsg === newMsg)) {
        return;
    }

    con.log(`
Message Update Alert
Old (${oldMsg.length}): ${oldMsg}
New (${newMsg.length}): ${newMsg}
${oldMessage.reactions.cache.size} Reactions`);

    await scanMsg(newMessage).then(result => {
        let body = `User: ${newMessage.author}
Edited Message: ${newMessage.cleanContent.trim()}
Matched Rule: ${result}
Edited On: ${newMessage.editedAt}
    
Original Message: ${oldMessage.cleanContent.trim()}
Originally Posted: ${oldMessage.createdAt}
    
Goto: ${newMessage.url}`;

        if (result !== false) {
            /* Failed Scan */
            newMessage.react('⚠');
            logToChannel(newMessage,
                `[WARN] ChatScan - Offensive Content (Edited)`,
                0xffff00, // Yellow
                body,
                newMessage.url);
        } else {
            /* Passed Scan */
            newMessage.reactions.cache.forEach((msgReaction, snowflake, map) => {
                if (msgReaction.emoji.toString() === `⚠` && msgReaction.me) {
                    msgReaction.remove();
                    logToChannel(newMessage,
                        `[INFO] ChatScan - Offensive Content Removed (Edited)`,
                        0x275075, // MU Blue
                        body,
                        newMessage.url);
                }
            });
        }
    });
});

/*
Generates a log message to the logging channel if a message that was flagged was deleted.
 */
sb.Client.on("messageDelete", async message => {
    // TODO: message.reactions.resolveAll();
    message.reactions.cache.forEach((msgReaction, snowflake, map) => {
            if (msgReaction.emoji.toString() === `⚠` && msgReaction.me) {
                scanMsg(message).then(result => {
                    if (result !== false) {
                        /* Failed Scan */
                        logToChannel(message,
                            `[INFO] ChatScan - Offensive Content Removed (Deleted)`,
                            0x275075, // MU Blue
                            `User: ${message.author}
Message: ${message.cleanContent.trim()}
Matched Rule: ${result}
Posted on: ${message.createdAt}`,
                            null);
                    }
                });
            }
        }
    )
});

/*
Returns the bad word, false otherwise.
 */
async function scanMsg(message) {
    return new Promise(await function (resolve, reject) {
        let messageContent = message.cleanContent.trim();
        if (scanMode === scanMode_blacklist) {
            for (let word in badWords) {
                word = badWords[word]; // convert index to value
                if (messageContent.includes(word)) {
                    //message.react('⚠'); // Reacting here may cause a reaction on a deleted message
                    resolve(word);
                }
            }
            return false;
        } else if (scanMode === scanMode_unicornNLP) { // TODO: Queue system
            const options = {
                method: 'POST',
                url: 'https://profanity-toxicity-detection-for-user-generated-content.p.rapidapi.com/',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'x-rapidapi-key': '75aabfaf19mshb2124ff6e394ab8p122452jsna006c6914e2e',
                    'x-rapidapi-host': 'profanity-toxicity-detection-for-user-generated-content.p.rapidapi.com',
                    useQueryString: true
                },
                form: {text: messageContent}
            };
            let result = [];
            request(options, function (error, response, body) {
                //console.log(body);
                if (error) throw new Error(error);

                let json = JSON.parse(body)["semantic_analysis"];
                for (let detection in json) {
                    let tag = json[detection]['name_semantic_model'];
                    if (!result.includes(tag)) {
                        result.push(tag.replaceAll(`_`, ` `).toUpperCase());
                    }
                }
                if (result.length > 0) {
                    resolve(`${result.join(', ')} (NLP)`);
                } else {
                    resolve(false); // TODO: reject(); here?
                }
            });
        }
    });
}

function logToChannel(message, title, color, body, url) {
    let embed = new Discord.MessageEmbed();
    embed.setTitle(title);
    embed.setColor(color);
    embed.setDescription(body);
    embed.setURL(url);
    logChannels[message.guild].send(embed);
}

module.exports.setupLogChannel = async function (guild) {
    let categoryChannel = await h.findOrCreateChannel(guild, `safetybot`, {
        type: `category`,
        reason: `ChatScan Script Install`,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: ['VIEW_CHANNEL'],
            },
        ]
    });
    logChannels[guild] = await h.findOrCreateChannel(guild, `chatscan-log`, {
        type: `text`,
        topic: `ChatScan Chat Logs`,
        nsfw: true,
        parent: categoryChannel,
        reason: `ChatScan Script Install`,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: ['VIEW_CHANNEL'],
            },
        ]
    });
    //logChannel.send(`@here This is where all suspicious behavior will be logged for review!`);
    con.log(`ChatScan Log Channel: Pointer created (${guild.name}/${logChannels[guild].name})`);
}

/* Setup/shutdown */

module.exports.initialize = function () {
    sb.Client.guilds.cache.forEach(guild => { // sb.Client.guilds (as long as sharding isn't being used)
        // TODO: Remove dev limiter
        if (Config.SafeJoin_GuildID === guild.id) {
            module.exports.setupLogChannel(guild);
        }
    });
};

