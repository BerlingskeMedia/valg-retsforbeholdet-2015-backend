/*jshint node: true */
'use strict';

var db = require('./db.js'),
    eventEmitter = require('events').EventEmitter;

var red_block_party_letters = 'ABFØÅ'.split(''),
    blue_block_party_letters = 'CIKOV'.split(''),
    all_party_letters = red_block_party_letters.concat(blue_block_party_letters).map(escapePartyLetter).join(',');

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

module.exports.all_party_letters = all_party_letters  ;

module.exports.votes_counted_pct = getCountryCompletion;
module.exports.blocks = getCountryBlocks;
module.exports.parties = getCountryParties;
module.exports.constituency = getConstituencies;
module.exports.latest_votes_counted_complete = getLatestCompletedConstituencies;

function getCountryBlocks (callback) {
  getBlocks('L1', callback);
}

function getBlocks (ident, callback) {
  var data = {};

  getBlockData(ident, blue_block_party_letters, function (err, result) {
    if (err) return callback(err);

    data.blue_block = result;

    getBlockData(ident, red_block_party_letters, function (err, result) {
      if (err) return callback(err);

      data.red_block = result;

      // var total = data.red_block.votes + data.blue_block.votes;
      // data.red_block.votes_pct = Number.parseFloat(((data.red_block.votes / (total / 100)).toFixed(1)));
      // data.blue_block.votes_pct = Number.parseFloat((data.blue_block.votes / (total / 100)).toFixed(1));

      callback(null, data);
    });
  });
}


function getBlockData (ident, party_letters, callback) {
  var sql = [
    'SELECT SUM(votes) AS votes, SUM(votes_pct) AS votes_pct, SUM(mandates) AS mandates',
    'FROM result',
    'WHERE ident = ', db.escape(ident),
    'AND party_letter IN (',
      party_letters.map(escapePartyLetter).join(','),
    ')'].join(' ');

  db.queryOne(sql, function (err, result) {
    if (result !== null) {
      result.votes = result.votes !== null ? result.votes : 0;
      result.votes_pct = result.votes_pct !== null ? result.votes_pct : 0;
      result.mandates = result.mandates !== null ? result.mandates : 0;
      result.party_letters = party_letters.join('').toLowerCase();
    }

    callback(err, result);
  });
}


function getCountryCompletion (callback) {
  var sql = [
    'SELECT votes_counted_pct',
    'FROM location',
    'WHERE ident = "L1"'].join(' ');

  return db.queryOne(sql, callback);
}


function escapePartyLetter (letter) {
  return db.escape(letter);
}


function getConstituencies (ident, callback) {
  if (typeof ident === 'function' && callback === undefined) {
    callback = ident;
    ident = null;
  }

  var sql = [
    'SELECT ident, name, type, area_type AS areatype, CONCAT("/kreds/", ident) as path, votes_allowed, votes_made, votes_pct, votes_counted_pct, greater_const_ident',
    'FROM location',
    'WHERE area_type = "K"',
    ident !== null ? 'AND ident = ' + db.escape(ident) : ''].join(' ');

  return db.query(sql, function (err, constituencies) {
    if (err) return callback(err);

    var count = constituencies.length,
        completed = 0;

    constituencies.forEach(function (constituency, index) {

      getConstituencyParties(constituency, function (err, parties) {
        if (err) return callback(err);

        if (++completed === count) {
          if (ident !== null && constituencies.length === 1) {
            callback(null, constituencies[0]);
          } else {
            callback(null, constituencies);
          }
        }
      });
    });
  });
}


function getConstituencyParties (constituency, callback) {
  getLocationParties(constituency.ident, function (err, parties) {
    if (err) return callback(err);

    var total_votes = 0;
    constituency.red_block_votes = 0;
    constituency.red_block_votes_pct = 0.0;
    constituency.blue_block_votes = 0;
    constituency.blue_block_votes_pct = 0.0;

    // This is not the optimal way of calculating the blocks
    parties.forEach(function (party) {

      party.path = '/kreds/' + constituency.ident + '/' + party.party_letter;

      total_votes = total_votes + party.votes;
      if (red_block_party_letters.indexOf(party.party_letter.toUpperCase()) > -1) {
        constituency.red_block_votes = constituency.red_block_votes + party.votes;
        constituency.red_block_votes_pct = constituency.red_block_votes_pct + parseFloat(party.votes_pct); // XXX
      } else {
        constituency.blue_block_votes = constituency.blue_block_votes + party.votes;
        constituency.blue_block_votes_pct = constituency.blue_block_votes_pct + parseFloat(party.votes_pct); // XXX
      }
    });

    // constituency.red_block_votes_pct = Number.parseFloat(((constituency.red_block_votes / (total_votes / 100)).toFixed(1)));
    // constituency.blue_block_votes_pct = Number.parseFloat((constituency.blue_block_votes / (total_votes / 100)).toFixed(1));

    constituency.block_winner =
      constituency.blue_block_votes > constituency.red_block_votes ? 'blue' :
      constituency.blue_block_votes < constituency.red_block_votes ? 'red' : null;

    // parties.forEach(function (party) {
    //   party.votes_pct = Number.parseFloat((party.votes / (total_votes / 100)).toFixed(1));
    // });

    constituency.parties = parties;

    callback(null, constituency);
  });
}


function getCountryParties (callback) {
  return getLocationParties('L1', function (err, result) {
    if (err) return callback(err);

    result.map(function (r) {
      r.path = '/landet/' + r.party_letter;
    });

    callback(null, result);
  });
}


function getLocationParties (ident, callback) {
  var sql = [
    'SELECT LOWER(party_letter) AS party_letter, party_name, votes, votes_pct, mandates, result_time',
    'FROM result',
    'WHERE ident = ' + db.escape(ident),
    'AND party_letter IN (',
      all_party_letters,
    ')',
    'ORDER BY party_letter'].join(' ');

  return db.query(sql, callback);
}


function getLatestCompletedConstituencies (ident, callback) {
  if (typeof ident === 'function' && callback === undefined) {
    callback = ident;
    ident = null;
  }

  var sql = [
    'SELECT ident, name, CONCAT("/kreds/", ident) as path, updated_at',
    'FROM location',
    'WHERE area_type = "K"',
    ident !== null ? 'AND ident = ' + db.escape(ident) : '',
    'AND votes_counted_pct = 100.0',
    'ORDER BY updated_at DESC',
    'LIMIT 10'].join(' ');

  return db.query(sql, function (err, constituencies) {
    if (err) return callback(err);
    if (constituencies.length === 0) {
      return callback(null, null);
    }

    var count = constituencies.length,
        completed = 0;

    constituencies.forEach(function (constituency) {

      getBlocks(constituency.ident, function (err, result) {
        if (err) return callback(err);

        constituency.red_block_votes = result.red_block.votes;
        constituency.red_block_votes_pct = result.red_block.votes_pct;
        constituency.blue_block_votes = result.blue_block.votes;
        constituency.blue_block_votes_pct = result.blue_block.votes_pct;
        constituency.block_winner =
          constituency.blue_block_votes > constituency.red_block_votes ? 'blue' :
          constituency.blue_block_votes < constituency.red_block_votes ? 'red' : null;

        if (++completed === count) {
          if (ident !== null && constituencies.length === 1) {
            callback(null, constituencies[0]);
          } else {
            callback(null, constituencies);
          }
        }
      });
    });
  });
}


function getMapData (request, reply) {

  var data = {};
  // var ee = new eventEmitter();

  // ee.on('newListener', function () {
  //   console.log('newListener')
  // });

  // ee.on('removeListener', function () {
  //   console.log('removeListener')
  // });

  getCountryCompletion(function (err, result) {
    if (err) return reply().code(500);
    if (result === null) return reply();

    data.votes_counted_pct = result.votes_counted_pct;

    getCountryBlocks( function (err, blocks) {
      if (err) return reply().code(500);

      data.blue_block = blocks.blue_block;
      data.red_block = blocks.red_block;

      getCountryParties(function (err, result) {
        if (err) return reply().code(500);

        data.parties = result;

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
    });
  });
}


function getTeaserData (request, reply) {
  var data = {};

  getCountryBlocks( function (err, blocks) {
    if (err) return reply().code(500);

    data.blue_block = blocks.blue_block;
    data.red_block = blocks.red_block;

    getCountryParties(function (err, result) {
      data.parties = result;

      reply(data);
    });
  });
}


function findByIdent(list, ident) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].ident === ident) {
      return list[i];
    }
  }

  return null;
}