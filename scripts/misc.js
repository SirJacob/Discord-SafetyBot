const sb = require("../SafetyBot.js");
const h = require("../helper.js");
const sm = require("../ScriptManager.js");

module.exports.cmd_avatar = {
    func: function (message, args) {
        let user;
        if (args.length === 1) {
            user = h.getUser(args[0]);
        } else {
            user = message.author;
        }
        if (user != null) {
            h.sendMessage(message.author, message.author, `${h.userToMention(user)}'s avatar can be found at: ${user.displayAvatarURL()}`);
        }
    },
    properties: {
        args: {
            min: 0,
            max: 1
        },
        requireAdmin: false
    }
}


module.exports.cmd_ping = {
    func: function (message, args) {
        h.sendMessage(message.author, message.author, `Pong!`);
    },
    properties: {
        args: {
            min: 0,
            max: 0
        },
        requireAdmin: false
    }
};

module.exports.cmd_halt = {
    func: function (message, args) {
        if (args.length !== 0) return;
        sb.terminate();
    },
    properties: {
        args: {
            min: 0,
            max: 0
        },
        requireAdmin: true
    }
}

//Ex: tC = { `avatar`: `Misc.js` };
module.exports.cmd_scripts = {
    func: function (message, args) {
        let newObj = {};
        for (let key in sm.ScriptManager.takenCommands) {
            let value = sm.ScriptManager.takenCommands[key];
            if (newObj[value] === undefined) {
                newObj[value] = [key];
            } else {
                newObj[value].push(key);
            }
        }
        message.author.send(`"Scripts": ` + JSON.stringify(newObj, null, 4));
    },
    properties: {
        args: {
            min: 0,
            max: 0
        },
        requireAdmin: true
    }
}
