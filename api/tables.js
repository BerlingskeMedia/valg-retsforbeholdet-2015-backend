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

module.exports.queryLocations = queryLocations;

// module.exports.location = function (ident, callback) {
//   switch(ident[0]) {
//     case 'L':
//       getCountry(callback);
//       break;
//     case 'S':
//       getGreater(ident, callback);
//       break;
//     case 'K':
//       getConst(ident, callback);
//       break;
//     case 'D':
//       getPolling(ident, callback);
//       break;
//     default:
//       callback(null, null);
//       break;
//   }
// };

// module.exports.party = function (ident, party_letter, callback) {
//   if (map.all_party_letters.indexOf(party_letter) === -1) {
//     return callback(null, null);
//   }

//   switch(ident[0]) {
//     case 'L':
//       getCountryPartyCandidates(party_letter, callback);
//       break;
//     case 'S':
//       getGreaterPartyCandidates(ident, party_letter, callback);
//       break;
//     case 'K':
//       getConstPartyCandidates(ident, party_letter, callback);
//       break;
//     case 'D':
//       getPollingPartyCandidates(ident, party_letter, callback);
//       break;
//     default:
//       callback(null, null);
//       break;
//   }
// };


function getCountry (callback) {
  queryLocation('0', addSublocations('S', callback));
  // queryLocation('0', function (err, result) {
  //   if (err) {
  //     console.log(err);
  //     return callback(err);
  //   }

  //   result.path = '/landet';


  //   callback(err, result);
  // });

  // "hierarchy": [
  //   {
  //     "ident": "L1",
  //     "name": "Hele landet",
  //     "areatype": "L",
  //     "path": "/landet"
  //   }

  // var sql = [
  //   'SELECT ident, name, areatype, "/landet" AS path,',
  //   'votes_allowed, votes_made, votes_pct, updated_at,',
  //   'status_code, status_text, votes_pct, updated_at',
  //   'FROM locations',
  //   'WHERE ident = "0"'].join(' ');

  // db.queryOne(sql, function (error, country) {
  //   if (error) return callback(error);
  //   if (country === null) return callback(null, null);

  //   if (country.votes_made === 0) {
  //     country.updated_at = "-";
  //   }

  //   queryResults('L1', function (error, result) {
  //     if (error) return callback(error);

  //     result.map(function(r) {
  //       r.path = '/landet/' + r.party_letter;
  //     });

  //     country.results = result;

  //     queryLocations('S', function (error, greater) {
  //       if (error) return callback(error);

  //       country.locations_completed = countCompletedLocation(greater);
  //       country.locations_total = greater.length;
  //       country.locations = greater;

  //       country.hierarchy = getCountryHierachy();

  //       callback(null, country);
  //     });
  //   });    
  // });
}

function addSublocations (areatype, ident, callback) {
  if (typeof ident === 'function' && callback === undefined) {
    callback = ident;
    ident = null;
  }

  return function (err, location) {
    queryLocations(areatype, ident, function (err, locations) {
      if (locations) {
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
    queryLocation(ident, addSublocations('K', ident, callback));
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


  // var sql = [
  //   'SELECT ident, name, area_type AS areatype, votes_allowed, votes_made, votes_pct, votes_counted_pct, updated_at',
  //   'FROM location',
  //   'WHERE area_type = "S"',
  //   ident ? 'AND ident = ' + db.escape(ident) : ''].join(' ');

  // if (ident) {

  //   db.queryOne(sql, function (error, greater) {
  //     if (error) return callback(error);
  //     if (greater === null) return callback(null, null);

  //     if (greater.votes_made === 0) {
  //       greater.updated_at = "-";
  //     }

  //     queryResults(greater.ident, function (error, result) {
  //       if (error) return callback(error);

  //       result.map(function(r) {
  //         r.path = '/storkreds/' + greater.ident + '/' + r.party_letter;
  //       });

  //       greater.results = result;

  //       queryLocations('K', ident, function (error, constituencies) {
  //         if (error) return callback(error);

  //         greater.locations_completed = countCompletedLocation(constituencies);
  //         greater.locations_total = constituencies.length;
  //         greater.locations = constituencies;

  //         getGreaterHierachy(greater.ident, function (error, hierarchy) {
  //           if (error) return callback(error);

  //           greater.hierarchy = hierarchy;
  //           callback(null, greater);
  //         });

  //       });
  //     });
  //   });

  // } else {
  //   db.query(sql, callback);
  // }
}


function getConst (ident, callback) {
  if (ident) {
    queryLocation(ident, addSublocations('D', ident, callback));
  } else {
    queryLocations('K', callback);
  }

  // var sql = [
  //   'SELECT ident, name, area_type AS areatype, votes_allowed, votes_made, votes_pct, votes_counted_pct, updated_at',
  //   'FROM location',
  //   'WHERE area_type = "K"',
  //   ident ? 'AND ident = ' + db.escape(ident) : ''].join(' ');

  // if (ident) {

  //   db.queryOne(sql, function (error, location) {
  //     if (error) return callback(error);
  //     if (constituency === null) return callback(null, null);

  //     if (constituency.votes_made === 0) {
  //       constituency.updated_at = "-";
  //     }

  //     queryResults(constituency.ident, function (error, result) {
  //       if (error) return callback(error);

  //       result.map(function(r) {
  //         r.path = '/kreds/' + constituency.ident + '/' + r.party_letter;
  //       });

  //       constituency.results = result;

  //       queryLocations('D', ident, function (error, polling) {
  //         if (error) return callback(error);

  //         constituency.locations_completed = countCompletedLocation(polling);
  //         constituency.locations_total = polling.length;
  //         constituency.locations = polling;

  //         getConstHierachy(constituency.ident, function (error, hierarchy) {
  //           if (error) return callback(error);

  //           constituency.hierarchy = hierarchy;
  //           callback(null, constituency);
  //         });
  //       });
  //     });
  //   });

  // } else {
  //   db.query(sql, callback);
  // }
}


function getPolling (ident, callback) {
  if (ident) {
    queryLocation(ident, callback);
  } else {
    queryLocations('D', callback);
  }

  // var sql = [
  //   'SELECT ident, name, area_type AS areatype, votes_allowed, votes_made, votes_pct, votes_counted_pct, updated_at',
  //   'FROM location',
  //   'WHERE area_type = "D"',
  //   ident ? 'AND ident = ' + db.escape(ident) : ''].join(' ');

  // if (ident) {

  //   db.queryOne(sql, function (error, polling) {
  //     if (error) return callback(error);
  //     if (polling === null) return callback(null, null);

  //     if (polling.votes_made === 0) {
  //       polling.updated_at = "-";
  //     }

  //     queryResults(polling.ident, function (error, result) {
  //       if (error) return callback(error);

  //       result.map(function(r) {
  //         r.path = '/afstemningssted/' + polling.ident + '/' + r.party_letter;
  //       });

  //       polling.results = result;

  //       getPollingHierachy(polling.ident, function (error, hierarchy) {
  //         if (error) return callback(error);

  //         polling.hierarchy = hierarchy;
  //         callback(null, polling);
  //       });

  //     });
  //   });

  // } else {
  //   db.query(sql, callback);
  // }
}


function getCountryPartyCandidates(party_letter, callback) {
  getCountryHierachy(getResultsAndFixHierarchy('L1', party_letter, callback));
}

function getGreaterPartyCandidates(ident, party_letter, callback) {
  getGreaterHierachy(ident, getResultsAndFixHierarchy(ident, party_letter, callback));
}


function getConstPartyCandidates(ident, party_letter, callback) {
  getConstHierachy(ident, getResultsAndFixHierarchy(ident, party_letter, callback));
}


function getPollingPartyCandidates(ident, party_letter, callback) {
  getPollingHierachy(ident, getResultsAndFixHierarchy(ident, party_letter, callback));
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


// function queryResults (ident, callback) {
//   var sql = [
//     'SELECT LOWER(party_letter) AS party_letter, party_name, votes, votes_pct, votes_deviation,',
//       'mandates, mandates_deviation, mandates_extra, mandates_extra_deviation, result_time',
//     'FROM result',
//     'WHERE ident =',
//     db.escape(ident),
//     'AND party_letter IN (',
//       map.all_party_letters,
//     ')'].join(' ');

//   db.query(sql, callback);
// }


// function queryLocations (area_type, parent_ident, callback) {
//   if (callback === undefined && typeof parent_ident === 'function') {
//     callback = parent_ident;
//     parent_ident = null;
//   }

//   var sql = [
//     'SELECT ident, name, CONCAT("/", LOWER(type), "/", ident) as path, votes_counted_pct, updated_at',
//     'FROM location',
//     'WHERE area_type = ' + db.escape(area_type),
//     parent_ident !== null ? 'AND ' + (area_type === 'D' ? 'const_ident' : 'greater_const_ident') + ' = ' + db.escape(parent_ident) : '',
//     'ORDER BY name'].join(' ');

//   db.query(sql, callback);
// }

function queryLocation (ident, callback) {
  var sql = [
    'SELECT ident, name, type, areatype, parent_ident,',
    'votes_allowed, votes_made, votes_pct,',
    'votes_valid, votes_invalid_blank, votes_invalid_other, votes_invalid_other, votes_invalid_total,',
    'votes_yes, votes_yes_pct,',
    'votes_no, votes_no_pct,',
    'status_code, status_text',
    'FROM locations',
    'WHERE ident = ' + db.escape(ident)].join(' ');

  db.queryOne(sql, function (err, result) {
    if (err) {
      console.log(sql);
      console.log(err);
      return callback(err);
    }

    callback(null, ss(result));
  });

  function ss (location) {
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
  }
}

function queryLocations (areatype, parent_ident, callback) {
  if (typeof parent_ident === 'function' && callback === undefined) {
    callback = parent_ident;
    parent_ident = null;
  }

  var sql = [
    'SELECT ident, name, type, areatype,',
    'parent_ident,',
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

    var locations = result.map(function (location) {
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
    });
  
    callback(null, locations);
  });
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



// function queryCompletedLocations (area_type, greater_const_ident, callback) {
//   if (callback === undefined && typeof greater_const_ident === 'function') {
//     callback = greater_const_ident;
//     greater_const_ident = null;
//   }

//   var sql = [
//     'SELECT SUM(CASE WHEN votes_counted_pct = 100.0 THEN 1 ELSE 0 END) AS completed, COUNT(id) AS total',
//     'FROM location',
//     'WHERE area_type = ' + db.escape(area_type),
//     greater_const_ident !== null ? 'AND greater_const_ident = ' + db.escape(greater_const_ident) : ''].join(' ');

//   db.queryOne(sql, callback);
// }


// function countCompletedLocation(locations) {
//   var completed = 0;
//   locations.forEach(function (location) {
//     if (location.votes_counted_pct === 100.0) {
//       completed++;
//     }
//   });

//   return completed;
// }


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


// function getGreaterCandidates (request, reply) {
// var total_personal_votes_sql = [
//   'SELECT r.ident,',
//   'l.name AS location_name,',
//   'SUM(c.votes) AS total_personal_votes',
//   'FROM candidate AS c',
//   'JOIN result AS r ON c.result_fk = r.id',
//   'JOIN location AS l ON l.ident = r.ident',
//   'WHERE l.area_type = "S"',
//   'GROUP BY l.ident'].join(' ');

//   var sql = [
//     'SELECT',
//       [
//         'candidate.name',
//         'result.ident',
//         'location.name AS location_name',
//         'location.area_type AS areatype',
//         'LOWER(result.party_letter) AS party_letter',
//         'result.party_name',
//         'candidate.votes',
//         'candidate.votes / (greater_result.total_personal_votes / 100 ) AS votes_pct'].join(','),
//     'FROM candidate',
//     'JOIN result ON result.id = candidate.result_fk',
//     'JOIN (',
//       total_personal_votes_sql,
//     ') AS greater_result ON greater_result.ident = result.ident',
//     'JOIN location ON location.ident = result.ident',
//     request.params.party_letter ? 'WHERE result.party_letter = UPPER(' + db.escape(request.params.party_letter) + ')' : '',
//     'ORDER BY candidate.name ASC'].join(' ');

//   db.query(sql, reply);
// }