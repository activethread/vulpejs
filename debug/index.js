"use strict";

var fs = require('fs');
var debug = require('debug');
var moment = require('moment');
var mkdirp = require('mkdirp');
var utils = require('../utils');
var io = require('../io');

/**
 * Debug Server
 *
 * @param  {String} name
 * @return {Debug}
 */
exports.server = function(name) {
  return debug(name + ':server');
};

var logsDir = root.dir + '/logs/';
var debugFile = logsDir + 'debug.log';
/**
 * Check if application debug is enabled
 *
 * @return {Boolean}
 */
var isDebug = function() {
  return vulpejs.app && vulpejs.app.debug;
}

/**
 * Create log file
 *
 * @return {}
 */
var create = function() {
  var createFile = function() {
    fs.exists(debugFile, function(exists) {
      if (!exists) {
        fs.writeFile(debugFile, '');
      }
    });
  };
  fs.exists(logsDir, function(exists) {
    if (!exists) {
      mkdirp(logsDir, function(err) {
        if (err) {
          console.error(err);
        } else {
          createFile();
        }
      });
    } else {
      createFile();
    }
  });
};

/**
 * Rename log file
 *
 * @return {}
 */
var rename = function() {
  fs.rename(debugFile, debugFile.split('.')[0] + '-' + moment().format('YYYYMMDDHHmmss') + '.log', function(err) {
    if (err) {
      console.error(err);
    } else {
      create();
    }
  });
};

create();

/**
 * Template to debug log
 *
 * @return {String}
 */
var template = function() {
  return '[${type}][' + moment().format("DD-MM-YYYY HH:mm:ss") + ']: ${title}${break}${message}';
};

/**
 * Add to log
 *
 * @param  {String} type
 * @param  {} value1
 * @param  {} value2
 * @return {}
 */
var log = function(type, value1, value2) {
  var text = template().replace('${break}', value2 ? '\n\t' : '');
  if (utils.isObject(value1)) {
    value1 = JSON.stringify(value1);
  }
  if (utils.isObject(value2)) {
    value2 = JSON.stringify(value2);
  }
  text = text.replace('${type}', type ? type : 'DEBUG');
  text = text.replace('${title}', value1 ? value1 : '');
  text = text.replace('${message}', value2 ? value2 : '');
  if (isDebug()) {
    if (io.file.size(debugFile) > 1000000) {
      rename();
    }
    fs.appendFileSync(debugFile, text);
  } else {
    if (type === 'ERROR') {
      console.error(text);
    } else {
      console.log(text);
    }
  }
};

/**
 * Add to log
 *
 * @param  {} title
 * @param  {} message
 * @return {}
 */
exports.log = function(title, message) {
  log('DEBUG', title, message);
};

/**
 * Add to error log
 *
 * @param  {} title
 * @param  {} message
 * @return {}
 */
exports.error = function(title, message) {
  log('ERROR', title, message);
};