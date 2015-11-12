/*jshint node: true */
'use strict';

var Hapi = require('hapi'),
    inert = require('inert'),
    fakedata = require('./fakedata.js'),
    map = require('./map.js'),
    tables = require('./tables.js');

var server = new Hapi.Server({
  connections: {
    router: {
      stripTrailingSlash: false
    }
  }
});

server.connection({ port: process.env.PORT ? process.env.PORT : 8000 });

server.route({
  method: 'GET',
  path: '/healthcheck',
  handler: function (request, reply) {
    return reply('OK');
  }
});

server.register(inert, cb);
server.register(fakedata, { routes: { prefix: '/fake' } }, cb);
server.register(map, cb);
server.register(tables, cb);


if (!module.parent) {
  server.start(function() {
    console.log('Server started on ' + server.info.uri + '.');
  });
}


function cb (err) {
  if (err) {
    console.log('Error when loading plugin', err);
    server.stop();
  }
}


module.exports = server;
