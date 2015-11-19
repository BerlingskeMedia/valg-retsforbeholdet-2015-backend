/*jshint node: true */
'use strict';

var Hapi = require('hapi'),
    Basic = require('hapi-auth-basic'),
    inert = require('inert'),
    fakedata = require('./fakedata.js'),
    map = require('./map.js'),
    tables = require('./tables.js'),
    newsticker = require('./newsticker.js');

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

server.register(Basic, cb);
server.register(inert, cb);
server.register(fakedata, { routes: { prefix: '/fake' } }, cb);
server.register(map, cb);
server.register(tables, cb);
server.register(newsticker, { routes: { prefix: '/newsticker' } }, cb);


if (!module.parent) {
  server.start(function() {
    console.log('API started on ' + server.info.uri + '.');
  });
}


function cb (err) {
  if (err) {
    console.log('Error when loading plugin', err);
    server.stop();
  }
}


module.exports = server;
