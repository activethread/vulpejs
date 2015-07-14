"use strict";

var path = require('path');
// EXPRESS
var express = require('express');
var bodyParser = require('body-parser');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var errorHandler = require('errorhandler');
var favicon = require('serve-favicon');
var methodOverride = require('method-override');
var logger = require('morgan');
var session = require('express-session');
// MONGO STORE
var MongoStore = require('connect-mongo')(session);
// FILE STORE
var FileStore = require('session-file-store')(session);

/**
 * Express Module
 *
 * @param  {} options
 * @return {} Express app and router {app, router}
 */
module.exports = function(options) {
  var exp = express();
  // view engine setup
  exp.set('views', [root.dir + '/views', root.vulpejs.dir + '/ui/views']);
  exp.set('view engine', 'jade');
  exp.locals.basedir = root.vulpejs.dir + '/ui';

  exp.use(favicon(root.dir + '/public/images/favicon.ico'));
  exp.use(compression());
  if (exp.env === 'production') {
    exp.use(logger('combined', {
      skip: function(req, res) {
        return res.statusCode < 400;
      }
    }));
  } else {
    exp.use(logger('dev'));
  }
  exp.use(bodyParser.json());
  exp.use(bodyParser.urlencoded({
    extended: false
  }));
  exp.use(cookieParser());
  exp.use(cookieSession({
    secret: '1234567890QWERTY',
    cookie: {
      maxAge: 60 * 60 * 1000
    }
  }));
  var sessionStore = new FileStore;
  if (!options.models.ignore) {
    if (!options.session) {
      options.session = {
        mongo: {
          host: 'localhost',
          port: 27017,
          db: 'express',
          collection: 'session',
          auth: {
            source: 'admin',
            user: 'admin',
            pass: 'vulpejs'
          }
        }
      };
    }
    var mongoUrl = 'mongodb://${auth}${host}/${db}?${authSource}w=1';
    var sessionMongo = options.session.mongo;
    if (sessionMongo && sessionMongo[options.env]) {
      sessionMongo = sessionMongo[options.env];
      if (!sessionMongo.port) {
        sessionMongo.port = 27017;
      }
    }
    mongoUrl = mongoUrl.replace('${auth}', sessionMongo.auth ? sessionMongo.auth.user + ':' + sessionMongo.auth.pass + '@' : '');
    mongoUrl = mongoUrl.replace('${host}', sessionMongo.host);
    mongoUrl = mongoUrl.replace('${port}', sessionMongo.port);
    mongoUrl = mongoUrl.replace('${db}', sessionMongo.db);
    mongoUrl = mongoUrl.replace('${authSource}', sessionMongo.auth ? 'authSource=' + sessionMongo.auth.source + '&' : '');
    sessionStore = new MongoStore({
      url: mongoUrl
    });
  }
  exp.use(session({
    secret: '1234567890QWERTY',
    resave: true,
    saveUninitialized: true,
    store: sessionStore
  }));
  exp.use(methodOverride());
  exp.use(express.static(path.join(root.dir, 'public')));
  exp.use(express.static(path.join(root.vulpejs.dir, 'ui/public')));

  return {
    app: exp,
    router: express.Router(),
    passport: require('./passport')(exp)
  };
};