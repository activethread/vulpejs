"use strict";

var fs = require('fs');
var mkdirp = require('mkdirp');

module.exports = {
  read: {
    file: function(path, encoding) {
      encoding = encoding || 'utf8';
      return fs.readFileSync(path, encoding);
    },
    dir: function(path, callback) {
      fs.readdir(path, function(err, list) {
        vulpejs.utils.execute(callback, list);
      });
    }
  },
  write: {
    file: function(name, content) {
      try {
        fs.writeFileSync(name, content);
      } catch (e) {
        console.error(err);
      }
    },
    dir: function(path, callback) {
      mkdirp(path, function(err) {
        if (err) {
          console.error(err);
        } else {
          vulpejs.utils.execute(callback);
        }
      });
    }
  },
  remove: {
    file: function(path) {
      try {
        fs.unlinkSync(path);
      } catch (e) {
        console.error(e);
      }
    }
  },
  info: {
    file: function(path) {
      return fs.statSync(path);
    }
  },
  file: {
    size: function(filename) {
      var size = 0;
      try {
        var stats = fs.statSync(filename);
        size = stats["size"];
      } catch (e) {
        console.error(e);
      }
      return size
    },
    /**
     * Return file content type.
     *
     * @param  {String} fileName
     * @return {String} Content Type
     */
    contentType: function(fileName) {
      var contentType = 'application/octet-stream';
      var file = fileName.toLowerCase();

      if (file.indexOf('.html') >= 0) {
        contentType = 'text/html';
      } else if (file.indexOf('.css') >= 0) {
        contentType = 'text/css';
      } else if (file.indexOf('.json') >= 0) {
        contentType = 'application/json';
      } else if (file.indexOf('.js') >= 0) {
        contentType = 'application/x-javascript';
      } else if (file.indexOf('.png') >= 0) {
        contentType = 'image/png';
      } else if (file.indexOf('.jpg') >= 0) {
        contentType = 'image/jpg';
      }

      return contentType;
    },
    exists: function(path, callback) {
      fs.exists(path, function(exists) {
        vulpejs.utils.execute(callback, exists);
      });
    },
    rename: function(name, newName, callback) {
      fs.rename(name, newName, function(err) {
        if (err) {
          console.error(err);
        } else {
          vulpejs.utils.execute(callback);
        }
      });
    },
    append: function(path, value) {
      try {
        fs.appendFileSync(path, value);
      } catch (e) {
        console.error(e);
      }
    }
  },
  dir: {
    exists: function(path, callback) {
      fs.exists(path, function(exists) {
        vulpejs.utils.execute(callback, exists);
      });
    },
    make: function(path, callback) {
      mkdirp(path, function(err) {
        if (err) {
          console.error(err);
        } else {
          vulpejs.utils.execute(callback);
        }
      });
    }
  }
};