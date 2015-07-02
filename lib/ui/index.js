"use strict";

/**
 * Configure input
 *
 * @param  {String} type
 * @param  {Object} options [description]
 * @return {Object} Input object
 */
var input = function(type, options) {
  var config = {
    type: type,
    model: options.model || 'item',
    alias: options.alias || '',
    name: options.name,
    label: options.label,
    required: options.required || false,
    show: options.show || false,
    readonly: options.readonly || false
  };
  if (['text', 'date', 'textarea'].indexOf(type) !== -1) {
    if (['text', 'textarea'].indexOf(type) !== -1) {
      config.capitalize = options.capitalize || 'normal';
      config.case = options.case || 'normal';
    }
    config.mask = options.mask || false;
    config.maskPattern = options.maskPattern || false;
  }
  return config;
};

module.exports = {
  input: {
    text: function(options) {
      return input('text', options);
    },
    textarea: function(options) {
      return input('textarea', options);
    },
    date: function(options) {
      return input('date', options);
    },
    email: function(options) {
      return input('email', options);
    },
    checkbox: function(options) {
      return input('checkbox', options);
    },
    radio: function(options) {
      return input('radio', options);
    }
  }
};