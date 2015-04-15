vulpejs.ng.app.controller('PasswordController', ['$rootScope', '$scope', '$http', '$timeout', '$messages', '$controller', 'AppManager', '$authenticator', '$filter', 'i18n', function($rootScope, $scope, $http, $timeout, $messages, $controller, AppManager, $authenticator, $filter, i18n) {

  var user = $authenticator.userDetails();

  var load = function() {
    return {
      _id: user.id,
      email: user.email,
      name: user.name,
      password: '',
      passwordConfirm: ''
    };
  };

  $scope.item = load();

  $scope.change = function() {
    if ($scope.form.$valid) {
      $messages.cleanAllMessages();
      $scope.item.user = user.id;
      $http.post('/password', $scope.item).success(function(data) {
        $messages.addSuccessMessage('Password successfully changed!');
        $scope.item = load();
        $timeout(function() {
          $('#password-password').focus();
        }, 100);
        $scope.submitted = false;
      }).error(function(data, status, header, config) {
        $messages.addErrorMessage('An error occurred in the execution.');
      });
    } else {
      $($scope.item.password.length === 0 ? '#password-password' : '#password-passwordConfirm').focus();
    }
  };

  $(document).ready(function() {
    $('#password-password').focus();
  });

}]);