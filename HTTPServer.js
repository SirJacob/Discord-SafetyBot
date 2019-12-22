var http = require('http');
var fs = require('fs');

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    if (req.method === 'POST') {
        console.log("POST");
        let body = '';
        req.on('data', function (data) {
            body += data;
            console.log("Partial body: " + body);
        });
        req.on('end', function () {
            console.log("Body: " + body);
        });
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('ACK_OK');
    } else {
        res.end("ACK_BAD");
    }
    //res.end(cleanStringify(req) + '\n\n\n\n\n\n' + cleanStringify(res));
}).listen(9615);

function cleanStringify(object) {
    if (object && typeof object === 'object') {
        object = copyWithoutCircularReferences([object], object);
    }
    return JSON.stringify(object);
}

function copyWithoutCircularReferences(references, object) {
    var cleanObject = {};
    Object.keys(object).forEach(function (key) {
        var value = object[key];
        if (value && typeof value === 'object') {
            if (references.indexOf(value) < 0) {
                references.push(value);
                cleanObject[key] = copyWithoutCircularReferences(references, value);
                references.pop();
            } else {
                cleanObject[key] = '###_Circular_###';
            }
        } else if (typeof value !== 'function') {
            cleanObject[key] = value;
        }
    });
    return cleanObject;
}