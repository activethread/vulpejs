'use strict';

var http = require('http');

/**
 * Get HTML content from HTTP.
 * @param {Object}   options {}
 * @param {Function} callback Callback function
 */
exports.get = function(options, callback) {
  http.get(options, function(res) {
    var html = '';
    res.on('data', function(chunk) {
      html += chunk.toString();
    });
    res.on('end', function() {
      vulpejs.utils.execute(callback, html);
    });
  }).on('error', function(e) {
    vulpejs.log.error('HTTP GET error: ' + e.message, options);
  });
};

exports.request = require('request');