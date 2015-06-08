"use strict";

/**
 * VulpeJS module
 *
 * @param  {} options {url, models, routes, database, session}
 * @return {VulpeJS}
 */
module.exports = function(options) {
  if (!options) {
    options = {};
  }
  var path = require('path');
  global.root = {
    dir: path.resolve(__dirname + '/../../'),
    vulpejs: {
      dir: path.resolve(__dirname)
    },
    context: ''
  };
  if (process.env.APP_ENV) {
    options.env = process.env.APP_ENV;
  }

  global.vulpejs = {
    root: {
      dir: root.vulpejs.dir
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
      cors: {
        enabled: false
      },
      url: {
        development: 'http://localhost:3000',
        test: 'http://localhost:3000',
        production: 'http://localhost:3000'
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
          /**
           * Callback on login error.
           *
           * @param  {} data
           * @return {}
           */
          error: function(data) {},
          /**
           * Callback on login successfully.
           *
           * @param  {} data
           * @return {}
           */
          success: function(data) {},
          /**
           * Callback on unauthorized login.
           *
           * @param  {} data
           * @return {}
           */
          unauthorized: function(data) {}
        },
        /**
         * Callback on logout.
         *
         * @param  {} data
         * @return {}
         */
        logout: function(data) {},
        model: {
          save: {
            /**
             * Callback on model save successfully.
             *
             * @param  {} data
             * @return {}
             */
            success: function(data) {},
            /**
             * Callback on model save error.
             *
             * @param  {} data
             * @return {}
             */
            error: function(data) {}
          },
          remove: {
            /**
             * Callback on model remove successfully.
             *
             * @param  {} data
             * @return {}
             */
            success: function(data) {},
            /**
             * Callback on model remove error.
             *
             * @param  {} data
             * @return {}
             */
            error: function(data) {}
          },
          list: {
            /**
             * Callback on model list successfully.
             *
             * @param  {} data
             * @return {}
             */
            success: function(data) {},
            /**
             * Callback on model list error.
             *
             * @param  {} data
             * @return {}
             */
            error: function(data) {}
          }
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
      minifier: {
        development: false,
        test: false,
        production: true
      }
    }
  };
  if (options.backend) {
    vulpejs.app.backend = options.backend;
  }
  if (options.cors) {
    vulpejs.app.cors = options.cors;
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
  if (options.env) {
    vulpejs.app.env = options.env;
  }
  if (options.pagination) {
    vulpejs.app.pagination = options.pagination;
  }
  if (options.minifier) {
    vulpejs.app.minifier = options.minifier;
  }
  if (options.upload) {
    vulpejs.app.upload = options.upload;
  }
  if (options.on) {
    vulpejs.app.on = options.on;
  }

  // APP MODELS
  vulpejs.models.init(options);
  // I18N
  if (!options.i18n) {
    options.i18n = {
      locales: ['pt', 'en', 'es'],
      defaultLocale: 'pt',
      cookie: 'appLanguage',
      indent: '  ',
      directory: root.dir + '/locales'
    };
  }
  vulpejs.i18n.configure(options.i18n);
  vulpejs.express.app.use(vulpejs.i18n.init);

  // APP ROUTES
  vulpejs.routes.init(options);
  vulpejs.mail.init();

  if (vulpejs.app.on) {
    vulpejs.utils.execute(vulpejs.app.on.ready);
  }
  return vulpejs;
};