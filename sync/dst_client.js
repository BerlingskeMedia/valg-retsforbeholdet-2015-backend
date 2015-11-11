/*jshint node: true */
'use strict';

var valg_id = "1475796", // TODO: ENV
    http = require('http'),
    xml2js = require('xml2js');

var parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true
});


module.exports.getData = function (url, callback) {
  http.get(url, function (res) {
    var data = '';

    res.on('data', function (chunk) {
      data += chunk;
    });

    res.on('end', function () {
      parser.parseString(data,
        function (error, result) {
        if (error) {
          console.log('parse error on', url, error);
          callback(error);
        } else {
          callback(null, convertDstData(result));
        }
      });
    });
  }).on('error', function (e) {
    console.log("Got error: " + e.message);
    callback(e, null);
  });
};


function convertDstData (result) {
  var data = result.Data;

  if (result.Data.Landsdele) {
    data.Landsdele = flatten(result.Data.Landsdele.Landsdel);
  }

  if (result.Data.Storkredse) {
    data.Storkredse = flatten(result.Data.Storkredse.Storkreds);
  }

  if (result.Data.Opstillingskredse) {
    data.Opstillingskredse = flatten(result.Data.Opstillingskredse.Opstillingskreds);
  }

  if (result.Data.Afstemningsomraader) {
    data.Afstemningsomraader = flatten(result.Data.Afstemningsomraader.Afstemningsomraade);
  }

  return data;
}


function flatten (array) {
  if (array === undefined) {
    return null;
  }

  return array.map(function (elem) {
    return elem;
  });
}