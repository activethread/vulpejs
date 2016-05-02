'use strict';
var numberWithCommas = function(value, addExtraZero, percentage) {
  if (!addExtraZero) {
    addExtraZero = false;
  }
  if (value === 0) {
    return '0,00';
  }
  value = value.toString();
  value = value.replace(/[^0-9]/g, '');
  if (value.length === 0 || value.length <= 2) {
    return value;
  }
  if (percentage && value.length >= 6) {
    return value.substring(0, 3) + ',' + value.substring(3, 5);
  }

  var numbers = value.substring(0, value.length - 2).replace(/[^0-9\,]/g, '').replace(/\d{1,3}(?=(\d{3})+(?!\d))/g, '$&.');
  var decimals = value.substring(value.length - 2).replace(/[^0-9\,]/g, '');
  if (addExtraZero && decimals.length === 1) {
    decimals += '0';
  }
  return numbers + ',' + decimals;
};

var numbersFormatter = function(value, percentage) {
  if (!value || value.length === 0) {
    return value;
  }
  var amount = value.toString();
  if (amount.length <= 2) {
    return amount + ',00';
  }
  value = Math.round(value * 100) / 100;
  amount = value.toString().split('.');
  if (amount.length === 1) {
    amount.push('00');
  } else if (amount[1].length === 1) {
    amount[1] += '0';
  }
  amount[0] = amount[0].replace(/\d{1,3}(?=(\d{3})+(?!\d))/g, "$&.");
  return amount.length === 2 ? amount.join(',') : numberWithCommas(value, true, percentage);
};

var numbersParser = function(value) {
  if (!value || value.length === 0) {
    return value;
  }
  return value.toString().replace(/\./g, '').replace(/\,/g, '.').replace(/[^0-9.]/g, '');
};

var numbersEvent = function(element) {
  var applyFormatting = function() {
    var value = element.val();
    if (!value || value.length === 0) {
      return;
    }
    value = numberWithCommas(value);
    if (value !== element.val()) {
      element.val(value);
      element.triggerHandler('input');
    }
  };
  element.bind('keyup keydown keypress', function(e) {
    var keycode = e.keyCode;
    if (keycode > 64 && keycode < 91) {
      return false;
    }
    var keyGroup1 = (keycode > 47 && keycode < 58) || keycode === 32 || keycode === 8;
    var keyGroup2 = (keycode > 95 && keycode < 112) || (keycode > 185 && keycode < 193);
    var keyGroup3 = keycode > 218 && keycode < 223;
    if (keyGroup1 || keyGroup2 || keyGroup3) {
      applyFormatting();
    }
  });
  element.bind('blur', function() {
    var value = element.val();
    if (value.length > 0 && value.length <= 2) {
      element.val(value + ',00');
    } else if (value.length === 0) {
      element.val('0,00');
    }
  });
};

/* Directives */
angular.module('app.directives', ['ngAnimate']).directive('shakeThat', ['$animate', function($animate) {
  return {
    require: '^form',
    scope: {
      submit: '&',
      submitted: '='
    },
    link: function(scope, element, attrs, form) {
      element.on('submit', function() {
        scope.$apply(function() {
          if (form.$valid) {
            return scope.submit();
          }
          scope.submitted = true;
          $animate.addClass(element, 'shake').then(function() {
            $animate.removeClass(element, 'shake');
          });
        });
      });
    }
  };
}]).directive('uppercase', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      var upperCase = function(inputValue) {
        if (inputValue) {
          var upper = inputValue.toUpperCase();
          if (upper !== inputValue) {
            modelCtrl.$setViewValue(upper);
            modelCtrl.$render();
          }
          return upper;
        }
      };
      modelCtrl.$parsers.push(upperCase);
      upperCase(scope[attrs.ngModel]);
    }
  };
}).directive('lowercase', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      var lowerCase = function(inputValue) {
        if (inputValue) {
          var lower = inputValue.toLowerCase();
          if (lower !== inputValue) {
            modelCtrl.$setViewValue(lower);
            modelCtrl.$render();
          }
          return lower;
        }
      };
      modelCtrl.$parsers.push(lowerCase);
      lowerCase(scope[attrs.ngModel]);
    }
  };
}).directive('capitalize', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      var capitalize = function(inputValue) {
        if (inputValue) {
          var parts = inputValue.split(' ');
          if (parts.length > 0) {
            var capitalized = '';
            angular.forEach(parts, function(value) {
              if (capitalized !== '') {
                capitalized += ' ';
              }
              capitalized += value.charAt(0).toUpperCase() + value.substring(1);
            });
            if (capitalized !== inputValue) {
              modelCtrl.$setViewValue(capitalized);
              modelCtrl.$render();
            }
            return capitalized;
          }
        }
      };
      modelCtrl.$parsers.push(capitalize);
      capitalize(scope[attrs.ngModel]);
    }
  };
}).directive('capitalizeFirst', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      var capitalize = function(inputValue) {
        if (inputValue) {
          var capitalized = inputValue.charAt(0).toUpperCase() + inputValue.substring(1);
          if (capitalized !== inputValue) {
            modelCtrl.$setViewValue(capitalized);
            modelCtrl.$render();
          }
          return capitalized;
        }
      };
      modelCtrl.$parsers.push(capitalize);
      capitalize(scope[attrs.ngModel]);
    }
  };
}).directive('money', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModelController) {
      numbersEvent(element);
      ngModelController.$parsers.push(numbersParser);
      ngModelController.$formatters.push(numbersFormatter);
    }
  };
}).directive('percentage', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModelController) {
      numbersEvent(element);
      ngModelController.$parsers.push(numbersParser);
      ngModelController.$formatters.push(function(value) {
        return numbersFormatter(value, true);
      });
    }
  };
}).directive('onlyNumeric', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      modelCtrl.$parsers.push(function(inputValue) {
        if (inputValue === undefined) {
          return '';
        }
        var transformedInput = inputValue.replace(/[^0-9]/g, '');
        if (transformedInput !== inputValue) {
          modelCtrl.$setViewValue(transformedInput);
          modelCtrl.$render();
        }

        return transformedInput;
      });
    }
  };
}).directive('onlyAlpha', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      modelCtrl.$parsers.push(function(inputValue) {
        if (inputValue === undefined) {
          return '';
        }
        var transformedInput = inputValue.replace(/[0-9]/g, '');
        if (transformedInput !== inputValue) {
          modelCtrl.$setViewValue(transformedInput);
          modelCtrl.$render();
        }

        return transformedInput;
      });
    }
  };
}).directive('focusMe', ['$timeout', '$parse', function($timeout, $parse) {
  return {
    link: function(scope, element, attrs) {
      var model = $parse(attrs.focusMe);
      scope.$watch(model, function(value) {
        if (value === true) {
          $timeout(function() {
            element[0].focus();
          }, 100);
        }
      });
      element.bind('blur', function() {
        scope.$apply(model.assign(scope, false));
      });
    }
  };
}]).directive('starRating', [function() {
  return {
    restrict: 'EA',
    template: '<ul class="rating" ng-class="{readonly: readonly}">' + '  <li ng-repeat="star in stars" ng-class="star" ng-click="toggle($index)">' + '    <i class="fa fa-star"></i>' + '  </li>' + '</ul>',
    scope: {
      ratingValue: '=ngModel',
      max: '=?',
      onSelect: '&?',
      readonly: '=?'
    },
    link: function(scope) {
      if (scope.max === undefined) {
        scope.max = 5;
      }

      function updateStars() {
        scope.stars = [];
        for (var i = 0, len = scope.max; i < len; ++i) {
          scope.stars.push({
            filled: i < scope.ratingValue
          });
        }
      }
      scope.toggle = function(index) {
        if (scope.readonly === undefined || scope.readonly === false) {
          scope.ratingValue = index + 1;
          scope.onSelect({
            rating: index + 1
          });
        }
      };
      scope.$watch('ratingValue', function() {
        updateStars();
      });
      updateStars();
    }
  };
}]).directive('initialValue', [function() {
  var removeIndent = function(str) {
    var result = "";
    if (str && typeof(str) === 'string') {
      var arr = str.split("\n");
      arr.forEach(function(it) {
        result += it.trim() + '\n';
      });
    }
    return result;
  };

  return {
    restrict: 'A',
    controller: ['$scope', '$element', '$attrs', '$parse', function($scope, $element, $attrs, $parse) {
      var values;
      var tag = $element[0].tagName.toLowerCase();
      var val = $attrs.initialValue || removeIndent($element.val());

      if (tag === 'input') {
        if ($element.attr('type') === 'checkbox') {
          val = $element[0].checked;
        } else if ($element.attr('type') === 'radio') {
          val = ($element[0].checked || $element.attr('selected') !== undefined) ? $element.val() : undefined;
        } else if ($element.attr('type') === 'number') {
          val = ($element.val() !== undefined) ? parseFloat($element.val()) : undefined;
        } else if ($element.attr('type') === 'color' || $element.attr('type') === 'range') {
          val = $element[0].getAttribute('value');
        } else if ($element.attr('type') === 'date') {
          val = new Date(val.trim());
        }
      } else if (tag === "select") {
        values = [];
        for (var i = 0; i < $element[0].options.length; i++) {
          var option = $element[0].options[i];
          if (option.hasAttribute('selected') && $element[0].hasAttribute('multiple')) {
            values.push(option.text);
          } else {
            val = option.text;
          }
        }
      }
      if ($attrs.ngModel && (val || (values !== undefined && values.length))) {
        var getter = $parse($attrs.ngModel);
        var setter = getter.assign;
        setter($scope, values !== undefined && values.length ? values : val);
      }
    }]
  };
}]);
