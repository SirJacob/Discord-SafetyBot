const mysql = require('mysql2');
const p = mysql.createPool({
    connectionLimit: 10,
    host: '',
    user: '',
    password: '',
    database: ''
});
const pool = p.promise();
pool.on('acquire', function (connection) {
    log(`Connection ${connection.threadId} acquired.`);
});
pool.on('enqueue', function () {
    log("Waiting for available connection slot.");
});

function log(message) {
    console.log(`MySQL: ${message}`);
}

let query = async function query(statement, args) {
    if (statement.charAt(statement.length - 1) !== ';') {
        statement += ';';
    }
    log(`Executing query: ${statement} with args: [${args}]`);
    return await pool.execute(statement, args, function (err, results, fields) {
            return [results, fields];
            //return {"results": results, "fields": fields};
        }
    );
};

module.exports = {"query": query};