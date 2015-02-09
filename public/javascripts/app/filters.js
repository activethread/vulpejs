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

function formatReal(int) {
  var tmp = int + '';
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
    return inputArray.filter(function(item) {
      return !filterCriteria || !angular.equals(item, filterCriteria);
    });
  };
});