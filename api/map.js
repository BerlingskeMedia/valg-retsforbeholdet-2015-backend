/*jshint node: true */
'use strict';

var db = require('./db.js'),
    tables = require('./tables.js'),
    eventEmitter = require('events').EventEmitter;

module.exports.register = function (server, options, next) {

  server.route({
    method: 'get',
    path: '/map',
    handler: getMapData,
    config: {
      cors: true
    }
  });

  server.route({
    method: 'get',
    path: '/teaser',
    handler: getTeaserData,
    config: {
      cors: true
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'map',
  version: '1.0.0'
};


function getLatestCompletedConstituencies (ident, callback) {
  if (typeof ident === 'function' && callback === undefined) {
    callback = ident;
    ident = null;
  }

  var sql = [
    'SELECT ident, name, CONCAT("/kreds/", ident) as path, updated_at,',
    'votes_yes, votes_no',
    'FROM locations',
    'WHERE areatype = "K"',
    ident !== null ? 'AND ident = ' + db.escape(ident) : '',
    'AND status_code = 12',
    'ORDER BY updated_at DESC',
    'LIMIT 10'].join(' ');

  return db.query(sql, function (err, result) {
    if (err) {
      console.log(new Date, err);
      return callback(err);
    }
    if (result.length === 0) {
      return callback(null, null);
    }

    var constituencies = result.map(function (constituency) {

      constituency.winner = constituency.votes_yes > constituency.votes_no ? 'JA' : 'NEJ'
      constituency.result = {
        "JA": {
          "name": "JA",
          "votes": constituency.votes_yes,
          "votes_pct": constituency.votes_yes_pct
        },
        "NEJ": {
          "name": "NEJ",
          "votes": constituency.votes_no,
          "votes_pct": constituency.votes_no_pct
        },
      };
      delete constituency.votes_yes;
      delete constituency.votes_no;
      return constituency;
    });

    callback(null, constituencies);
  });
}


function getCountry (callback) {
  tables.getLocation('L', '0', function (error, heleLandet) {
    if (error) {
      return callback(error);
    }

    if (heleLandet.status_code === 0) {
      // If HeleLandet is
      // We're getting the Optalling and disguise it as HeleLandet. 
      tables.getLocation('O', '999', function (error, optalling) {

        optalling.ident = "0";
        optalling.areatype = "L";
        optalling.name = "Hele landet";
        optalling.path = "/landet";

        callback(null, optalling);
      });
    } else {
      callback(null, heleLandet);
    }
  });
}


function getMapData (request, reply) {

  // var ee = new eventEmitter();

  // ee.on('newListener', function () {
  //   console.log('newListener')
  // });

  // ee.on('removeListener', function () {
  //   console.log('removeListener')
  // });

  getCountry(function (err, data) {
    if (err) return reply().code(500);
    if (data === null) return reply();

    tables.queryLocations('K', function (err, result) {
      if (err) return reply().code(500);

      data.constituencies = result;

      tables.queryLocations('S', function (err, result) {

        data.locations = result;

        getLatestCompletedConstituencies(function (err, result) {
          if (err) return reply().code(500);

          data.latest_votes_counted_complete = result !== null ? result : [];

          reply(data);
        });
      }); 
    });
  });
}


function getTeaserData (request, reply) {
  getCountry(function (err, data) {
    if (err) return reply().code(500);

    reply(data);
  });
}
