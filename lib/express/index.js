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
 * @return {} Express app and router {app, router, passport}
 */
module.exports = function() {
  var exp = express();
  // view engine setup
  exp.set('views', [root.dir + '/views', root.vulpejs.dir + '/ui/views']);
  exp.set('view engine', 'jade');
  exp.locals.basedir = root.vulpejs.dir + '/ui';

  exp.use(favicon(root.dir + '/public/images/favicon.ico'));
  exp.use(compression());
  if (vulpejs.app.env === 'production') {
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
  if (!vulpejs.app.models.ignore) {
    var database = vulpejs.app.session.mongo;
    if (!vulpejs.app.session) {
      vulpejs.app.session = {
        mongo: {
          development: {
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
        }
      };
      database = vulpejs.app.session.mongo.development;
    } else {
      database = vulpejs.app.session.mongo[vulpejs.app.env];
      if (!database.host) {
        database.host = 'localhost';
      }
      if (!database.port) {
        database.port = 27017;
      }
      if (!database.db) {
        database.db = 'express';
      }
      if (!database.collection) {
        database.collection = 'session';
      }
      if (!database.auth) {
        database.auth = {
          source: 'admin',
          user: 'admin',
          pass: 'vulpejs'
        }
      }
      if (!database.auth.source) {
        database.auth.source = 'admin';
      }
      if (!database.auth.user) {
        database.auth.user = 'admin';
      }
      if (!database.auth.pass) {
        database.auth.pass = 'vulpejs';
      }
    }
    var mongoUrl = 'mongodb://${auth}${host}/${db}?${authSource}w=1';
    mongoUrl = mongoUrl.replace('${auth}', database.auth ? database.auth.user + ':' + database.auth.pass + '@' : '');
    mongoUrl = mongoUrl.replace('${host}', database.host);
    mongoUrl = mongoUrl.replace('${port}', database.port);
    mongoUrl = mongoUrl.replace('${db}', database.db);
    mongoUrl = mongoUrl.replace('${authSource}', database.auth ? 'authSource=' + database.auth.source + '&' : '');
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
    base: express,
    router: express.Router(),
    passport: require('./passport')(exp)
  };
};