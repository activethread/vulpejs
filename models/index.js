"use strict";

var mongoosePaginate = require('mongoose-paginate');
var autoIncrement = require('mongoose-auto-increment')

/**
 * Validate presence of value.
 * @param   {String}  value Value
 * @returns {Boolean} True if exists and False if not.
 */
exports.validatePresenceOf = function(value) {
  return value && value.length;
};

/**
 * Get model from schema.
 * @param   {Object} options {name, schema}
 * @returns {Object} Model
 */
exports.getModel = function(options) {
  var Schema = exports.makeSchema(options);
  Schema.pre('save', function(next) {
    this.modified = Date.now();
    next();
  });

  return vulpejs.mongoose.model(options.name, Schema);
};

/**
 * Make schema from options.
 * @param   {Object} options {name, schema}
 * @returns {Object} Schema
 */
exports.makeSchema = function(options) {
  var Schema = vulpejs.mongoose.Schema;
  var Model = new Schema(options.schema);

  Model.plugin(mongoosePaginate);

  return Model;
};

exports.start = function(options) {
  var vulpejs = global.vulpejs;
  if (!options.database) {
    options.database = {
      host: 'localhost',
      port: 27017,
      name: 'appName',
      user: 'admin',
      pass: 'q1w2e3r4'
    }
  } else {
    if (!options.database.host) {
      options.database.host = 'localhost';
    }
    if (!options.database.port) {
      options.database.port = 27017;
    }
    if (!options.database.name) {
      options.database.name = 'appName';
    }
    if (!options.database.user) {
      options.database.user = 'admin';
    }
    if (!options.database.pass) {
      options.database.pass = 'q1w2e3r4';
    }
  }
  var db = vulpejs.mongoose.connection;
  db.on('error', console.error);
  db.once('open', function() {
    var init = function() {
      vulpejs.debug.log(vulpejs.i18n.__('Database successfully started!'));
      vulpejs.schedules.start();
    };
    require(root.dir + '/vulpejs/models/security');
    var modelsDir = vulpejs.app.root.dir + '/models/';
    var listModules = function(callback) {
      vulpejs.io.read.dir(modelsDir, function(list) {
        var modules = [];
        list.forEach(function(name) {
          var stats = vulpejs.io.info.file(modelsDir + name);
          if (stats.isFile() && name[0] !== '.') {
            modules.push(name.split('.')[0]);
          }
        });
        callback(modules);
      });
    };
    if (options.models) {
      if (Array.isArray(options.models)) {
        options.models.forEach(function(model) {
          require(modelsDir + model);
        });
        init();
      } else if (options.models.load && options.models.load.first) {
        listModules(function(modules) {
          options.models.load.first.forEach(function(name) {
            var removed = modules.splice(modules.indexOf(name), 1);
            require(modelsDir + removed)();
          });
          modules.forEach(function(name) {
            require(modelsDir + name);
          });
          init();
        });
      }
    } else {
      listModules(function(modules) {
        modules.forEach(function(name) {
          require(modelsDir + name);
        });
        init();
      });
    }
  });
  var mongoUrl = 'mongodb://${auth}${host}:${port}/${db}?authSource=admin&w=1';
  if (options.database.user && options.database.pass) {
    mongoUrl = mongoUrl.replace('${auth}', options.database.user + ':' + options.database.pass + '@');
  } else {
    mongoUrl = mongoUrl.replace('${auth}', '');
  }
  mongoUrl = mongoUrl.replace('${host}', options.database.host);
  mongoUrl = mongoUrl.replace('${port}', options.database.port);
  mongoUrl = mongoUrl.replace('${db}', options.database.name);
  vulpejs.mongoose.connect(mongoUrl);
  autoIncrement.initialize(vulpejs.mongoose.connection);
};