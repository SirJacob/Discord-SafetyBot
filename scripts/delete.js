const h = require("../helper.js");

/* ==> WARNING: UNTESTED <== */

module.exports.delete = async function (message, args) {
    // TODO: Convert delete functions to reusable code
    let fetchLimit = 50 + 1; // TODO: Figure out Discord's limit and pick a limit
    if (args.length === 1 && !isNaN(args[0])) {
        cmdDeleteNumber(message, args, fetchLimit);
    } else if (args.length === 1 && args[0].indexOf('<@') === 0) {
        cmdDeleteMention(message, args, fetchLimit);
    } else if (args.length >= 1) {
        cmdDeleteKeyword(message, args, fetchLimit);
    }
};

async function cmdDeleteNumber(message, args, fetchLimit) {
    let fetchedMessages = await message.channel.fetchMessages({limit: fetchLimit});
    fetchedMessages.delete(fetchedMessages.keyArray()[0]);
    let numDeleted = await cmdDelete(fetchedMessages);
    //console.log(`@${storage.msg.author.tag} bulk deleted ${Math.min(fetchedMessages.size - 1, 50)}/50 message(s) in ${storage.msg.guild.name} ==> ${storage.msg.channel.name} | Method: Number`);
    log(`${h.verboseUserTag(message.author)} bulk deleted ${numDeleted} message(s) in ${h.verboseChannelTag(message.channel)} | Method: Number`);
}

async function cmdDeleteMention(message, args, fetchLimit) {
    let user = h.getUser(args[0]);
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
    console.log(`${h.verboseUserTag(message.author)} bulk deleted ${numDeleted} message(s) from ${h.verboseUserTag(user)} in ${h.verboseChannelTag(message.channel)} | Method: Mention`);
}

async function cmdDeleteKeyword(message, args, fetchLimit) {
    let fetchedMessages = await message.channel.fetchMessages({limit: fetchLimit});
    fetchedMessages.delete(fetchedMessages.keyArray()[0]);
    let numDeleted = await cmdDelete(fetchedMessages.filter(element => element.content.search(new RegExp(args.join(" "), 'i')) > -1));
    console.log(`@${h.verboseUserTag(message.author)} bulk deleted ${numDeleted} message(s) in ${h.verboseChannelTag(message.channel)} | Method: Keyword`);
}

async function cmdDelete(fetchedMessages) {
    let numDeleted = 0;
    for (let key of fetchedMessages) {
        fetchedMessages.get(key[0]).delete();
        numDeleted++;
    }
    return numDeleted;
}