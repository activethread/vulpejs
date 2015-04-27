"use strict";

var input = function(type, options) {
  var config = {
    type: type,
    model: options.model || 'item',
    alias: options.alias || '',
    name: options.name,
    label: options.label,
    required: options.required || false,
    requiredIf: options.requiredIf || false,
    showIf: options.showIf || false,
    readonly: options.readonly || false
  };
  if (['text', 'date', 'textarea'].indexOf(type) !== -1) {
    if (['text', 'textarea'].indexOf(type) !== -1) {
      config.capitalizeFirst = options.capitalizeFirst || false;
      config.capitalize = options.capitalize || false;
      config.upperCase = options.upperCase || false;
      config.lowerCase = options.lowerCase || false;
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