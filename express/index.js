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
var http = require('http');
// MONGO STORE
var MongoStore = require('connect-mongo')(session);

module.exports = function(options) {
  var app = express();
  // view engine setup
  app.set('views', [global.appRoot + '/views', global.appRoot + '/vulpejs/views']);
  app.set('view engine', 'jade');

  app.use(favicon(global.appRoot + '/public/images/favicon.ico'));
  app.use(compression());
  if (app.get('env') === 'production') {
    app.use(logger('combined', {
      skip: function(req, res) {
        return res.statusCode < 400;
      }
    }));
  } else {
    app.use(logger('dev'));
  }
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: false
  }));
  app.use(cookieParser());
  app.use(cookieSession({
    secret: '1234567890QWERTY',
    cookie: {
      maxAge: 60 * 60 * 1000
    }
  }));
  if (!options.session) {
    options.session = {
      mongo: {
        db: 'express',
        host: 'localhost',
        port: 27017,
        collection: 'session',
        autoReconnect: true
      }
    };
  }
  app.use(session({
    secret: '1234567890QWERTY',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore(options.session.mongo)
  }));
  app.use(methodOverride());
  app.use(express.static(path.join(global.appRoot, 'vulpejs/public')));
  app.use(express.static(path.join(global.appRoot, 'public')));

  return app;
};