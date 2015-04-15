var fs = require('fs');
var moment = require('moment');
var mkdirp = require('mkdirp');
var utils = require('../utils');

var logsDir = global.app.rootDir + '/logs/';
var debugFile = logsDir + 'debug.log';
var isDebug = function() {
  return global.app && global.app.debug;
}

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

var template = function() {
  return '[${type}][' + moment().format("DD-MM-YYYY HH:mm:ss") + ']: ${title}\n${message}\n';
};

var log = function(type, value1, value2) {
  var text = template();
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
    if (utils.getFilesizeInBytes(debugFile) > 1000000) {
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

exports.log = function(title, message) {
  log('DEBUG', title, message);
};

exports.error = function(title, message) {
  log('ERROR', title, message);
};