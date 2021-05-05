const {Command} = require("./Command");
/*
Represents a loaded Script file from the ./scripts/ directory.
 */
module.exports.Script = class Script {
    initializer;
    terminator;
    commands = {};

    constructor(scriptObj) {
        /* Initializer/Terminator */
        this.initializer = scriptObj[`initialize`];
        this.terminator = scriptObj[`terminate`];
        delete scriptObj.initialize;
        delete scriptObj.terminate;

        /* Utilize Commands */
        for (let cmd in scriptObj) {
            this.commands[cmd.substr(4)] = new Command(scriptObj[cmd]);
        }

        this.initialize();
    }

    /*
    Locates the command by name and returns the corresponding Command class object, and passes the request to it.
     */
    attemptCommand(message, cmd, args) {
        let command = this.commands[cmd];
        command.attemptCommand(message, args);
    }

    initialize() {
        // If an initializer is present, execute it.
        if (this.initializer !== undefined) {
            this.initializer();
        }
    }

    terminate() {
        // If an terminator is present, execute it.
        if (this.terminator !== undefined) {
            this.terminator();
        }
    }
}
