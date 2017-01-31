vulpe.ng.app.controller('PasswordController', ['$rootScope', '$scope', 'VulpeJS', function ($rootScope, $scope, VulpeJS) {
  var vulpejs = new VulpeJS().init($scope);
  var user = vulpejs.auth.user;

  var load = function () {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      password: '',
      passwordConfirm: ''
    };
  };

  vulpejs.model.item = load();

  vulpejs.change = function () {
    if ($scope.form.$valid) {
      vulpejs.message.clean();
      vulpejs.item.user = user.id;
      vulpejs.http.post({
        url: '/password',
        data: vulpejs.item,
        callback: {
          success: function (data) {
            vulpejs.message.success('Password successfully changed!');
            vulpejs.item.item = load();
            $timeout(function () {
              $('#password-password').focus();
            }, 100);
            vulpejs.ui.form.main.submitted = false;
          },
          error: function (data, status, header, config) {
            vulpejs.message.error('An error occurred in the execution.');
          }
        }
      });
    } else {
      $(vulpejs.item.password.length === 0 ? '#password-password' : '#password-passwordConfirm').focus();
    }
  };
  vulpejs.on.ready(function () {
    $('#password-password').focus();
  });

}]);