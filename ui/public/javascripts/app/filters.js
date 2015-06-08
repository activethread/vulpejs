'use strict';

/* Filters */
var app = angular.module('app.filters', ['i18n']);

app.filter('startFrom', function() {
  return function(input, start) {
    start = +start;
    return input.slice(start);
  };
});

app.filter('money', ['$filter', '$locale', function(filter, locale) {
  var formats = locale.NUMBER_FORMATS;
  return function(amount, currencySymbol) {
    if (amount === 0) {
      return currencySymbol + amount + ',00';
    }
    var value = amount.toString();
    value = currencySymbol + value.substring(0, value.length - 2) + "," + value.substring(value.length - 2);
    var parts = value.split(',');
    parts[0] = parts[0].replace(/\d{1,3}(?=(\d{3})+(?!\d))/g, "$&.");
    if (amount >= 0) {
      return parts.join(',');
    }
    return '(' + parts.join(',') + ')';
  };
}]);

app.filter('phone', [function() {
  return function(phone, currencySymbol) {
    if (phone.length >= 10) {
      phone = '(' + phone.substring(0, 2) + ') ' + phone.substring(2, 6) + '-' + phone.substring(6);
    } else if (phone.length >= 8) {
      phone = phone.substring(1, 4) + '-' + phone.substring(5);
    }
    return phone;
  };
}]);

app.filter('cut', function() {
  return function(value, wordwise, max, tail) {
    if (!value) {
      return '';
    }

    max = parseInt(max, 10);
    if (!max) {
      return value;
    }
    if (value.length <= max) {
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
});

app.filter('booleanToString', ['i18n', function(i18n) {
  return function(text) {
    if (text) {
      text = i18n.__('Yes');
    } else {
      text = i18n.__('No');
    }
    return text;
  };
}]);

app.filter('cep', function() {
  return function(input) {
    var str = input + '';
    str = str.replace(/\D/g, '');
    str = str.replace(/^(\d{2})(\d{3})(\d)/, '$1.$2-$3');
    return str;
  };
});

app.filter('cnpj', function() {
  return function(input) {
    var str = input + '';
    str = str.replace(/\D/g, '');
    str = str.replace(/^(\d{2})(\d)/, '$1.$2');
    str = str.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    str = str.replace(/\.(\d{3})(\d)/, '.$1/$2');
    str = str.replace(/(\d{4})(\d)/, '$1-$2');
    return str;
  };
});

app.filter('cpf', function() {
  return function(input) {
    var str = input + '';
    str = str.replace(/\D/g, '');
    str = str.replace(/(\d{3})(\d)/, '$1.$2');
    str = str.replace(/(\d{3})(\d)/, '$1.$2');
    str = str.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return str;
  };
});

app.filter('cpfCnpj', function() {
  return function(input) {
    var str = input + '';
    if (str.length > 11) {
      str = str.replace(/\D/g, '');
      str = str.replace(/^(\d{2})(\d)/, '$1.$2');
      str = str.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      str = str.replace(/\.(\d{3})(\d)/, '.$1/$2');
      str = str.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      str = str.replace(/\D/g, '');
      str = str.replace(/(\d{3})(\d)/, '$1.$2');
      str = str.replace(/(\d{3})(\d)/, '$1.$2');
      str = str.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return str;
  };
});

function formatReal(value) {
  var tmp = value + '';
  var res = tmp.replace('.', '');
  tmp = res.replace(',', '');
  var neg = false;
  if (tmp.indexOf('-') === 0) {
    neg = true;
    tmp = tmp.replace('-', '');
  }
  if (tmp.length === 1) {
    tmp = '0' + tmp;
  }
  tmp = tmp.replace(/([0-9]{2})$/g, ',$1');
  if (tmp.length > 6) {
    tmp = tmp.replace(/([0-9]{3}),([0-9]{2}$)/g, '.$1,$2');
  }
  if (tmp.length > 9) {
    tmp = tmp.replace(/([0-9]{3}).([0-9]{3}),([0-9]{2}$)/g, '.$1.$2,$3');
  }
  if (tmp.length > 12) {
    tmp = tmp.replace(/([0-9]{3}).([0-9]{3}).([0-9]{3}),([0-9]{2}$)/g, '.$1.$2.$3,$4');
  }
  if (tmp.indexOf('.') === 0) {
    tmp = tmp.replace('.', '');
  }
  if (tmp.indexOf(',') === 0) {
    tmp = tmp.replace(',', '0,');
  }
  return neg ? '-' + tmp : tmp;
}

app.filter('real', function() {
  return function(input) {
    return 'R$ ' + formatReal(input);
  };
});

app.filter('tel', function() {
  return function(input) {
    var str = input + '';
    str = str.replace(/\D/g, '');
    if (str.length === 11) {
      str = str.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else {
      str = str.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return str;
  };
});

app.filter('excludeFrom', function() {
  return function(inputArray, filterCriteria) {
    var result = false;
    if (inputArray) {
      result = inputArray.filter(function(item) {
        return !filterCriteria || !angular.equals(item, filterCriteria);
      });
    }
    return result;
  };
});

app.filter('interval', function() {
  return function(value) {
    var hours = parseInt(value / 60);
    var minutes = parseInt(value % 60);

    var hStr = (hours > 10) ? hours : '0' + hours;
    var mStr = (minutes > 10) ? minutes : '0' + minutes;

    return hStr + ':' + mStr;
  };
});

app.filter('bytes', [function() {
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
}]);

app.filter('join', [function() {
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
}]);

app.filter('replace', [function() {
  function isString(input) {
    return typeof input === 'string' || input instanceof String;
  }

  return function(input, searchValue, newValue) {
    if (!isString(input) || !isString(searchValue) || !isString(newValue))
      return input;

    return input.split(searchValue).join(newValue);
  };
}]);

app.filter('reverse', [function() {
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
}]);

app.filter('toSpacedWords', [function() {
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
}]);

app.filter('toHHMMSS', [function() {
  return function(input) {
    if (typeof input === 'number' || input instanceof Number) {
      return vulpe.utils.time.toHHMMSS(input);
    }

    return input;
  };
}]);