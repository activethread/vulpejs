"use strict";

module.exports = function(options) {
  if (!options) {
    options = {};
  }
  var path = require('path');
  global.root = {
    dir: path.resolve(__dirname + '/../'),
    context: ''
  };

  global.vulpejs = {
    root: {
      dir: root.dir + '/vulpejs'
    },
    debug: require('./debug'),
    models: require('./models'),
    routes: require('./routes'),
    utils: require('./utils'),
    http: require('./http'),
    io: require('./io'),
    mail: require('./mail'),
    templates: require('./templates'),
    schedules: require('./schedules'),
    express: require('./express')(options),
    ui: require('./ui'),
    async: require('async'),
    crypto: require('crypto'),
    i18n: require('i18n'),
    mongoose: require('mongoose'),
    moment: require('moment'),
    xml2js: require('xml2js'),
    cron: require('cron'),
    app: {
      url: {
        env: {
          development: 'http://localhost:3000',
          test: 'http://localhost:3000',
          production: 'http://localhost:3000'
        }
      },
      root: root,
      upload: {
        tmp: root.dir + '/public/uploaded/tmp/',
        files: root.dir + '/public/uploaded/files/'
      },
      backend: false,
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
      minifier: true
    }
  };
  if (options.backend) {
    vulpejs.app.backend = options.backend;
  }
  if (options.url) {
    vulpejs.app.url = options.url;
  }
  if (options.release) {
    vulpejs.app.release = options.release;
  }
  if (options.version) {
    vulpejs.app.version = options.version;
  }
  if (options.debug) {
    vulpejs.app.debug = options.debug;
  }
  if (options.callback) {
    vulpejs.app.callback = options.callback;
  }
  if (options.root && options.root.context) {
    vulpejs.app.root.context = options.root.context;
  }
  if (options.login) {
    vulpejs.app.login = options.login;
  }
  if (options.security) {
    vulpejs.app.security = options.security;
  }
  if (options.smtp) {
    vulpejs.app.smtp = options.smtp;
  }
  if (process.env.APP_ENV) {
    vulpejs.app.env = process.env.APP_ENV;
  } else if (options.env) {
    vulpejs.app.env = options.env;
  }
  if (options.pagination) {
    vulpejs.app.pagination = options.pagination;
  }
  if (!options.minifier) {
    vulpejs.app.minifier = false;
  }
  if (options.upload) {
    vulpejs.app.upload = options.upload;
  }
  if (options.on) {
    vulpejs.app.on = options.on;
  }

  // APP MODELS
  vulpejs.models.start(options);
  // PASSPORT
  vulpejs.passport = require('./passport');
  // I18N
  require('./i18n')(options);
  // APP ROUTES
  vulpejs.routes.start(options);
  vulpejs.mail.start();

  if (vulpejs.app.on) {
    vulpejs.utils.tryExecute(vulpejs.app.on.ready);
  }
  return vulpejs;
};
