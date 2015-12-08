'use strict';
/* Directives */
var app = angular.module('app.directives', ['ngAnimate']);

app.directive('shakeThat', ['$animate', function($animate) {
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
}]);

app.directive('uppercase', function() {
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
});

app.directive('lowercase', function() {
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
});

app.directive('capitalize', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      var capitalize = function(inputValue) {
        if (inputValue) {
          var parts = inputValue.split(' ');
          if (parts.length > 0) {
            var capitalized = '';
            angular.forEach(parts, function(value, key) {
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
});

app.directive('capitalizeFirst', function() {
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
});

app.directive('currency', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModelController) {
      // Run formatting on keyup
      var numberWithCommas = function(value, addExtraZero) {
        if (addExtraZero === undefined) {
          addExtraZero = false;
        }
        value = value.toString();
        value = value.replace(/[^0-9]/g, '');
        if (value.length === 0 || value.length <= 2) {
          return value;
        }
        value = value.substring(0, value.length - 2) + ',' + value.substring(value.length - 2);
        value = value.replace(/[^0-9\,]/g, '');
        var parts = value.split(',');
        parts[0] = parts[0].replace(/\d{1,3}(?=(\d{3})+(?!\d))/g, '$&.');
        if (parts[1] && parts[1].length > 2) {
          parts[1] = parts[1].substring(0, 2);
        }
        if (addExtraZero && parts[1] && (parts[1].length === 1)) {
          parts[1] = parts[1] + '0';
        }
        return parts.join(parts.length === 1 ? '' : ',');
      };
      var applyFormatting = function() {
        var value = element.val();
        var original = value;
        if (!value || value.length === 0) {
          return;
        }
        value = numberWithCommas(value);
        if (value !== original) {
          element.val(value);
          element.triggerHandler('input');
        }
      };
      element.bind('keyup keydown keypress', function(e) {
        var keycode = e.keyCode;
        if (keycode > 64 && keycode < 91) { // letter keys
          return false;
        }
        var isTextInputKey = (keycode > 47 && keycode < 58) || // number keys
          keycode === 32 || keycode === 8 || // spacebar or backspace
          (keycode > 95 && keycode < 112) || // numpad keys
          (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
          (keycode > 218 && keycode < 223); // [\]' (in order)
        if (isTextInputKey) {
          applyFormatting();
        }
      });
      ngModelController.$parsers.push(function(value) {
        if (!value || value.length === 0) {
          return value;
        }
        value = value.toString();
        value = value.replace(/[^0-9]/g, '');
        // value = value.substring(0, value.length - 2) + '.' + value.substring(value.length - 2);
        return value;
      });
      ngModelController.$formatters.push(function(value) {
        if (!value || value.length === 0) {
          return value;
        }
        value = numberWithCommas(value, true);
        return value;
      });
    }
  };
});

app.directive('onlyNumeric', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      modelCtrl.$parsers.push(function(inputValue) {
        if (inputValue == undefined) {
          return '';
        }
        var transformedInput = inputValue.replace(/[^0-9]/g, '');
        if (transformedInput != inputValue) {
          modelCtrl.$setViewValue(transformedInput);
          modelCtrl.$render();
        }

        return transformedInput;
      });
    }
  };
});

app.directive('onlyAlfa', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, modelCtrl) {
      modelCtrl.$parsers.push(function(inputValue) {
        if (inputValue == undefined) {
          return '';
        }
        var transformedInput = inputValue.replace(/[0-9]/g, '');
        if (transformedInput != inputValue) {
          modelCtrl.$setViewValue(transformedInput);
          modelCtrl.$render();
        }

        return transformedInput;
      });
    }
  };
});

app.directive('focusMe', ['$timeout', '$parse', function($timeout, $parse) {
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
}]);

app.directive('starRating', ['$timeout', function($timeout) {
  return {
    restrict: 'EA',
    template: '<ul class="rating" ng-class="{readonly: readonly}">' +
      '  <li ng-repeat="star in stars" ng-class="star" ng-click="toggle($index)">' +
      '    <i class="fa fa-star"></i>' +
      '  </li>' +
      '</ul>',
    scope: {
      ratingValue: '=ngModel',
      max: '=?',
      onSelect: '&?',
      readonly: '=?'
    },
    link: function(scope, elem, attrs) {
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
      };
      scope.toggle = function(index) {
        if (scope.readonly === undefined || scope.readonly === false) {
          scope.ratingValue = index + 1;
          scope.onSelect({
            rating: index + 1
          });
        }
      };
      scope.$watch('ratingValue', function(oldVal, newVal) {
        updateStars();
      });
      updateStars();
    }
  };
}]);