vulpe.ng.app.controller('LoginController', ['$rootScope', '$scope', 'VulpeJS', function($rootScope, $scope, VulpeJS) {
  var vulpejs = new VulpeJS().init($scope);

  vulpejs.item = {
    username: '',
    password: '',
    rememberMe: false
  };

  vulpejs.$authenticator.logout();

  if (vulpejs.$store.get('remember')) {
    vulpejs.item = vulpejs.$store.get('remember');
  } else if (vulpejs.$cookies.remember) {
    vulpejs.item = JSON.parse(vulpejs.$cookies.remember.substring(2));
    vulpejs.item.rememberMe = true;
  }

  vulpejs.auth.login = function() {
    if ($scope.form.$valid) {
      vulpejs.message.clean();
      if (vulpejs.item.rememberMe) {
        vulpejs.$store.set('remember', vulpejs.item);
      } else {
        vulpejs.$store.remove('remember');
      }
      vulpejs.http.post({
        url: vulpe.ng.rootContext + '/login',
        data: vulpejs.item,
        callback: {
          success: function(data) {
            vulpejs.message.success('Successfully logged in!');
            vulpejs.$authenticator.login(data.user);
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
      $(!vulpejs.item.username ? '#login-username' : '#login-password').focus();
    }
  };

  vulpejs.auth.password = {
    forgot: function() {
      if (vulpejs.item.username && vulpejs.item.username.length > 0) {
        vulpejs.redirect(vulpe.ng.rootContext + '/forgot-password/' + vulpejs.item.username);
      } else {
        vulpejs.message.error('Please enter your e-mail password reset.');
        $('#login-username').focus();
      }
    }
  };

  vulpejs.on.ready(function() {
    $('#login').addClass('active');
  });

}]);