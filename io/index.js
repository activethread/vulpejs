"use strict";

var fs = require('fs');

module.exports = {
  read: {
    file: function(path, encoding) {
      encoding = encoding || 'utf8';
      return fs.readFileSync(path, encoding);
    },
    dir: function(path, callback) {
      fs.readdir(path, function(err, list) {
        vulpejs.utils.tryExecute(callback, list);
      });
    }
  },
  write: {
    file: function(name, content) {
      fs.writeFileSync(name, content);
    }
  },
  remove: {
    file: function(path) {
      fs.unlinkSync(path);
    }
  },
  info: {
    file: function(path) {
      return fs.statSync(path);
    }
  }
};