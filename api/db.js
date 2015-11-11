/*jshint node: true */
'use strict';

var mysql = require('mysql');

var pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? process.env.DB_PORT : null,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME ? process.env.DB_NAME : null,
  dateStrings: true
});

// Testing we can connect to database
console.log('Connecting to ' + process.env.DB_HOST +' as ' + process.env.DB_USER + '...');
console.log('Using database ' + process.env.DB_NAME);
pool.getConnection(function(err, connection) {
  if (err) {
    console.log('Connection to MYSQL failed: ', err);
    if (err.code === 'ECONNREFUSED') {
      console.log('Maybe the ENV config is missing.');
    }
    // process.exit(1);
  } else {
    connection.release();
  }
});

module.exports = pool;

// Helper function to select only one row as an object instead of array.
module.exports.queryOne = function (sql, callback) {
  return pool.query(sql, function (err, result) {
    if (err) {
      console.log(err);
      throw err; 
    }
    else if (result.length === 0)
      callback(null, null);
    else if (result.length > 1)
      callback(new Error('Too many results'));
    else
      callback(null, result[0]);
  });
};
