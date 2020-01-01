const h = require("../helper.js");

module.exports.giveall = function cmdGiveAll(message, args) {
    return cmdMassRole(message, args, true);
};

module.exports.takeall = function cmdTakeAll(message, args) {
    return cmdMassRole(message, args, false);
};

/*
 * @param {String} roleString - The supplied string used to searched for a server role.
 * @param {Boolean} give - If true, mass give a role. If false, mass remove a role.
 * @returns {Boolean} - If the mass role add/remove succeeded.
 */
function cmdMassRole(message, args, give) {
    //if(args !== 1) return;

    let role = message.guild.roles.find(function (element) {
        return element.name.search(new RegExp(args[0], 'i')) > -1;
    });

    if (role === null) {
        log(`${h.verboseUserTag(message.author)} attempted to ${give ? "give" : "remove"} the role "${args[0]}" ${give ? "to" : "from"} @everyone, but the role couldn't be found.`);
        return;
    }

    for (let key of message.guild.members) {
        let guildMember = h.getUser(key[0], message.guild);
        if (!guildMember.user.bot) {
            if (give) {
                guildMember.addRole(role.id);
            } else {
                guildMember.removeRole(role.id);
            }
        }
    }

    log(`${h.verboseUserTag(message.author)} ${give ? "gave" : "removed"} the role "${role.name}" ${give ? "to" : "from"} @everyone in ${h.verboseGuildTag(message.guild)}.`);
    return true;
}