"use strict";

var debug = require('debug');
var moment = require('moment');
var utils = require('../utils');
var io = require('../io');

exports.config = {
  file: {
    size: 1000000
  }
};

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
var types = ['DEBUG', 'INFO', 'ERROR'];
var files = [];
types.forEach(function(type) {
  files[type] = logsDir + type.toLowerCase() + '.log';
});

/**
 * Check if application debug is enabled
 *
 * @return {Boolean}
 */
var isDebug = function() {
  return vulpejs.app && vulpejs.app.debug && vulpejs.app.debug[vulpejs.app.env];
};

/**
 * Create log file
 *
 * @return {}
 */
var create = function(type) {
  var createFile = function() {
    if (type) {
      io.file.exists(files[type], function(exists) {
        if (!exists) {
          io.write.file(files[type], '');
        }
      });
    } else {
      types.forEach(function(type) {
        io.file.exists(files[type], function(exists) {
          if (!exists) {
            io.write.file(files[type], '');
          }
        });
      });
    }
  };
  io.dir.exists(logsDir, function(exists) {
    if (!exists) {
      io.write.dir(logsDir, createFile);
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
var rename = function(type) {
  io.file.rename(files[type], logsDir + type.toLowerCase() + '-' + moment().format('YYYYMMDD-HHmmss') + '.log', function() {
    create(type)
  });
};

create();

/**
 * Template to debug log
 *
 * @return {String}
 */
var template = function() {
  return '\n[${type}][' + moment().format("DD-MM-YYYY HH:mm:ss") + ']: ${title}${break}${message}';
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
  if (type === 'ERROR') {
    console.error(text);
  } else if (type === 'INFO') {
    console.log(text);
  } else if (isDebug()) {
    append(type, text);
  }
  if (type !== 'DEBUG') {
    append(type, text);
  }
};

var append = function(type, text) {
  if (io.file.size(files[type]) > exports.config.file.size) {
    rename(type);
  }
  io.file.append(files[type], text);
};

/**
 * Add to debug log
 *
 * @param  {} title
 * @param  {} message
 * @return {}
 */
exports.debug = function(title, message) {
  log('DEBUG', title, message);
};

/**
 * Add to info log
 *
 * @param  {} title
 * @param  {} message
 * @return {}
 */
exports.info = function(title, message) {
  log('INFO', title, message);
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