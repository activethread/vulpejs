vulpe.ng.app.controller('UserController', ['$rootScope', '$scope', 'VulpeJS', function($rootScope, $scope, VulpeJS) {
  var vulpejs = new VulpeJS({
    name: 'user',
    predicate: 'name',
    focus: {
      create: 'email',
      edit: 'name'
    },
    messages: {
      validate: {
        save: {
          exists: 'User name already exists.'
        },
        remove: {
          exists: 'This user is still being used and can not be deleted.'
        }
      }
    },
    model: {
      email: '',
      name: '',
      password: '',
      roles: ['NORMAL']
    },
    actions: {
      findAfter: function(vulpejs) {
        vulpejs.item.password = '';
        vulpejs.item.passwordConfirm = '';
      }
    }
  }).init($scope);
}]);