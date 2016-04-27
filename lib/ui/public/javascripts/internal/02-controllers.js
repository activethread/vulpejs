'use strict';

/* Controllers */
angular.module('app.controllers', ['app.directives', 'app.filters', 'app.services', 'angular-loading-bar', 'ui.utils', 'ui.utils.masks', 'timer', 'angularUtils.directives.dirPagination'])
  .controller('MessagesController', ['$rootScope', '$scope', '$http', '$timeout', '$messages', 'i18n', function($rootScope, $scope, $http, $timeout, $messages, i18n) {
    $scope.messages = [];
    $scope.interval = {};

    $scope.close = function(index) {
      $scope.messages.splice(index, 1);
    };

    $scope.$on('vulpejs-messages', function() {
      $scope.messages.push({
        type: $messages.type,
        msg: i18n.__($messages.message)
      });
      $(document).scrollTop(0);
      $scope.interval = $timeout(function() {
        $scope.close($scope.messages.length - 1);
      }, 5000);
    });
    $scope.$on('vulpejs-messages-clean', function() {
      $scope.messages = [];
      $timeout.cancel($scope.interval);
    });
  }]).controller('LogoutController', ['$rootScope', '$scope', '$http', '$timeout', '$cookieStore', '$window', function($rootScope, $scope, $http, $timeout, $cookieStore, $window) {

    $scope.logout = function() {
      $window.location = '/logout';
    };

  }]);
