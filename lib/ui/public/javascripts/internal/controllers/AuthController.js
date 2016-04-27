vulpe.ng.app.controller('AuthController', ['$rootScope', '$scope', 'VulpeJS', function($rootScope, $scope, VulpeJS) {
  var vulpejs = new VulpeJS().init($scope);

  vulpejs.on.ready(function() {
    var user = vulpejs.ui.get('auth-user').text();
    var query = vulpejs.ui.get('auth-query').text();
    var params = vulpejs.ui.get('auth-params').text();
    var redirect = vulpejs.ui.get('auth-redirect').text();
    vulpejs.$authenticator.login(JSON.parse(user));
    vulpejs.redirect(redirect);
  });

}]);