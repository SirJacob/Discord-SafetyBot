const h = require("../helper.js");

module.exports.softkick =
    async function cmdSoftKick(message, args) {
        if (args.length !== 1) return;

        let kickee = h.getUser(args[0], message.guild);
        let auditReason = `${message.author.tag} soft kicked ${kickee.user.tag}`;
        /* Send the invite before kicking so that the bot shares at least one common server with kickee and thus the
        message can be delivered. */
        let invite = await message.guild.systemChannel.createInvite({maxUses: 1, unique: true}, auditReason);
        await h.sendMessage(message.user, kickee, auditReason.replace(message.author.tag, h.userToMention(message.author.id)).replace(kickee.user.tag, "you!") + `\n${invite.url}`);
        kickee.kick(auditReason);
        return true;
    };