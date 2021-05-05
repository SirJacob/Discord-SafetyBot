// TODO: Script/command unloading
const l = require("./Logger.js");
const {Script} = require("./Script");
const h = require("./helper.js");
module.exports.ScriptManager = class ScriptManager {
    static takenCommands = {};// Ex: tC = { `avatar`: `Misc.js` };
    static myScripts = {}; // Ex: sM = { `Misc.js`: Script(`Misc.js`) };

    static loadScript(fileName) {
        let con = new l.Logger(`VERBOSE`, `SCRIPTS`);
        let path = `./scripts/` + fileName;
        let scriptObj = h.deepCopy(require(path));
        con.log(`Starting to load script from file: ${fileName}`);
        for (let functionName in scriptObj) { // scriptObj: entire script file; cmd: each function name
            if (functionName !== `initialize` && functionName !== `terminate` && !functionName.startsWith(`cmd_`)) {
                delete scriptObj[functionName]; // For security & processing reasons, purge all the exports we don't need
            } else { // Else, handle the function
                if (functionName.startsWith(`cmd_`)) { // If is important to skip the init and term functions
                    functionName = functionName.substr(4); // Trim `cmd_` prefix
                    if (this.takenCommands[functionName] === undefined) { // If command name isn't taken
                        this.takenCommands[functionName] = fileName; // Point that command to the script file that will provide the function
                    } else {
                        delete scriptObj[`cmd_${functionName}`]; // Purge dupes
                        con.logORLevel(`Refused the loading of ${functionName} from ${fileName} because ${functionName} from ${this.takenCommands[functionName]} was already loaded.`, `WARN`);
                    }
                }
            }
        }
        this.myScripts[fileName] = new Script(scriptObj);
        con.log(`Finished loading script from file: ${fileName}`);
    }

    /*
    Searches for the command in the takenCommands variable, if found uses the returned filename to locate the proper
    Script class object responsible for the command, and then passes the request to it.
     */
    static attemptCommand(message, cmd, args) {
        let filename = this.takenCommands[cmd];
        if (filename !== undefined) {
            let script = this.myScripts[filename];
            script.attemptCommand(message, cmd, args);
        }
    }

    static terminateAll() {
        for (let scriptFilename in this.myScripts) {
            this.terminate(scriptFilename);
        }
    }

    static terminate(scriptFilename) {
        l.iLog(`Attempting ${scriptFilename.substr(0, scriptFilename.length - 3)}.terminate();`); // Log file that requested shutdown
        this.myScripts[scriptFilename].terminate();
    }

    static toString() {
        return `Currently, ${Object.keys(ScriptManager.takenCommands).length} command(s) from ${Object.keys(ScriptManager.myScripts).length} file(s) are loaded into memory.`;
    }

}
