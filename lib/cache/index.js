'use strict';

/**
 * Cache map.
 *
 * @type {Array}
 */
exports.map = [];

/**
 * Put item value on cache map.
 *
 * @param  {String} key
 * @param  {Object} value
 * @return {Object}
 */
exports.put = function(key, value) {
  exports.map[key] = value;
};

/**
 * Get item value from cache map.
 *
 * @param  {String} key
 * @return {Object}
 */
exports.get = function(key) {
  return exports.map[key];
};

/**
 * Remove item value from cache map.
 *
 * @param  {String} key
 */
exports.remove = function(key) {
  delete exports.map[key];
};