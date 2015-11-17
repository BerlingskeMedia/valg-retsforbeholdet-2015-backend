/*jshint node: true */
'use strict';

console.log('Running sync');

var events = require('events'),
    one_minute = 1000 * 60,
    db = require('../api/db'),
    dst = require('./dst_client'),
    // valg_id = process.env.VALG_ID ? process.env.VALG_ID : '1475796',
    valg_id = process.env.VALG_ID ? process.env.VALG_ID : '1664255',
    valg = 'http://www.dst.dk/valg/'.concat('Valg', valg_id, '/xml/'),
    status_valgdag = false,
    status_locationstatus = {};


function run () {
  getStatus(function () {
    if (status_valgdag) {
      importValgdag(waitOneMinute(run));
    } else {
      importFintal(waitOneMinute(run));
    }
  });
}

run();


function getStatus (callback) {
  var sql = [
    'SELECT ident, status_code, updated_at',
    'FROM locations'].join(' ');

  db.query(sql, function (error, result) {

    status_valgdag =
      result.length === 0 ||
      result.some(function (element) {
        return element.status_code === 0;
      });

    result.forEach(function (location) {
      status_locationstatus[location.ident] = {
        status_code: location.status_code,
        updated_at: location.updated_at
      }
    });

    callback();
  });
}

function waitOneMinute (callback) {
  return function () {
    console.log('Waiting one minute.');
    setTimeout(callback, one_minute);
    // setTimeout(callback, 5000);
  }
}


function importValgdag (callback) {
  console.log(new Date(), 'Importing valgdag');
  importData('valgdag.xml', callback);
}


function importFintal (callback) {
  console.log(new Date(), 'Importing fintal');
  importData('fintal.xml', callback);
}


function importData (filename, callback) {
  dst.getData(valg.concat(filename), function (error, data) {
    if (error) {
      return console.log(new Date(), error);
    }

    getAndInsert(data.Land, function (error, result) {
      console.log(new Date(), 'Lande imported');
      if (error) { console.log(error);}

      getAndInsert(data.Landsdele, function (error, result) {
        console.log(new Date(), 'Landsdele imported');
        if (error) { console.log(error);}

        getAndInsert(data.Storkredse, function (error, result) {
          console.log(new Date(), 'Storkredse imported');
          if (error) { console.log(error);}

          getAndInsert(data.Opstillingskredse, function (error, result) {
            console.log(new Date(), 'Opstillingskredse imported');
            if (error) { console.log(error);}

            getAndInsert(data.Afstemningsomraader, function (error, result) {
              console.log(new Date(), 'Afstemningsomraader imported');
              if (error) { console.log(error);}
              callback();
            });
          });
        });
      });
    });
  });
}


function getAndInsert (locations, callback) {
  if (locations === null || locations === undefined || locations === '') {
    callback(null);
    return;
  }

  var done = 0;

  if (locations instanceof Array) {
    locations.forEach(function (location) {
      dst.getData(location.filnavn, insertLocation(location, cb));
    });
  } else {
    dst.getData(locations.filnavn, insertLocation(locations, callback));
  }

  function cb (error, result) {
    if (++done === locations.length) {
      callback(null);
    }
  }
}


function insertLocation (location_header, callback) {
  return function (error, orgdata) {
    if (error) {
      console.log(new Date(), error, location_header);
      callback(error);
      return;
    }

    if (orgdata === undefined || orgdata === null) {
      callback();
      return;
    }

    // Vi ignorerer status 10 (Fintællingsresultatet foreligger endnu ikke) for alt andet end 
    if (orgdata.Sted.Type !== 'Afstemningsomraade' && parseInt(orgdata.Status.Kode) === 10) {
      console.log('Skipped fintælling', orgdata.Sted);
      callback(null);
      return;
    }

    // Eg. http://www.dst.dk/valg/Valg1475796/xml/valgdag_999.xml
    if (orgdata.Sted.Type === 'Optalling' && orgdata.Sted.Id === '') {
      console.log('Skipped', orgdata.Sted);
      callback(null);
      return;
    }

    // HeleLandet har ID=0.
    // Men ID mangler når f.eks. kalder http://www.dst.dk/valg/Valg1475796/xml/fintal_0.xml
    // Derfor sætter jeg ID manuelt på denne måde.
    if (orgdata.Sted.Type === 'HeleLandet' && orgdata.Sted.Id === '') {
      orgdata.Sted.Id = '0';
    }

    var convdata = convertData(orgdata);
    setParent(location_header, convdata);
    var sql = buildInsert(convdata);

    db.query(sql, function (error, result) {
      if (error) {
        console.log(sql, orgdata);
        console.log(new Date(), error);
        callback(error);
      } else {
        console.log('Imported', orgdata.Sted);
        callback(null, result);
      }
    });
  };
}


function convertData (data) {

  var row = {
    ident: data.Sted.Id,
    ident_int: parseInt(data.Sted.Id),
    name: cleanName(data.Sted._),
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

  // Eg.:
  // 1. Østerbro
  // 2. Sundbyvester
  // 3. Indre By
  // 11. Slots
  // 12. Slagelse Øst
function cleanName (name) {
  var a = name.indexOf('. ');
  // we're only cleaning names with a '. ' within the first few characters.
  return a > -1 && a < 4 ?
    name.substring(a + 2) :
    name;
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

  return [
    'INSERT INTO locations ('.concat(columns.join(', '), ') VALUES (', values.join(', '), ')'),
    'ON DUPLICATE KEY UPDATE',
    [
      'votes_allowed = ' + db.escape(data.votes_allowed),
      'votes_made = ' + db.escape(data.votes_made),
      'votes_yes = ' + db.escape(data.votes_yes),
      'votes_yes_pct = ' + db.escape(data.votes_yes_pct),
      'votes_no = ' + db.escape(data.votes_no),
      'votes_no_pct = ' + db.escape(data.votes_no_pct),
      'votes_pct = ' + db.escape(data.votes_pct),
      'votes_valid = ' + db.escape(data.votes_valid),
      'votes_invalid_blank = ' + db.escape(data.votes_invalid_blank),
      'votes_invalid_other = ' + db.escape(data.votes_invalid_other),
      'votes_invalid_total = ' + db.escape(data.votes_invalid_total),
      'status_code = ' + db.escape(data.status_code),
      'status_text = ' + db.escape(data.status_text),
      'updated_at = ' + db.escape(data.updated_at)
    ].join(', ')
  ].join(' ');
}
