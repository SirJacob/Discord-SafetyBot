const callsites = require('callsites');
const h = require('./helper.js');

/*
Formats the log message with file and function name information, if applicable, then prints the data to console.
 */
module.exports.directLog = function log(message) {
    let csIndex = 0;
    for (; csIndex < callsites().length - 1; csIndex++) {
        if (!callsites()[csIndex].getFileName().includes(`Logger.js`)) {
            //console.log(`${csIndex-1}: ${callsites()[csIndex-1].getFileName()}\n${csIndex-1}:${callsites()[csIndex-1].getFunctionName()}`);
            //console.log(`${csIndex}: ${callsites()[csIndex].getFileName()}\n${csIndex}:${callsites()[csIndex].getFunctionName()}`);
            //console.log(`${csIndex+1}: ${callsites()[csIndex+1].getFileName()}\n${csIndex+1}:${callsites()[csIndex+1].getFunctionName()}`);
            break;
        }
    }

    let filename = callsites()[csIndex].getFileName();
    filename = filename.substr(filename.lastIndexOf(`\\`));
    let funcName = callsites()[csIndex].getFunctionName() !== null ? `.${callsites()[csIndex].getFunctionName()}()` : ``;
    console.log(`${filename.substr(1, filename.length - 4)}${funcName}: ${message}`);
};

/*
Formats the log message with level and tag information, if provided, then passes the request to Logger.directLog(message).
 */
module.exports.formatLog = function formatLog(message, level, tag) {
    if (!h.isUndefined(tag)) {
        message = `[${tag}/${level}] ${message}`;
    } else if (!h.isUndefined(level)) {
        message = `[${level}] ${message}`;
    }
    module.exports.directLog(message);
}

/*
Allows for logging by simply passing one object 'props' containing 'message', 'level', and 'tag' information.
Data is passed to Logger.formatLog(message, level, tag).
 */
module.exports.pFormatLog = function pFormatLog(props) {
    module.exports.formatLog(props.message, props.level, props.tag);
}

module.exports.iLog = function iLog(message) {
    module.exports.formatLog(message, `INFO`);
}

// TODO: Does implementing Logger class causes problems with callsites?
module.exports.Logger = class Logger {
    level;
    tag;

    constructor(level, tag) {
        this.setLevel(level);
        this.setTag(tag);
    }

    setLevel(level) {
        this.level = level;
    }

    setTag(tag) {
        this.tag = tag;
    }

    log(message, level = this.level, tag = this.tag) {
        module.exports.formatLog(message, level, tag);
    }

    /*
    Log Override Tag
     */
    logORTag(message, tag) {
        this.log(message, this.level, tag);
    }

    /*
    Log Override Level
     */
    logORLevel(message, level) {
        this.log(message, level, this.tag);
    }
}
