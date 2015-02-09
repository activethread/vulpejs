module.exports = function(options) {
  if (!options) {
    options = {};
  }
  var path = require('path');
  global.appRoot = path.resolve(__dirname + '/../');
  global.rootContext = '';
  if (options.rootContext) {
    global.rootContext = options.rootContext;
  }
  if (options.login) {
    global.login = options.login;
  }
  // ASYNC
  var async = require('async');
  // CRYPTO
  var crypto = require('crypto');
  var crypt = function(value) {
    return crypto.createHash('sha256').update(value).digest('base64');
  };
  var shasum = function(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  };
  var md5 = function(value) {
    return crypto.createHash('md5').update(value).digest('hex');
  };
  // APP MODELS
  require('./models').start(options);
  // EXPRESS
  var app = require('./express')(options);
  // PASSPORT
  var passport = require('./passport')(app);
  // I18N
  require('./i18n')(options, app);
  require('./routes/i18n')(app);
  // APP ROUTES
  if (options.routes) {
    options.routes.forEach(function(value) {
      app.use(value.route, require(value.path));
    });
  } else {
    app.use('/', require('../routes'));
  }

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handlers
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: app.get('env') === 'production' ? {} : err
    });
  });

  return app;
};