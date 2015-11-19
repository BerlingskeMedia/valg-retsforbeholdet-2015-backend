/*jshint node: true */
'use strict';

var db = require('./db.js'),
    map = require('./map.js');


module.exports.register = function (server, options, next) {

  server.auth.strategy('simple', 'basic', { validateFunc: validateUser });

  server.route({
    method: 'GET',
    path: '/',
    handler: getNewsticker,
    config: {
      cors: true
    }
  });

  server.route({
    method: 'POST',
    path: '/',
    handler: insertTweet,
    config: {
      auth: 'simple'
    }
  });

  server.route({
    method: 'DELETE',
    path: '/',
    handler: deleteTweet,
    config: {
      auth: 'simple'
    }
  });

  server.route({
    method: 'DELETE',
    path: '/{id}',
    handler: deleteTweet,
    config: {
      auth: 'simple'
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'newsticker',
  version: '1.0.0'
};


function getNewsticker (request, reply) {

  var sql = [
    'SELECT tweet',
    request.query.c || request.query.c === ''  ? ', id' : '',
    'FROM newsticker',
    'ORDER BY id DESC',
    request.query.limit ? 'LIMIT '.concat(request.query.limit) : ''
  ].join(' ');

  db.query(sql, function (error, result) {
    if (request.query.c || request.query.c === '') {
      reply(result);
    } else {
      reply(result.map(function (t) {
        return t.tweet;
      }));
    }
  });
}


function insertTweet (request, reply) {
  if (request.payload === null || request.payload.tweet === undefined)
    return reply().code(400);

  if (request.payload.tweet instanceof Array) {
    request.payload.tweet.forEach(insert);
    reply();
  } else if (typeof request.payload.tweet === 'string') {
    insert(request.payload.tweet, function (error, result) {
      reply(result);
    });
  } else {
    reply().code(400);
  }

  function insert (tweet, callback) {
    if (callback === undefined) {
      callback = cb;
    }

    db.query('INSERT INTO newsticker (tweet) VALUES (' + db.escape(tweet) + ')', callback);

    function cb (error, result) {
      if (error) {
        console.log(new Date(), 'Error when inserting tweet', error);
      }
    }
  }
}

function deleteTweet (request, reply) {
  if (request.params && request.params.id) {
    del(request.params.id, reply);
  } else if (request.query) {
    if (request.query.id instanceof Array) {
      request.query.id.forEach(del)
      reply();
    } else if (typeof request.query.id === 'string') {
      del(request.query.id, reply);
    } else {
      reply().code(400);
    }
  } else {
    reply().code(400);
  }


  function del (id, callback) {
    if (callback === undefined) {
      callback = cb;
    }

    db.query('DELETE FROM newsticker WHERE id = ' + db.escape(id), callback);

    function cb (error, result) {
      if (error) {
        console.log(new Date(), 'Error when inserting tweet', error);
      }
    }
  }
}

function validateUser (request, username, password, callback) {
  db.queryOne('SELECT id, password FROM newsticker_users WHERE username = ' + db.escape(username), function (error, user) {
    if (error) {
      return callback(error);
    }

    if (!user) {
      return callback(null, false);
    }

    if (user.password === password) {
      callback(null, true, { id: user.id, name: username });
    } else {
      callback(null, false, null);
    }
  });
};