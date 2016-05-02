'use strict';

var money = function(amount, currencySymbol) {
  var value = amount.toString();
  if (amount === 0 || value.length <= 2) {
    return currencySymbol + value + ',00';
  }
  amount = Math.round(amount * 100) / 100;
  value = amount.toString().split('.');
  if (value.length === 1) {
    value.push('00');
  } else if (value[1].length === 1) {
    value[1] += '0';
  }
  value[0] = currencySymbol + value[0].replace(/\d{1,3}(?=(\d{3})+(?!\d))/g, "$&.");
  value = value.join(',');
  return amount >= 0 ? value : '(' + value + ')';
};
var cnpj = function(input) {
  var str = input + '';
  return str.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};
var cpf = function(input) {
  var str = input + '';
  return str.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/* Filters */
angular.module('app.filters', []).filter('startFrom', function() {
  return function(input, start) {
    start = +start;
    return input.slice(start);
  };
}).filter('money', [function() {
  return function(amount, currencySymbol) {
    var value = amount.toString();
    if (!value) {
      return '';
    }
    if (!currencySymbol) {
      currencySymbol = '';
    }
    return money(amount, currencySymbol);
  };
}]).filter('phone', [function() {
  return function(input) {
    var str = input.toString().replace(/\D/g, '');
    return str.length === 11 ? str.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : str.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  };
}]).filter('cut', function() {
  return function(value, wordwise, max, tail) {
    if (!value) {
      return '';
    }

    max = parseInt(max, 10);
    if (!max || value.length <= max) {
      return value;
    }

    value = value.substr(0, max);
    if (wordwise) {
      var lastspace = value.lastIndexOf(' ');
      if (lastspace !== -1) {
        value = value.substr(0, lastspace);
      }
    }

    return value + (tail || ' …');
  };
}).filter('cep', function() {
  return function(input) {
    return input ? input.toString().replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d)/, '$1.$2-$3') : '';
  };
}).filter('cnpj', function() {
  return cnpj;
}).filter('cpf', function() {
  return cpf;
}).filter('cpfCnpj', function() {
  return function(input) {
    var str = input + '';
    return str.length > 11 ? cnpj(input) : cpf(input);
  };
}).filter('real', function() {
  return function(input) {
    if (!input) {
      return '';
    }
    return money(input, 'R$ ');
  };
}).filter('excludeFrom', function() {
  return function(inputArray, filterCriteria) {
    var result = false;
    if (inputArray) {
      result = inputArray.filter(function(item) {
        return !filterCriteria || !angular.equals(item, filterCriteria);
      });
    }
    return result;
  };
}).filter('interval', function() {
  return function(value) {
    var hours = parseInt(value / 60);
    var minutes = parseInt(value % 60);

    var hStr = (hours > 10) ? hours : '0' + hours;
    var mStr = (minutes > 10) ? minutes : '0' + minutes;

    return hStr + ':' + mStr;
  };
}).filter('bytes', [function() {
  return function(bytes, precision) {
    if (typeof bytes !== 'number') {
      bytes = parseFloat(bytes);
    }

    if (bytes === 0) {
      return '0 B';
    } else if (isNaN(bytes) || !isFinite(bytes)) {
      return '-';
    }

    var isNegative = bytes < 0;
    if (isNegative) {
      bytes = -bytes;
    }

    if (typeof precision !== 'number') {
      precision = parseFloat(precision);
    }

    if (isNaN(precision) || !isFinite(precision)) {
      precision = 1;
    }

    var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    var number = (bytes / Math.pow(1024, Math.floor(exponent))).toFixed(precision);

    return (isNegative ? '-' : '') + number + ' ' + units[exponent];
  };
}]).filter('join', [function() {
  return function(input, separator) {
    if (!Array.isArray(input)) {
      return input;
    }

    var filtered = [];
    input.forEach(function(item) {
      if (item) {
        filtered.push(item);
      }
    });

    return filtered.join(separator || ',');
  };
}]).filter('replace', [function() {
  function isString(input) {
    return typeof input === 'string' || input instanceof String;
  }

  return function(input, searchValue, newValue) {
    if (!isString(input) || !isString(searchValue) || !isString(newValue))
      return input;

    return input.split(searchValue).join(newValue);
  };
}]).filter('reverse', [function() {
  function reverseArray(items) {
    return items.slice().reverse();
  }

  function reverseString(input) {
    var result = '';
    for (var i = 0; i < input.length; i++) {
      result = input.charAt(i) + result;
    }

    return result;
  }

  return function(input) {
    if (Array.isArray(input)) {
      return reverseArray(input);
    }

    if (typeof input === 'string' || input instanceof String) {
      return reverseString(input);
    }

    return input;
  };
}]).filter('toSpacedWords', [function() {
  function toSpacedWords(input) {
    if (!input.match(/\d+|__/g)) {
      input = input.replace(/([a-z])([A-Z])/g, '$1 $2');
      input = input.length > 1 ? input.charAt(0).toUpperCase() + input.slice(1) : input;
    }

    return input;
  }

  return function(input) {
    if (!input) {
      return input;
    }

    if (typeof input === 'string' || input instanceof String) {
      return toSpacedWords(input);
    }

    return input;
  };
}]).filter('toHHMMSS', [function() {
  return function(input) {
    if (typeof input === 'number' || input instanceof Number) {
      return vulpe.utils.time.toHHMMSS(input);
    }

    return input;
  };
}]).filter('percentage', ['$window', function($window) {
  return function(input, decimals, suffix) {
    decimals = angular.isNumber(decimals) ? decimals : 2;
    suffix = suffix || '%';
    if ($window.isNaN(input)) {
      return '';
    }
    var base = Math.pow(10, decimals);
    var value = Math.round(input * base) / base;
    return value.toString().replace(/\./g, ',') + suffix;
  };
}]);
