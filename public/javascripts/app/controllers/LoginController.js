vulpejs.ng.app.controller('LoginController', ['$rootScope', '$scope', '$http', '$timeout', '$messages', '$authenticator', '$window', '$cookies', '$store', function($rootScope, $scope, $http, $timeout, $messages, $authenticator, $window, $cookies, $store) {

  $('#custom').html('');

  $scope.user = {
    username: '',
    password: '',
    rememberMe: false
  };

  $authenticator.logoutSuccessfully();

  if ($store.get('remember')) {
    $scope.user = $store.get('remember');
  } else if ($cookies.remember) {
    $scope.user = JSON.parse($cookies.remember.substring(2));
    $scope.user.rememberMe = true;
  }

  $scope.login = function() {
    if ($scope.form.$valid) {
      $messages.cleanAllMessages();
      if ($scope.user.rememberMe) {
        $store.set('remember', $scope.user);
      } else {
        $store.remove('remember');
      }
      $http.post(vulpejs.ng.rootContext + '/login', $scope.user).success(function(data) {
        $messages.addSuccessMessage('Successfully logged in!');
        $authenticator.loginSuccessfully(data.user);
        $window.location = data.redirectTo;
      }).error(function(data, status, header, config) {
        if (status === 403) {
          $messages.addErrorMessage('Informed credential is invalid.');
        } else {
          $messages.addErrorMessage('An error occurred in the execution.');
        }
      });
    } else {
      $($scope.user.username.length === 0 ? '#loginUsername' : '#loginPassword').focus();
    }
  };

  $scope.forgotPassword = function() {
    if ($scope.user.username && $scope.user.username.length > 0) {
      $window.location = vulpejs.ng.rootContext + '/forgot-password/' + $scope.user.username;
    } else {
      $messages.addErrorMessage('Please enter your e-mail password reset.');
      $('#loginUsername').focus();
    }
  };

  $(document).ready(function() {
    $('#login').addClass('active');
  });

}]);
