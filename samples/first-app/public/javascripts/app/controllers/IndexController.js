vulpe.ng.app.controller('IndexController', ['$rootScope', '$scope', 'VulpeJS', function($rootScope, $scope, VulpeJS) {

  var vulpejs = new VulpeJS().init($scope);

  vulpejs.customers = [];

  vulpejs.http.get({
    url: '/customers/status/ACTIVE',
    callback: function(data) {
      vulpejs.customers = data.items;
      angular.forEach(vulpejs.customers, function(value) {
        value.photos = [];
        vulpejs.http.get({
          url: '/upload/' + value._id,
          callback: function(response) {
            value.photos = response.files;
          }
        });
      });
    }
  });
}]);