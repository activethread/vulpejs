'use strict';

var debug = require('debug');
var moment = require('moment');
var utils = require('../utils');
var io = require('../io');

exports.config = {
  file: {
    size: 1024000,
  },
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
var create = function(type, text) {
  var createFile = function() {
    if (type) {
      io.file.exists(files[type], function(exists) {
        if (!exists) {
          io.write.file(files[type], text || '');
        }
      });
    } else {
      types.forEach(function(type) {
        io.file.exists(files[type], function(exists) {
          if (!exists) {
            io.write.file(files[type], text || '');
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
var rename = function(type, text) {
  var time = moment().format('YYYYMMDD-HHmmss');
  var path = logsDir + type.toLowerCase() + '-' + time + '.log';
  io.file.rename(files[type], path, function() {
    create(type, text);
  });
};

create();

/**
 * Template to debug log
 *
 * @return {String}
 */
var template = function() {
  var time = moment().format('DD-MM-YYYY HH:mm:ss');
  return '\n[${type}][' + time + ']: ${title}${break}${message}';
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
    value1 = utils.to.json(value1);
  }

  if (utils.isObject(value2)) {
    value2 = utils.to.json(value2);
  }

  text = text.replace('${type}', type || 'DEBUG');
  text = text.replace('${title}', value1 || '');
  text = text.replace('${message}', value2 || '');
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
  } else {
    io.file.append(files[type], text);
  }
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