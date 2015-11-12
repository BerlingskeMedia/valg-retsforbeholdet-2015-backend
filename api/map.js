/*jshint node: true */
'use strict';

var db = require('./db.js'),
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


module.exports.votes_counted_pct = getCountryCompletion;
module.exports.constituency = getConstituencies;
module.exports.latest_votes_counted_complete = getLatestCompletedConstituencies;


function getCountryCompletion (callback) {
  var sql = [
    'SELECT status_code, status_text, votes_yes, votes_yes_pct, votes_no, votes_no_pct, updated_at',
    'FROM locations',
    'WHERE ident = "0"'].join(' ');

  return db.queryOne(sql, function (err, result) {
    if (err) {
      console.log(err);
      return callback(err);
    }

    var data = {
      result_time: result.updated_at,
      results: {
        "JA": {
          "name": "JA",
          "votes": result.votes_yes,
          "votes_pct": result.votes_yes_pct
        },
        "NEJ": {
          "name": "NEJ",
          "votes": result.votes_no,
          "votes_pct": result.votes_no_pct
        }
      }
    };

    callback(null, data);
  });
}


function getConstituencies (ident, callback) {
  if (typeof ident === 'function' && callback === undefined) {
    callback = ident;
    ident = null;
  }

  var sql = [
    'SELECT ident, name, type, areatype, CONCAT("/kreds/", ident) AS path, parent_ident,',
    'votes_allowed, votes_made, votes_pct,',
    'votes_valid, votes_invalid_blank, votes_invalid_other, votes_invalid_other, votes_invalid_total,',
    'votes_yes, votes_yes_pct,',
    'votes_no, votes_no_pct,',
    'status_code, status_text',
    'FROM locations',
    'WHERE areatype = "K"',
    ident !== null ? 'AND ident = ' + db.escape(ident) : ''].join(' ');

  return db.query(sql, function (err, result) {
    if (err) {
      console.log(err);
      return callback(err);
    }

    var constituencies = result.map(function (constituency) {
      return {
        ident: constituency.ident,
        name: constituency.name,
        type: constituency.type,
        areatype: constituency.areatype,
        path: constituency.path,
        greater_const_ident: constituency.parent_ident,
        votes_allowed: constituency.votes_allowed,
        votes_made: constituency.votes_made,
        votes_pct: constituency.votes_pct,
        votes_valid: constituency.votes_valid,
        votes_invalid_blank: constituency.votes_invalid_blank,
        votes_invalid_other: constituency.votes_invalid_other,
        votes_invalid_total: constituency.votes_invalid_total,
        status_code: constituency.status_code,
        status_text: constituency.status_text,
        winner: constituency.votes_yes > constituency.votes_no ? 'JA' : 'NEJ',
        results: {
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
        }
      }
    });

    callback(null, constituencies);
  });
}


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
      console.log(err);
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


function getMapData (request, reply) {

  // var ee = new eventEmitter();

  // ee.on('newListener', function () {
  //   console.log('newListener')
  // });

  // ee.on('removeListener', function () {
  //   console.log('removeListener')
  // });

  getCountryCompletion(function (err, data) {
    if (err) return reply().code(500);
    if (data === null) return reply();

    getConstituencies(function (err, result) {
      if (err) return reply().code(500);

      data.constituencies = result;

      getLatestCompletedConstituencies(function (err, result) {
        if (err) return reply().code(500);

        data.latest_votes_counted_complete = result !== null ? result : [];

        reply(data);
      }); 
    });
  });
}


function getTeaserData (request, reply) {
  getCountryCompletion( function (err, data) {
    if (err) return reply().code(500);

    reply(data);
  });
}
