vulpe.ng.app.controller('LoginController', ['$rootScope', '$scope', 'VulpeJS', function($rootScope, $scope, VulpeJS) {
  var vulpejs = new VulpeJS().init($scope);

  $('#custom').html('');

  $scope.user = {
    username: '',
    password: '',
    rememberMe: false
  };

  vulpejs.$authenticator.logoutSuccessfully();

  if (vulpejs.$store.get('remember')) {
    $scope.user = vulpejs.$store.get('remember');
  } else if (vulpejs.$cookies.remember) {
    $scope.user = JSON.parse(vulpejs.$cookies.remember.substring(2));
    $scope.user.rememberMe = true;
  }

  vulpejs.login = function() {
    if ($scope.form.$valid) {
      vulpejs.message.clean();
      if ($scope.user.rememberMe) {
        vulpejs.$store.set('remember', $scope.user);
      } else {
        vulpejs.$store.remove('remember');
      }
      vulpejs.http.post({
        url: vulpe.ng.rootContext + '/login',
        data: $scope.user,
        callback: {
          success: function(data) {
            vulpejs.message.success('Successfully logged in!');
            vulpejs.$authenticator.loginSuccessfully(data.user);
            vulpejs.redirect(data.redirectTo);
          },
          error: function(data, status, header, config) {
            if (status === 403) {
              vulpejs.message.error('Informed credential is invalid.');
            } else {
              vulpejs.message.error('An error occurred in the execution.');
            }
          }
        }
      });
    } else {
      $(!$scope.user.username ? '#login-username' : '#login-password').focus();
    }
  };

  vulpejs.forgotPassword = function() {
    if ($scope.user.username && $scope.user.username.length > 0) {
      vulpejs.redirect(vulpe.ng.rootContext + '/forgot-password/' + $scope.user.username);
    } else {
      vulpejs.message.error('Please enter your e-mail password reset.');
      $('#loginUsername').focus();
    }
  };
  vulpejs.on.ready(function() {
    $('#login').addClass('active');
  });

}]);
