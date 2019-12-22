const MySQL = require("./MySQL.js");
const Config = require("./Config.json");


/*
Structure:
Object Array of Server IDs ==> Object Array of Commands/Function Names ==> Object Array of Property
 */
module.exports = {
    memory: {
        "default": Config.ConfigMemory_default
    },
    "mysqlLoadAll": function mysqlLoadAll() {
        for (let key of memory) {
            mysqlLoad(key);
        }
    },
    "mysqlSaveAll": function mysqlSaveAll() {
        for (let key of memory) {
            mysqlSave(key);
        }
    },
    "mysqlLoad": async function mysqlLoad(id) {
        log(`Attempting to mysqlLoad(${id})`);
        if (!Config.ConfigMemory_mysqlLoad_allow || (!Config.ConfigMemory_mysqlLoadDefault_allow && id === "default")) {
            log(`Attempted to load ${id}'s config into memory, but it was disallowed by the Config file.`);
            return;
        }
        let mysqlResults = await MySQL.query('SELECT `data` FROM `server_configs` WHERE `server_id` = ? LIMIT 1;', [id]);
        if (mysqlResults[0][0] == null) {
            log(`Attempted to load ${id}'s config into memory, but it didn't exist in the database.`);
        } else {
            getMem()[id] = JSON.parse(mysqlResults[0][0]["data"]); //getMem()[id] = jsonToStrMap(mysqlResults[0][0]["data"]);
            log(`Loaded ${id}'s config into memory.`);
        }
    },
    "mysqlSave": async function mysqlSave(id) {
        log(`Attempting to mysqlSave(${id})`);
        if (!Config.ConfigMemory_mysqlSave_allow || (!Config.ConfigMemory_mysqlSaveDefault_allow && id === "default")) {
            log(`Attempted to save ${id}'s config to the database, but it was disallowed by the Config file.`);
            return;
        }
        let data = strMapToJson(getMem()[id]);
        await MySQL.query('INSERT INTO `server_configs` (`server_id`,`data`) VALUES(?,?) ON DUPLICATE KEY UPDATE `data` = ?;', [id, data, data]); //await MySQL.query('UPDATE `server_configs` SET `data` = \'?\' WHERE `server_id` = ?;', [strMapToJson(getMem()[id]), id]);
    },
    "getValue": function getValue(id, cfName, propertyName) {
        if (getMem()[id] == null || getMem()[id][cfName] == null || getMem()[id][cfName][propertyName] == null) {
            let data = convertType(getMem()["default"][cfName][propertyName]);
            log(`getMem()[${id}][${cfName}][${propertyName}] doesn't exist, using default instead: ${data}`);
            return data;
        } else {
            let data = convertType(getMem()[id][cfName][propertyName]);
            log(`getMem()[${id}][${cfName}][${propertyName}] returned the value: ${data}`);
            return data;
        }
    },
    "setValue": function setValue(id, cfName, propertyName, newValue) {
        if (getMem()[id] == null) {
            getMem()[id] = new Map();
        }
        if (getMem()[id][cfName] == null) {
            getMem()[id][cfName] = new Map();
        }
        //TODO: TEST: searchLimit (bigger or equal to dL) cannot be smaller than deleteLimit (smaller or equal to sL)
        if (cfName === 'cmd_delete'
            && ((propertyName === 'searchLimit' && newValue < module.exports.getValue(id, cfName, 'deleteLimit'))
                || (propertyName === 'deleteLimit' && newValue > module.exports.getValue(id, cfName, 'searchLimit')))) {
            log(`setValue rejected a request.`);
            return;
        }
        getMem()[id][cfName][propertyName] = newValue;
        module.exports.mysqlSave(id);
        log(`getMem()[${id}][${cfName}][${propertyName}] has been set to: ${getMem()[id][cfName][propertyName]}`);
    },
    "matchRename": function matchRename(id, rename) { //TODO: Untested
        if (getMem()[id] != null) {
            for (let key of getMem()[id]) {
                console.log(`key=${key}||rename=${rename}`);
                if (getMem()[id][key]['rename'] != null && getMem()[id][key]['rename'] === rename) {
                    return key;
                }
            }
        }
    }
};


class ConfigMemory {

}

function convertType(data){
    if(data === "true" || data === "false" || !isNaN(data)){
        log(`Ran eval(${data}).`);
        return eval(data);
    }
    return data;
}

function getMem() {
    return module.exports.memory;
}

function log(message) {
    console.log(`ConfigMemory: ${message}`);
}

function listAllIDs() {
    let output = "";
    for (let k of memory) {
        output += `, ${k}`;
    }
    log(`Server IDs: [${output.substring(2)}]`)
}

// TODO: Does this just delete memory or should it push the delete to mysql?
function deleteConfig(id) {
    if (id === "default") {
        log(`Attempted to call deleteConfig("default"), request blocked.`)
        return;
    }
    delete memory[id];
}

function strMapToJson(strMap) {
    let cmds = Object.create(null);
    for (let k1 in strMap) {
        cmds[k1] = Object.create(null);
        for (let k2 in strMap[k1]) {
            cmds[k1][k2] = strMap[k1][k2];
        }
    }
    return JSON.stringify(cmds);
}

