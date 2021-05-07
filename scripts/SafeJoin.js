// TODO: Logging to policebot-log channel?

const sb = require("../SafetyBot.js");
const h = require("../helper.js");
const Config = require("../config.json"); // TODO: Object config memory
const mail = require("./SendMail.js");
const mysql = require('mysql');
const l = require("../Logger.js");

let mysqlPool;
module.exports.verifyCache = {};
let safeJoinRole;

sb.events.on("MESSAGE_USER", message => {
    // TODO: systemChannel causes crash if not set
    if (!h.isAdmin(message.member) &&
        message.channel.id === message.guild.systemChannel.id) {
        message.delete({
            reason: `Talking in system channel` // TODO: Doesn't get logged to audit log?
        });
    }
});

sb.Client.on("guildMemberAdd", guildMember => {
    // `${h.verboseUserTag(guildMember)} joined ${h.verboseGuildTag(guildMember.guild)}`
    mysqlPool.getConnection(function (err, connection) {
        if (err) throw err;
        connection.query(`SELECT COUNT(*) FROM \`safejoin\` WHERE \`discord_id\` = '${guildMember.id}'`, function (error, results, fields) {
            if (results[0][`COUNT(*)`] === 1 && safeJoinRole !== undefined) {
                guildMember.roles.add(safeJoinRole, `Already verified with SafeJoin`);
            }
            connection.release(); // When done with the connection, release it.
            if (error) throw error; // Handle error after the release
        });
    });
});

/* Commands */

//module.exports.perm_verify = false;
/*

 */
module.exports.cmd_verify = {
    func: function (message, args) {
        args[0] = args[0].toLowerCase().trim();
        if (args[0].endsWith(Config.SafeJoin_Domain)) {
            let emailID = args[0].substring(0, args[0].indexOf(Config.SafeJoin_Domain));
            let verifyKey = genVerifyKey(16);
            if (module.exports.verifyCache === undefined) {
                module.exports.verifyCache = {};
            }
            module.exports.verifyCache[verifyKey] = {
                'emailID': emailID,
                'discord_user': message.author,
                'guild': message.guild
            };

            mail.send({
                to: `${args[0]}`,
                from: 'SafeJoin@coryug.one',
                template_id: 'd-21bb0ae55ddb4b9cbedc9422239ebe81',
                dynamic_template_data: {
                    "verify-link": `${Config.SafeJoin_extWebservAddr}/MU/SafeJoin?verify=${verifyKey}`
                }
            });

            l.formatLog(`verifyCache: userID ${emailID}, verifyKey ${verifyKey}`, `VERBOSE`);
            h.sendEmbed(message.member, {
                title: `Marymount University Discord SafeJoin`,
                color: 0x275075, // Marymount Blue
                description: `Please check your ${Config.SafeJoin_Domain.substring(1)} email to continue the verification process!`
            });
        } else {
            let targetGuildMember = h.getUser(args[0], message.guild);
            if (targetGuildMember !== undefined && h.isAdmin(message.member)) {
                mysqlPool.getConnection(function (err, connection) {
                    if (err) throw err;
                    connection.query(`INSERT INTO \`safejoin\` (\`email\`, \`discord_id\`, \`verified_on\`) VALUES (NULL, '${targetGuildMember.id}', CURRENT_TIMESTAMP);`, function (error, results, fields) {
                        targetGuildMember.roles.add(safeJoinRole);
                        connection.release(); // When done with the connection, release it.
                        h.sendEmbed(targetGuildMember, {
                            title: `Marymount University Discord SafeJoin`,
                            color: 0x275075, // Marymount Blue
                            description: `You have been verified by ${h.userToMention(message.member)}. Welcome to the server!`
                        });
                        if (error) throw error; // Handle error after the release
                    });
                });
            }
        }
    },
    properties: {
        args: {
            min: 1,
            max: 1
        },
        requireAdmin: false
    }
}

module.exports.cmd_unverify = {
    func: function (message, args) {
        args[0] = args[0].toLowerCase().trim();
        let discord_id;
        if (args[0].endsWith(Config.SafeJoin_extWebservAddr)) { // If un-verifying an email
            let emailID = args[0].substring(0, args[0].indexOf(Config.SafeJoin_extWebservAddr));
            mysqlPool.getConnection(function (err, connection) {
                if (err) throw err;
                connection.query(`SELECT \`discord_id\` FROM \`safejoin\` WHERE \`email\` = '${emailID}' LIMIT 1;`, function (error, results, fields) {
                    discord_id = results[0][`discord_id`];
                    connection.release(); // When done with the connection, release it.
                    if (error) throw error; // Handle error after the release
                });
            });
        } else { // If un-verifying a mentioned user
            let targetGuildMember = h.getUser(args[0], message.guild);
            if (targetGuildMember !== undefined) {
                discord_id = targetGuildMember.id;
                targetGuildMember.roles.remove(safeJoinRole, `Unverified by ${message.author.tag}`);
            }
        }
        mysqlPool.getConnection(function (err, connection) {
            if (err) throw err;
            connection.query(`DELETE FROM \`safejoin\` WHERE \`discord_id\` = '${discord_id}' LIMIT 1;`, function (error, results, fields) {
                //assert(results.changedRows === 1);
                connection.release(); // When done with the connection, release it.
                if (error) throw error; // Handle error after the release
            });
        });
    },
    properties: {
        args: {
            min: 1,
            max: 1
        },
        requireAdmin: true
    }
}

module.exports.cmd_setup = {
    func: async function (message, args) {
        h.updateConfig(`SafeJoin_GuildID`, message.guild.id);
        await setupRoleControl();
        let categoryChannel = await h.findOrCreateChannel(message.guild, `safetybot`, {
            type: `category`,
            reason: `SafeJoin Setup`,
            permissionOverwrites: [
                {
                    id: message.guild.roles.everyone,
                    deny: ['VIEW_CHANNEL'],
                },
            ]
        });
        let verifyChannel = await h.findOrCreateChannel(message.guild, `safejoin-verify`, {
            type: `text`,
            topic: `Marymount University - Discord SafeJoin Verification`,
            nsfw: false,
            parent: categoryChannel,
            reason: `SafeJoin Setup`,
            permissionOverwrites: [
                {
                    id: message.guild.roles.everyone,
                    // TODO: Change SEND_MESSAGES to 'Use Slash Commands'
                    allow: [`VIEW_CHANNEL`, `READ_MESSAGE_HISTORY`, `SEND_MESSAGES`], //Discord.Permissions.DEFAULT,
                    type: `role`
                },
                {
                    id: safeJoinRole.id,
                    deny: [`VIEW_CHANNEL`], //Discord.Permissions.DEFAULT,
                    type: `role`
                }
            ]
        })
        await message.guild.setSystemChannel(verifyChannel);
        message.guild.setSystemChannelFlags([`WELCOME_MESSAGE_DISABLED`, `BOOST_MESSAGE_DISABLED`]);
        verifyChannel.createInvite({
            temporary: true,
            maxAge: 0,
            maxUses: 0,
            unique: true,
            reason: `SafeJoin Verify Invite`
        }).then((invite) => {
            verifyChannel.send(`Welcome! In order to maintain the safety of the community, you must verify your association with Marymount University.`);
            verifyChannel.send(`You can, at any time, invite other users to this Discord. They will also have to verify their association. To invite someone else, simply provide them with this link: ${invite.url}`);
            verifyChannel.send(`But, for now, please type the following command and then check your email: ${Config.cmdPrefix}verify YOUR_EMAIL@marymount.edu`)
        });
    },
    properties: {
        args: {
            min: 0,
            max: 0
        },
        requireAdmin: true
    }
}

module.exports.cmd_pending = {
    func: function (message, args) {
        let output = ``;
        for (let vKey in module.exports.verifyCache) {
            let emailID = module.exports.verifyCache[vKey][`emailID`];
            let discord_user = module.exports.verifyCache[vKey][`discord_user`];
            output = `@DiscordUser | email@marymount.edu | vKey (x1234) 
${h.userToMention(discord_user)} | ${emailID}@marymount.edu | x${vKey.substr(vKey.length - 4).toUpperCase()}`
        }
        message.author.send(`SafeJoin - Pending Verifications:\n${output}`);
    },
    properties: {
        args: {
            min: 0,
            max: 0
        },
        requireAdmin: true
    }
}

/* Helper Functions */

/* Credit: https://stackoverflow.com/a/1349426 */
function genVerifyKey(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

module.exports.addVerifiedByKey = function (verifyKey) {
    let emailID = module.exports.verifyCache[verifyKey]['emailID'];
    let discord_user = module.exports.verifyCache[verifyKey][`discord_user`];
    let guild = module.exports.verifyCache[verifyKey][`guild`]; // Allows for the easy upgrade to a multi-server supported SafeJoin
    module.exports.verifyCache[verifyKey] = undefined;

    mysqlPool.getConnection(function (err, connection) {
        if (err) throw err;
        connection.query(`INSERT INTO \`safejoin\` (\`email\`, \`discord_id\`, \`verified_on\`) VALUES ('${emailID}', '${discord_user.id}', CURRENT_TIMESTAMP);`, function (error, results, fields) {
            connection.release(); // When done with the connection, release it.
            if (error) throw error; // Handle error after the release
        });
    });
    h.sendEmbed(discord_user, {
        title: `Marymount University Discord SafeJoin`,
        color: 0x275075, // Marymount Blue
        description: `Thank you for keeping our community safe by verifying your email: ${emailID}@marymount.edu!`
    });
    guild.members.cache.get(discord_user.id).roles.add(safeJoinRole);
}

async function setupRoleControl() {
    if (Config.SafeJoin_GuildID !== ``) {
        // Load the Guild into memory and then the Guild's roles
        sb.Client.guilds.resolveID(Config.SafeJoin_GuildID);
        let guild = sb.Client.guilds.cache.get(Config.SafeJoin_GuildID);

        await guild.roles.fetch();
        guild.roles.cache.forEach(role => {
            if (role.name.toLowerCase() === `SafeJoin`.toLowerCase()) {
                safeJoinRole = role;
            } else if (role.name.toLowerCase() === `@everyone`) {
                role.setPermissions(0);
            }
        });
        if (safeJoinRole === undefined) { // hasRole check is important to maintain custom default-role user permissions
            safeJoinRole = await guild.roles.create(
                {
                    data: {
                        name: `SafeJoin`,
                        color: 0x275075, // MU Blue
                        position: 9999,
                        permissions: [`VIEW_CHANNEL`, `SEND_MESSAGES`, `CONNECT`, `SPEAK`, `USE_VAD`],
                        mentionable: false
                    }
                });
        }
    }
}

/* Setup/shutdown */

module.exports.initialize = function () {
    /* MySQL */
    mysqlPool = mysql.createPool({
        host: Config.mysqlHost,
        user: Config.mysqlUser,
        password: Config.mysqlPassword,
        database: Config.mysqlDatabase,
        connectionLimit: 10
    });
    setupRoleControl();
};

module.exports.terminate = function () {
    // TODO: Backup verify cache
    mysqlPool.end();
};
