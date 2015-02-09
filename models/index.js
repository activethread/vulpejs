"use strict";
var i18n = require('i18n');
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

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
    if (this.modified) {
      this.modified = Date.now;
    }
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
      name: 'appName'
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
  }
  var db = mongoose.connection;
  db.on('error', console.error);
  db.once('open', function() {
    if (options.models) {
      options.models.forEach(function(model) {
        require(appRoot + '/models/' + model)(mongoose)
      });
    }
    console.log(i18n.__('Database successfully started!'));
    require(appRoot + '/schedules');
  });

  mongoose.connect('mongodb://' + options.database.host + ':' + options.database.port + '/' + options.database.name);
};