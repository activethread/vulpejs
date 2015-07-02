vulpejs.ng.app.controller('ResetPasswordController', ['$rootScope', '$scope', 'VulpeJS', function($rootScope, $scope, VulpeJS) {

  var vulpejs = new VulpeJS().init($scope);

  vulpejs.changed = false;
  vulpejs.error = false;

  vulpejs.item = {
    id: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  vulpejs.reset = function() {
    if ($scope.form.$valid) {
      var item = vulpejs.item;
      vulpejs.message.clean();
      vulpejs.http.post({
        url: '/reset-password',
        data: {
          id: item.id,
          email: item.email,
          password: item.password
        },
        callback: {
          success: function() {
            vulpejs.changed = true;
          },
          error: function(data, status, header, config) {
            vulpejs.error = true;
          }
        }
      });
    } else {
      $(!vulpejs.item.password ? "#user-password" : "#user-password-confirm").focus();
    }
  };

  vulpejs.on.ready(function() {
    vulpejs.item.id = $("#token").val();
    vulpejs.item.email = $("#email").val();
  });

}]);