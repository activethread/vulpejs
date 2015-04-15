"use strict";
var fs = require('fs');
var i18n = require('i18n');
var mongoose = require('mongoose');
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

  return mongoose.model(options.name, Schema);
};

/**
 * Make schema from options.
 * @param   {Object} options {name, schema}
 * @returns {Object} Schema
 */
exports.makeSchema = function(options) {
  var Schema = mongoose.Schema;
  var Model = new Schema(options.schema);

  Model.plugin(mongoosePaginate);

  return Model;
};

exports.start = function(options) {
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
  var db = mongoose.connection;
  db.on('error', console.error);
  db.once('open', function() {
    var init = function() {
      console.log(i18n.__('Database successfully started!'));
      require(global.app.rootDir + '/schedules');
    };
    require(global.app.rootDir + '/vulpejs/models/security')(mongoose);
    var modelsDir = global.app.rootDir + '/models/';
    var listModules = function(callback) {
      fs.readdir(modelsDir, function(err, list) {
        var modules = [];
        list.forEach(function(name) {
          var stats = fs.statSync(modelsDir + name);
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
          require(modelsDir + model)(mongoose);
        });
        init();
      } else if (options.models.load && options.models.load.first) {
        listModules(function(modules) {
          options.models.load.first.forEach(function(name) {
            var removed = modules.splice(modules.indexOf(name), 1);
            require(modelsDir + removed)(mongoose);
          });
          modules.forEach(function(name) {
            require(modelsDir + name)(mongoose);
          });
          init();
        });
      }
    } else {
      listModules(function(modules) {
        modules.forEach(function(name) {
          require(modelsDir + name)(mongoose);
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
  mongoose.connect(mongoUrl);
  autoIncrement.initialize(mongoose.connection);
};