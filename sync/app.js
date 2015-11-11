/*jshint node: true */
'use strict';

var db = require('../api/db'),
    dst = require('./dst_client'),
    valg = 'http://www.dst.dk/valg/Valg1475796/xml/'; // TODO ENV

// dst.getData(valg.concat('valgdag.xml'), function (error, result) {
dst.getData(valg.concat('fintal.xml'), function (error, result) {
  if (error) {
    return console.log(error);
  }

  getAndInsert(result.Land, function (error, result) {
    console.log('Lande imported', error, result);
  });

  getAndInsert(result.Landsdele, function (error, result) {
    console.log('Landsdele imported', error, result);
  });

  getAndInsert(result.Storkredse, function (error, result) {
    console.log('Storkredse imported', error, result);
  });

  getAndInsert(result.Opstillingskredse, function (error, result) {
    console.log('Opstillingskredse imported', error, result);
  });

  getAndInsert(result.Afstemningsomraader, function (error, result) {
    console.log('Afstemningsomraader imported', error, result);
  });
});


function getAndInsert (locations, callback) {
  if (locations === null || locations === undefined) {
    callback(null);
    return;
  }

  var done = 0;

  if (locations instanceof Array) {
    locations.forEach(function (location) {
      dst.getData(location.filnavn, dbInsert(location, cb));
    });
  } else {
    dst.getData(locations.filnavn, dbInsert(locations, callback));
  }

  function cb (error, result) {
    if (++done === locations.length) {
      callback(null);
    }
  }
}

function dbInsert (location, callback) {
  return function (error, orgdata) {
    if (error) {
      console.log(new Date(), error);
      callback(error);
      return;
    }

    // Eg. http://www.dst.dk/valg/Valg1475796/xml/valgdag_999.xml
    if (orgdata.Sted.Type === 'Optalling' && orgdata.Sted.Id === '') {
      console.log('Skipped', orgdata.Sted);
      callback(null);
      return;
    }

    var convdata = convertData(orgdata);
    setParent(location, convdata);
    var sql = buildInsert(convdata);

    db.query(sql, function (error, result) {
      if (error) {
        console.log(sql);
        console.log(new Date(), error);
        callback(error);
      } else {
        console.log('Inserted', orgdata.Sted);
        callback(null, result);
      }
    });
  };
}


function convertData (data) {

  var row = {
    ident: data.Sted.Id,
    name: data.Sted._,
    type: data.Sted.Type,
    areatype: parseStedType(data.Sted.Type),
    votes_allowed: parseInt(data.Stemmeberettigede),
    votes_made: parseInt(data.Stemmer.IAltAfgivneStemmer),
    votes_pct: parseFloat(data.DeltagelsePct),
    votes_valid: parseInt(data.Stemmer.IAltGyldigeStemmer),
    votes_invalid_blank: parseInt(data.Stemmer.BlankeStemmer),
    votes_invalid_other: parseInt(data.Stemmer.AndreUgyldigeStemmer),
    votes_invalid_total: parseInt(data.Stemmer.IAltUgyldigeStemmer),
    status_code: parseInt(data.Status.Kode),
    status_text: data.Status._,
    updated_at: parseDate(data.SenestRettet),
    created_at: parseDate(data.SenestDannet)
  };

  if (data.Stemmer.Parti) {
    data.Stemmer.Parti.forEach(function (parti) {
      if (parti.Bogstav === 'JA') {
        row.votes_yes = parseInt(parti.StemmerAntal);
        row.votes_yes_pct = parseFloat(parti.StemmerPct);
      } else if (parti.Bogstav === 'NEJ') {
        row.votes_no = parseInt(parti.StemmerAntal);
        row.votes_no_pct = parseFloat(parti.StemmerPct);
      }
    });
  }

  return row;
}


function parseStedType (stedType) {
  return stedType === 'HeleLandet' ? 'L' :
    stedType === 'Landsdel' ? 'A' :
    stedType === 'StorKreds' ? 'S' :
    stedType === 'Opstillingskreds' ? 'K' :
    stedType === 'OpstKreds' ? 'K' :
    stedType === 'Afstemningsomraade' ? 'D' :
    '';
}


function setParent (location, data) {
  data.parent_ident =
    data.areatype === 'L' ? '' :
    data.areatype === 'A' ? location.land_id :
    data.areatype === 'S' ? location.landsdel_id :
    data.areatype === 'K' ? location.storkreds_id :
    data.areatype === 'D' ? location.opstillingskreds_id :
    '';
}


// From '26-05-2014 09:54:01' to '2014-05-26 09:54:01'
function parseDate (date) {

  // Split into [ '26', '05', '2014', '09:54:01' ]
  var values = date.split(/[ -]/);

  if (values.length !== 4) {
    console.log('Invalid datatring', date);
    return null;
  }
  
  return new Date(values[2].concat('-', values[1], '-', values[0], ' ', values[3]));
}

function buildInsert (data) {
  var columns = [],
    values = [];

  Object.keys(data).forEach(function (key) {
    columns.push(key);
    values.push(db.escape(data[key]));
  });

  return 'INSERT INTO locations ('.concat(columns.join(', '), ') VALUES (', values.join(', '), ')');
}
