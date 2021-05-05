// TODO: Object config memory
const h = require("../helper.js");
const Config = require('../config.json');
const http = require('http');
const sj = require("./SafeJoin.js");
const l = require("../Logger.js");

const httpPort = Config.SafeJoin_WebservPort;
let webpage_verified;
let server;

/* Setup/shutdown */

module.exports.initialize = async function () {
    if (webpage_verified === undefined) {
        webpage_verified = await h.readFile(`./resources/webpage_verified.html`);
    }

    server = http.createServer(function (req, res) {
        let urlPrefix = `/MU/SafeJoin?verify=`;
        if (req.url.startsWith(urlPrefix) && req.url.length > urlPrefix.length) {
            let verifyKey = req.url.substring(urlPrefix.length);
            if (sj.verifyCache[verifyKey] !== undefined) {
                sj.addVerifiedByKey(verifyKey);
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(webpage_verified);
            } else {
                // TODO: Error page: invalid/expired verification key, please re-request.
                res.writeHead(404);
            }
        } else {
            // TODO: Error page: 404 not found
            res.writeHead(404);
        }
        res.end();
        l.pFormatLog({
            message: `${res.statusCode} ${req.url} ${req.connection.remoteAddress} ${req.headers['x-forwarded-for'] === undefined ? `` : `x-forwarded-for: ${req.headers['x-forwarded-for']}`}`,
            level: `VERBOSE`,
            tag: `WEB`
        });
    });

    server.listen(httpPort);
    l.iLog(`Node.js web server at port ${httpPort} is running..`);
};

module.exports.terminate = function () {
    server.stop();
};
