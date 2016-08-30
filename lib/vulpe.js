'use strict';

/**
 * VulpeJS module
 *
 * @param  {} options (url, models, routes, database, session)
 * @return {VulpeJS}
 */
module.exports = function(options) {
  if (!options) {
    options = {};
  }
  var path = require('path');
  global.root = {
    dir: path.resolve(__dirname + '/../../../'),
    vulpejs: {
      dir: path.resolve(__dirname),
    },
    context: '',
  };
  if (process.env.APP_ENV) {
    options.env = process.env.APP_ENV;
  }

  global.vulpejs = {
    root: {
      dir: global.root.vulpejs.dir,
    },
    log: require('./log'),
    cache: require('./cache'),
    models: require('./models'),
    routes: require('./routes'),
    utils: require('./utils'),
    http: require('./http'),
    io: require('./io'),
    mail: require('./mail'),
    templates: require('./templates'),
    schedules: require('./schedules'),
    ui: require('./ui'),
    async: require('async'),
    crypto: require('crypto'),
    i18n: require('i18n'),
    mongoose: require('mongoose'),
    moment: require('moment'),
    xml2js: require('xml2js'),
    cron: require('cron'),
    jwt: require('jsonwebtoken'),
    plugins: {},
    app: {
      cors: {
        enabled: false,
      },
      url: {
        development: 'http://localhost:3000',
        test: 'http://localhost:3001',
        production: 'http://localhost:3000',
      },
      cluster: {
        development: false,
        test: false,
        production: true,
      },
      ports: {
        development: 3000,
        test: 3001,
        production: 3000,
      },
      root: root,
      models: {},
      routes: {},
      javascripts: [],
      database: {
        development: {
          host: 'localhost',
          port: 27017,
          name: 'appName',
          auth: {
            source: 'admin',
            user: 'admin',
            pass: 'vulpejs',
          },
        },
        test: {
          host: 'localhost',
          port: 27017,
          name: 'appName-test',
          auth: {
            source: 'admin',
            user: 'admin',
            pass: 'vulpejs',
          },
        },
        production: {
          host: 'localhost',
          port: 27017,
          name: 'appName-production',
          auth: {
            source: 'admin',
            user: 'admin',
            pass: 'vulpejs',
          },
        },
      },
      session: {
        mongo: {
          development: {
            host: 'localhost',
            name: 'express',
            port: 27017,
            collection: 'session',
            auth: {
              source: 'admin',
              user: 'admin',
              pass: 'vulpejs',
            },
          },
          test: {
            host: 'localhost',
            name: 'express-test',
            port: 27017,
            collection: 'session',
            auth: {
              source: 'admin',
              user: 'admin',
              pass: 'vulpejs',
            },
          },
          production: {
            host: 'localhost',
            name: 'express-production',
            port: 27017,
            collection: 'session',
            auth: {
              source: 'admin',
              user: 'admin',
              pass: 'vulpejs',
            },
          },
        },
      },
      uploader: {
        development: {
          dir: {
            public: global.root.dir + '/public/uploaded',
            tmp: global.root.dir + '/public/uploaded/tmp',
            files: global.root.dir + '/public/uploaded/files',
          },
        },
        test: {
          dir: {
            public: global.root.dir + '/public/uploaded',
            tmp: global.root.dir + '/public/uploaded/tmp',
            files: global.root.dir + '/public/uploaded/files',
          },
        },
        production: {
          dir: {
            public: global.root.dir + '/public/uploaded',
            tmp: global.root.dir + '/public/uploaded/tmp',
            files: global.root.dir + '/public/uploaded/files',
          },
        },
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
          unauthorized: function(data) {},
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
            error: function(data) {},
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
            error: function(data) {},
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
            error: function(data) {},
          },
        },
      },
      smtp: {
        host: 'localhost',
        port: 25,
        auth: {
          user: 'root@localhost',
          pass: 'vulpejs',
        },
      },
      security: {
        routes: [{
          uri: '/**',
          roles: ['SUPER', 'ADMIN'],
        }, ],
      },
      pagination: {
        items: 15,
        history: 5,
      },
      minifier: {
        development: false,
        test: false,
        production: true,
      },
    },
    start: function() {
      var execute = function() {
        /**
         * Module dependencies.
         */
        var debug = vulpejs.log.server(vulpejs.app.name);
        var http = require('http');

        /**
         * Get port from environment and store in Express.
         */
        var port = normalizePort(process.env.PORT || (vulpejs.app.ports[vulpejs.app.env] || 3000));
        vulpejs.express.app.set('port', port);

        /**
         * Create HTTP server.
         */
        var server = http.createServer(vulpejs.express.app);

        /**
         * Listen on provided port, on all network interfaces.
         */
        server.listen(port);
        server.on('error', onError);
        server.on('listening', onListening);

        /**
         * Normalize a port into a number, string, or false.
         */
        function normalizePort(val) {
          var port = parseInt(val, 10);

          if (isNaN(port)) {
            return val;
          }

          if (port >= 0) {
            return port;
          }

          return false;
        }

        /**
         * Event listener for HTTP server "error" event.
         */
        function onError(error) {
          if (error.syscall !== 'listen') {
            throw error;
          }

          var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

          switch (error.code) {
            case 'EACCES':
              console.error(bind + ' requires elevated privileges');
              process.exit(1);
              break;
            case 'EADDRINUSE':
              console.error(bind + ' is already in use');
              process.exit(1);
              break;
            default:
              throw error;
          }
        }

        /**
         * Event listener for HTTP server "listening" event.
         */
        function onListening() {
          var addr = server.address();
          var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
          debug('Listening on ' + bind);
        }
      };
      if (vulpejs.app.cluster && vulpejs.app.cluster[vulpejs.app.env]) {
        var cluster = require('cluster');
        var numCPUs = require('os').cpus().length;

        if (cluster.isMaster) {
          for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
          }
          cluster.on('exit', function(worker, code, signal) {
            vulpejs.log.info('Cluster', 'Worker ' + worker.process.pid + ' died');
            cluster.fork();
          });
        } else {
          execute();
        }
      } else {
        execute();
      }
    },
  };
  vulpejs.app.name = options.name || 'appName';
  if (options.backend) {
    vulpejs.app.backend = options.backend;
  }
  if (options.cluster) {
    vulpejs.app.cluster = options.cluster;
  }
  if (options.ports) {
    vulpejs.app.ports = options.ports;
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
  if (!vulpejs.app.security.auth) {
    vulpejs.app.security.auth = {
      jwt: {
        secret: 'vulpejs',
        options: {
          expiresIn: 5 * 60,
        },
      },
    }
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
  if (options.uploader) {
    vulpejs.app.uploader = options.uploader;
  }
  if (options.on) {
    vulpejs.app.on = options.on;
  }
  if (options.database) {
    vulpejs.app.database = options.database;
  }
  if (options.session) {
    vulpejs.app.session = options.session;
  }
  if (options.routes) {
    vulpejs.app.routes = options.routes;
  }
  if (options.models) {
    vulpejs.app.models = options.models;
  }

  // EXPRESS
  vulpejs.express = require('./express')();
  // I18N
  if (!options.i18n) {
    options.i18n = {
      locales: ['pt', 'en', 'es'],
      defaultLocale: 'pt',
      cookie: 'appLanguage',
      indent: '  ',
      directory: global.root.dir + '/locales',
    };
  }
  vulpejs.i18n.configure(options.i18n);
  vulpejs.express.app.use(vulpejs.i18n.init);

  setTimeout(function() {
    if (!vulpejs.app.models.ignore) {
      // APP MODELS
      vulpejs.models.init();
    }
    // APP ROUTES
    vulpejs.routes.init();
    vulpejs.mail.init();

    if (vulpejs.app.on) {
      vulpejs.utils.execute(vulpejs.app.on.ready);
    }
  }, 100);

  return vulpejs;
};