const h = require("./helper.js");
const l = require("./Logger");
/*
Represents a single command loaded from a Script file in the ./scripts/ directory.
 */
module.exports.Command = class Command {
    properties = {}
    func;

    constructor(commandObject) {
        this.func = commandObject.func;
        this.properties = commandObject.properties;
    }

    /*
    Performs all necessary checks to ensure that the request is in line with all restrictive properties and rights
    requirements. If it is, the request is processed and the function is executed.
     */
    attemptCommand(message, args) {
        if (h.range(this.properties.args.min, this.properties.args.max).includes(args.length)) { // Args range check
            if ((this.properties.requireAdmin && h.isAdmin(message.member)) || !this.properties.requireAdmin) { // Rights check
                this.func(message, args); // Execute function, passing the original message and the parsed arguments
                l.pFormatLog({
                    message: `Command Executed
Who/Where: ${h.verboseUserTag(message.author)} in ${h.verboseChannelTag(message.channel)}
What: ${message.content}`,
                    level: `VERBOSE`,
                    tag: `SCRIPTS`
                });
            } else {
                l.pFormatLog({
                    message: `Command Failed (Unauthorized)
Who/Where: ${h.verboseUserTag(message.author)} in ${h.verboseChannelTag(message.channel)}
What: ${message.content}`,
                    level: `VERBOSE`,
                    tag: `SCRIPTS`
                });
            }
        }
    }
}
