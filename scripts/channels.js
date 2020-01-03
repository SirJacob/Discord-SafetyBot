/*
* Resets a channel (and its messages) while keeping it's name, topic, and permissions.
* Note: NSFW, slowmode, invites, channel position, and possibility webhooks will also be wiped.
* TODO: Ensure not DMChannel
 */
module.exports.wipechannel = async function (message, args) {
    if (args.length !== 0) return;

    await message.channel.clone();
    message.channel.delete(); // It doesn't look like providing a reason display it anywhere in the audit log
    return true;
};