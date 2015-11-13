/*jshint node: true */
'use strict';

var db = require('./db.js'),
    map = require('./map.js');


module.exports.register = function (plugin, options, next) {

  plugin.route({
    method: 'get',
    path: '/landet',
    handler: function (request, reply) {
      getCountry(cb(reply));
    },
    config: {
      cors: true
    }
  });

  plugin.route({
    method: 'get',
    path: '/storkreds/{ident?}',
    handler: function (request, reply) {
      getGreater(request.params.ident, cb(reply));
    },
    config: {
      cors: true
    }
  });

  plugin.route({
    method: 'get',
    path: '/kreds/{ident?}',
    handler: function (request, reply) {
      getConst(request.params.ident, cb(reply));
    },
    config: {
      cors: true
    }
  });

  plugin.route({
    method: 'get',
    path: '/afstemningssted/{ident?}',
    handler: function (request, reply) {
      getPolling(request.params.ident, cb(reply));
    },
    config: {
      cors: true
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'tables',
  version: '1.0.0'
};


module.exports.queryLocations = queryLocations;


function cb (reply) {
  return function (err, result) {
    if (err) {
      console.log(new Date, err);
      return reply(err);
    }
    else if (result === null) return reply().code(404);
    else return reply(result);
  };
}


function getCountry (callback) {
  queryLocation('L', '0', addSublocations('S', callback));

  // "hierarchy": [
  //   {
  //     "ident": "L1",
  //     "name": "Hele landet",
  //     "areatype": "L",
  //     "path": "/landet"
  //   }
}

function addSublocations (areatype, ident, callback) {
  if (typeof ident === 'function' && callback === undefined) {
    callback = ident;
    ident = null;
  }

  return function (err, location) {
    queryLocations(areatype, ident, function (err, locations) {
      if (location && locations) {
        location.locations_completed = 0;
        locations.forEach(function (loc) {
          if (loc.status_code === 12)
            ++location.locations_completed;
        });
        location.locations_total = locations.length,
        location.locations = locations;
      }
      callback(err, location);
    });
  };
}


function getGreater (ident, callback) {
  if (ident) {
    queryLocation('S', ident, addSublocations('K', ident, callback));
  } else {
    queryLocations('S', callback);
  }

  // TODO: 
  // "hierarchy": [
  //   {
  //     "ident": "L1",
  //     "name": "Hele landet",
  //     "areatype": "L",
  //     "path": "/landet"
  //   },
  //   {
  //     "ident": "S8",
  //     "name": "Østjyllands Storkreds",
  //     "areatype": "S",
  //     "path": "/storkreds/S8"
  //   }
  // ]
}


function getConst (ident, callback) {
  if (ident) {
    queryLocation('K', ident, addSublocations('D', ident, callback));
  } else {
    queryLocations('K', callback);
  }
}


function getPolling (ident, callback) {
  if (ident) {
    queryLocation('D', ident, callback);
  } else {
    queryLocations('D', callback);
  }
}





function getResultsAndFixHierarchy (ident, party_letter, callback) {
  return function (error, hierarchy) {
    if (error) return callback(error);
    if (hierarchy === null) return callback(null, null);

    getLocationPartyCandidates(ident, party_letter, function (error, results) {
      if (error) return callback(error);

      var location = hierarchy[hierarchy.length -1];

      var data = {
        ident: ident,
        name: location.name,
        areatype: location.areatype,
        party_letter: results.length > 0 ? results[0].party_letter : '',
        party_name: results.length > 0 ? results[0].party_name : '',
        result_time: results.length > 0 ? results[0].result_time : '',
        results: results.filter(filterLocationPartyCandidates)
      };

      hierarchy.push({
        party_letter: party_letter,
        name: results.length > 0 ? results[0].party_name : '',
        path: location.path + '/' + party_letter
      });

      data.hierarchy = hierarchy;

      callback(null, data);
    });
  };

  function filterLocationPartyCandidates (candidate) {
    return candidate.name !== null;
  }
}


function getLocationPartyCandidates (ident, party_letter, callback) {
  var sql = [
    'SELECT candidate.name, LOWER(result.party_letter) AS party_letter, result.party_name, candidate.votes, result.result_time',
    'FROM result',
    'LEFT JOIN candidate ON candidate.result_fk = result.id',
    'WHERE result.ident =' + db.escape(ident),
    'AND result.party_letter = UPPER(', db.escape(party_letter), ')',
    'ORDER BY candidate.name ASC'].join(' ');

  db.query(sql, callback);
}



function objectifyLocation (location) {
  if (location === null) {
    return null;
  }

  return {
    ident: location.ident,
    name: location.name,
    type: location.type,
    areatype: location.areatype,
    path: getPath(location.areatype, location.ident),
    // greater_const_ident: location.parent_ident,
    votes_allowed: location.votes_allowed,
    votes_made: location.votes_made,
    votes_pct: location.votes_pct,
    votes_valid: location.votes_valid,
    votes_invalid_blank: location.votes_invalid_blank,
    votes_invalid_other: location.votes_invalid_other,
    votes_invalid_total: location.votes_invalid_total,
    status_code: location.status_code,
    status_text: location.status_text,
    winner: location.votes_yes > location.votes_no ? 'JA' : 'NEJ',
    results: {
      "JA": {
        "name": "JA",
        "votes": location.votes_yes,
        "votes_pct": location.votes_yes_pct
      },
      "NEJ": {
        "name": "NEJ",
        "votes": location.votes_no,
        "votes_pct": location.votes_no_pct
      },
    }
  }

  function getPath (areatype, ident) {
    switch(areatype) {
      case 'L': return '/landet';
      case 'A': return '/landsdel'.concat('/', ident);
      case 'S': return '/storkreds'.concat('/', ident);
      case 'K': return '/kreds'.concat('/', ident);
      case 'D': return '/afstemningssted'.concat('/', ident);
    }
  }
}


function queryLocation (areatype, ident, callback) {
  var sql = [
    'SELECT ident, name, type, areatype, parent_ident,',
    'votes_allowed, votes_made, votes_pct,',
    'votes_valid, votes_invalid_blank, votes_invalid_other, votes_invalid_other, votes_invalid_total,',
    'votes_yes, votes_yes_pct,',
    'votes_no, votes_no_pct,',
    'status_code, status_text',
    'FROM locations',
    'WHERE areatype = ' + db.escape(areatype),
    'AND ident = ' + db.escape(ident)].join(' ');

  db.queryOne(sql, function (err, result) {
    if (err) {
      console.log(sql);
      console.log(err);
      return callback(err);
    }

    callback(null, objectifyLocation(result));
  });

}

function queryLocations (areatype, parent_ident, callback) {
  if (typeof parent_ident === 'function' && callback === undefined) {
    callback = parent_ident;
    parent_ident = null;
  }

  var sql = [
    'SELECT ident, name, type, areatype, parent_ident,',
    'votes_allowed, votes_made, votes_pct,',
    'votes_valid, votes_invalid_blank, votes_invalid_other, votes_invalid_other, votes_invalid_total,',
    'votes_yes, votes_yes_pct,',
    'votes_no, votes_no_pct,',
    'status_code, status_text',
    'FROM locations',
    'WHERE areatype = ' + db.escape(areatype),
    parent_ident !== null ? 'AND parent_ident = ' + db.escape(parent_ident) : '',
    'ORDER BY ident_int'].join(' ');

  db.query(sql, function (err, result) {
    if (err) {
      console.log(sql);
      console.log(err);
      return callback(err);
    }

    callback(null, result.map(objectifyLocation));
  });
}



function getCountryHierachy (callback) {
  var hierarchy = [{ ident: 'L1', name: 'Hele landet', areatype: 'L', path: '/landet' }];

  if (callback !== undefined && typeof callback === 'function')
    callback(null, hierarchy);

  return hierarchy;
}


function getGreaterHierachy (ident, callback) {
  var sql = [
  'SELECT', [
    'country.ident AS country_ident',
    'country.name AS country_name',
    'country.area_type AS country_areatype',
    'greater.ident AS greater_ident',
    'greater.name AS greater_name',
    'greater.area_type AS greater_areatype'].join(','),
  'FROM location AS greater',
  'LEFT JOIN location AS country ON country.ident = "L1"',
  'WHERE greater.ident =',
  db.escape(ident)].join(' ');

  db.queryOne(sql, buildHierarchy(callback));
}


function getConstHierachy (ident, callback) {
  var sql = [
  'SELECT', [
    'country.ident AS country_ident',
    'country.name AS country_name',
    'country.area_type AS country_areatype',
    'greater.ident AS greater_ident',
    'greater.name AS greater_name',
    'greater.area_type AS greater_areatype',
    'const.ident AS const_ident',
    'const.name AS const_name',
    'const.area_type AS const_areatype',].join(','),
  'FROM location AS const',
  'LEFT JOIN location AS country ON country.ident = "L1"',
  'LEFT JOIN location AS greater ON greater.ident = const.greater_const_ident',
  'WHERE const.ident =',
  db.escape(ident)].join(' ');

  db.queryOne(sql, buildHierarchy(callback));
}


function getPollingHierachy (ident, callback) {
  var sql = [
  'SELECT', [
    'country.ident AS country_ident',
    'country.name AS country_name',
    'country.area_type AS country_areatype',
    'greater.ident AS greater_ident',
    'greater.name AS greater_name',
    'greater.area_type AS greater_areatype',
    'const.ident AS const_ident',
    'const.name AS const_name',
    'const.area_type AS const_areatype',
    'polling.ident AS polling_ident',
    'polling.name AS polling_name',
    'polling.area_type AS polling_areatype',].join(','),
  'FROM location AS polling',
  'LEFT JOIN location AS country ON country.ident = "L1"',
  'LEFT JOIN location AS greater ON greater.ident = polling.greater_const_ident',
  'LEFT JOIN location AS const ON const.ident = polling.const_ident',
  'WHERE polling.ident =',
  db.escape(ident)].join(' ');

  db.queryOne(sql, buildHierarchy(callback));
}

function buildHierarchy(callback) {
  return function (error, result) {
    if (error) return callback(error);
    if (result === null) return callback(null, null);
  
    var hierarchy = [];

    if (result.country_ident) {
      hierarchy.push({
        ident: result.country_ident,
        name: result.country_name,
        areatype: result.country_areatype,
        path: '/landet'
      });
    }

    if (result.greater_ident) {
      hierarchy.push({
        ident: result.greater_ident,
        name: result.greater_name,
        areatype: result.greater_areatype,
        path: '/storkreds/' + result.greater_ident
      });
    }

    if (result.const_ident) {
      hierarchy.push({
        ident: result.const_ident,
        name: result.const_name,
        areatype: result.const_areatype,
        path: '/kreds/' + result.const_ident
      });
    }

    if (result.polling_ident) {
      hierarchy.push({
        ident: result.polling_ident,
        name: result.polling_name,
        areatype: result.polling_areatype,
        path: '/afstemningssted/' + result.polling_ident
      });
    }

    callback(null, hierarchy);
  };
}
