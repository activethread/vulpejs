"use strict";

module.exports = require('vulpejs')({
  routes: {
    load: {
      first: ['index']
    }
  },
  models: {
    load: {
      first: ['user', 'history']
    }
  },
  database: {
    development: {
      host: 'localhost',
      name: 'first-app',
      auth: {
        source: 'admin',
        user: 'admin',
        pass: 'vulpejs'
      }
    }
  },
  session: {
    mongo: {
      development: {
        host: 'localhost',
        db: 'express',
        collection: 'session',
        auth: {
          source: 'admin',
          user: 'admin',
          pass: 'vulpejs'
        }
      }
    }
  },
  security: {
    routes: [{
      uri: '/**',
      roles: ['SUPER', 'ADMIN']
    }],
    login: {
      skip: []
    }
  },
  debug: false,
  env: 'development',
  version: '0.0.1',
  release: 'BETA',
  minifier: {
    development: false,
    test: false,
    production: true
  }
});