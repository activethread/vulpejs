vulpe.ng.app.controller('DashboardController', ['$rootScope', '$scope', 'VulpeJS', function($rootScope, $scope, VulpeJS) {

  var vulpejs = new VulpeJS().init($scope);
  vulpejs.on.ready(function() {
    vulpejs.ui.active('dashboard');
  });

}]);