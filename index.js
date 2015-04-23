module.exports = function(options) {
  if (!options) {
    options = {};
  }
  var path = require('path');
  global.app = {
    url: 'http://localhost:3000',
    rootDir: path.resolve(__dirname + '/../'),
    rootContext: '',
    release: '',
    version: '',
    env: 'development',
    debug: false,
    callback: {
      login: {
        error: function(data) {},
        success: function(data) {},
        unauthorized: function(data) {}
      },
      logout: function(data) {},
      save: {
        success: function(data) {},
        error: function(data) {}
      },
      remove: {
        success: function(data) {},
        error: function(data) {}
      },
      list: {
        success: function(data) {},
        error: function(data) {}
      }
    },
    smtp: {
      host: 'localhost',
      port: 25,
      auth: {
        user: 'root@localhost',
        pass: 'q1w2e3r4'
      }
    },
    security: {
      routes: [{
        uri: '/**',
        roles: ['SUPER', 'ADMIN']
      }]
    },
    pagination: {
      items: 15,
      history: 5
    },
    page: {
      minifier: true
    }
  }
  if (options.url) {
    global.app.url = options.url;
  }
  if (options.release) {
    global.app.release = options.release;
  }
  if (options.version) {
    global.app.version = options.version;
  }
  if (options.debug) {
    global.app.debug = options.debug;
  }
  if (options.callback) {
    global.app.callback = options.callback;
  }
  if (options.rootContext) {
    global.app.rootContext = options.rootContext;
  }
  if (options.login) {
    global.app.login = options.login;
  }
  if (options.security) {
    global.app.security = options.security;
  }
  if (options.smtp) {
    global.app.smtp = options.smtp;
  }
  if (options.env) {
    global.app.env = options.env;
  }
  if (options.pagination) {
    global.app.pagination = options.pagination;
  }
  if (options.page) {
    global.app.page = options.page;
  }

  // ASYNC
  var async = require('async');
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
  require('./routes').start(app, options);

  return app;
};