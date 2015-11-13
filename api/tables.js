/*jshint node: true */
'use strict';

var db = require('./db.js'),
    map = require('./map.js');


module.exports.register = function (server, options, next) {

  server.route({
    method: 'get',
    path: '/landet',
    handler: function (request, reply) {
      getCountry(cb(reply));
    },
    config: {
      cors: true
    }
  });

  server.route({
    method: 'get',
    path: '/storkreds/{ident?}',
    handler: function (request, reply) {
      getGreater(request.params.ident, cb(reply));
    },
    config: {
      cors: true
    }
  });

  server.route({
    method: 'get',
    path: '/kreds/{ident?}',
    handler: function (request, reply) {
      getConst(request.params.ident, cb(reply));
    },
    config: {
      cors: true
    }
  });

  server.route({
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
  var areatype = 'L',
      ident = '0';

  getLocation(areatype, ident,
    addSublocations('S', 
      addHierachy(callback)));
}


function getGreater (ident, callback) {
  var areatype = 'S';

  if (ident) {
    getLocation(areatype, ident,
      addSublocations('K', ident,
        addHierachy(callback)));
  } else {
    queryLocations(areatype, callback);
  }
}


function getConst (ident, callback) {
  var areatype = 'K';

  if (ident) {
    getLocation(areatype, ident,
      addSublocations('D', ident,
        addHierachy(callback)));
  } else {
    queryLocations(areatype, callback);
  }
}


function getPolling (ident, callback) {
  var areatype = 'D';

  if (ident) {
    getLocation(areatype, ident,
      addHierachy(callback));
  } else {
    queryLocations(areatype, callback);
  }
}





// function getResultsAndFixHierarchy (ident, party_letter, callback) {
//   return function (error, hierarchy) {
//     if (error) return callback(error);
//     if (hierarchy === null) return callback(null, null);

//     getLocationPartyCandidates(ident, party_letter, function (error, results) {
//       if (error) return callback(error);

//       var location = hierarchy[hierarchy.length -1];

//       var data = {
//         ident: ident,
//         name: location.name,
//         areatype: location.areatype,
//         party_letter: results.length > 0 ? results[0].party_letter : '',
//         party_name: results.length > 0 ? results[0].party_name : '',
//         result_time: results.length > 0 ? results[0].result_time : '',
//         results: results.filter(filterLocationPartyCandidates)
//       };

//       hierarchy.push({
//         party_letter: party_letter,
//         name: results.length > 0 ? results[0].party_name : '',
//         path: location.path + '/' + party_letter
//       });

//       data.hierarchy = hierarchy;

//       callback(null, data);
//     });
//   };

//   function filterLocationPartyCandidates (candidate) {
//     return candidate.name !== null;
//   }
// }


// function getLocationPartyCandidates (ident, party_letter, callback) {
//   var sql = [
//     'SELECT candidate.name, LOWER(result.party_letter) AS party_letter, result.party_name, candidate.votes, result.result_time',
//     'FROM result',
//     'LEFT JOIN candidate ON candidate.result_fk = result.id',
//     'WHERE result.ident =' + db.escape(ident),
//     'AND result.party_letter = UPPER(', db.escape(party_letter), ')',
//     'ORDER BY candidate.name ASC'].join(' ');

//   db.query(sql, callback);
// }



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
    parent_ident: location.parent_ident,
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


function getPath (areatype, ident) {
  switch(areatype) {
    case 'L': return '/landet';
    case 'A': return '/landsdel'.concat('/', ident);
    case 'S': return '/storkreds'.concat('/', ident);
    case 'K': return '/kreds'.concat('/', ident);
    case 'D': return '/afstemningssted'.concat('/', ident);
  }
}


function getLocation (areatype, ident, callback) {
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


function addHierachy (callback) {
  return function (err, location) {
    if (err) {
      return callback(err);
    }

    location.hierarchy = [{
      "ident": "0",
      "name": "Hele landet",
      "areatype": "L",
      "path": "/landet"
    }];

    if (location.areatype === 'L') {
      callback(err, location);
    } else if (location.areatype === 'S') {
      addSelf(location);
      callback(err, location);
    } else if (location.areatype === 'K') {

      var sql = [
      'SELECT', [
        'greater.ident AS greater_ident',
        'greater.name AS greater_name',
        'greater.areatype AS greater_areatype'].join(','),
      'FROM locations AS greater',
      'WHERE greater.areatype = "S"',
      'AND greater.ident = ' + db.escape(location.parent_ident)].join(' ');

      db.queryOne(sql, function (err, result) {
        if (result) {
          location.hierarchy.push(addGreater(result));
          addSelf(location);
        }

        callback(err, location);
      });

    } else if (location.areatype === 'D') {

      var sql = [
      'SELECT', [
        'greater.ident AS greater_ident',
        'greater.name AS greater_name',
        'greater.areatype AS greater_areatype',
        'const.ident AS const_ident',
        'const.name AS const_name',
        'const.areatype AS const_areatype'].join(','),
      'FROM locations AS const',
      'LEFT JOIN locations AS greater ON greater.areatype = "S" AND greater.ident = const.parent_ident',
      'WHERE const.areatype = "K"',
      'AND const.ident = ' + db.escape(location.parent_ident)].join(' ');
    
      db.queryOne(sql, function (err, result) {
        if (result) {
          location.hierarchy.push(addGreater(result));
          location.hierarchy.push(addConst(result));
          addSelf(location);
        }

        callback(err, location);
      });
    }
  };

  function addGreater (location) {
    return {
      ident: location.greater_ident,
      name: location.greater_name,
      areatype: location.greater_areatype,
      path: getPath(location.greater_areatype, location.greater_ident)
    };
  }

  function addConst (location) {
    return {
      ident: location.const_ident,
      name: location.const_name,
      areatype: location.const_areatype,
      path: getPath(location.const_areatype, location.const_ident)
    };
  }

  function addSelf (location) {
    location.hierarchy.push({
      ident: location.ident,
      name: location.name,
      areatype: location.areatype,
      path: location.path
    });
  }
}
