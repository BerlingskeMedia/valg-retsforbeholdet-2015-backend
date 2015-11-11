/*jshint node: true */
'use strict';

module.exports.register = function (server, options, next) {

  server.route({
    method: 'get',
    path: '/map',
    handler: {
      file: 'fakedata/fake_map_data.json'
    },
    config: {
      cors: true
    }
  });

  server.route({
    method: 'get',
    path: '/teaser',
    handler: {
      file: 'fakedata/fake_teaser_data.json'
    },
    config: {
      cors: true
    }
  });

  server.route({
    method: 'get',
    path: '/landet',
    handler: {
      file: 'fakedata/fake_landet_data.json'
    },
    config: {
      cors: true
    }
  });

  server.route({
    method: 'get',
    path: '/storkreds/10',
    handler: {
      file: 'fakedata/fake_storkreds_10.json'
    },
    config: {
      cors: true
    }
  });

  server.route({
    method: 'get',
    path: '/kreds/20',
    handler: {
      file: 'fakedata/fake_kreds_20.json'
    },
    config: {
      cors: true
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'fakedata',
  version: '1.0.0'
};
