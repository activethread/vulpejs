'use strict';

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
      name: 'first-app-development',
      auth: {
        source: 'admin',
        user: 'admin',
        pass: 'vulpejs'
      }
    },
    test: {
      host: 'localhost',
      name: 'first-app-test',
      auth: {
        source: 'admin',
        user: 'admin',
        pass: 'vulpejs'
      }
    },
    production: {
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
        db: 'first-app-express-development',
        collection: 'session',
        auth: {
          source: 'admin',
          user: 'admin',
          pass: 'vulpejs'
        }
      },
      test: {
        host: 'localhost',
        db: 'first-app-express-test',
        collection: 'session',
        auth: {
          source: 'admin',
          user: 'admin',
          pass: 'vulpejs'
        }
      },
      development: {
        host: 'localhost',
        db: 'first-app-express',
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
  minifier: {
    development: false,
    test: false,
    production: true
  },
  debug: {
    development: true,
    test: true,
    production: false
  },
  version: '0.0.1',
  release: 'BETA',
  env: 'development'
});