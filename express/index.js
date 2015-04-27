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

module.exports = function(options) {
  var exp = express();
  // view engine setup
  exp.set('views', [root.dir + '/views', root.dir + '/vulpejs/views']);
  exp.set('view engine', 'jade');

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
  if (!options.session) {
    options.session = {
      mongo: {
        host: 'localhost',
        port: 27017,
        db: 'express',
        collection: 'session',
        username: 'admin',
        password: 'q1w2e3r4'
      }
    };
  }
  var mongoUrl = 'mongodb://${auth}${host}/${db}?authSource=admin&w=1';
  if (options.session.mongo.user && options.session.mongo.pass) {
    mongoUrl = mongoUrl.replace('${auth}', options.session.mongo.user + ':' + options.session.mongo.pass + '@');
  } else {
    mongoUrl = mongoUrl.replace('${auth}', '');
  }
  mongoUrl = mongoUrl.replace('${host}', options.session.mongo.host);
  mongoUrl = mongoUrl.replace('${port}', options.session.mongo.port);
  mongoUrl = mongoUrl.replace('${db}', options.session.mongo.db);
  exp.use(session({
    secret: '1234567890QWERTY',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
      url: mongoUrl
    })
  }));
  exp.use(methodOverride());
  exp.use(express.static(path.join(root.dir, 'vulpejs/public')));
  exp.use(express.static(path.join(root.dir, 'public')));

  return {
    app: exp,
    router: express.Router()
  };
};