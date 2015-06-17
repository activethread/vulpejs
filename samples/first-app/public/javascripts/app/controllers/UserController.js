vulpe.ng.app.controller('UserController', ['$rootScope', '$scope', 'VulpeJS', function($rootScope, $scope, VulpeJS) {
  var vulpejs = new VulpeJS({
    name: 'user',
    predicate: 'name',
    focus: {
      create: 'name',
      edit: 'email'
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
      birth: '',
      password: '',
      roles: ['NORMAL'],
      rememberMe: false
    },
    actions: {
      findAfter: function(vulpejs) {
        vulpejs.item.password = '';
        vulpejs.item.passwordConfirm = '';
        vulpejs.item.birth = vulpejs.filter.date(vulpejs.item.birth, "dd/MM/yyyy");
      },
      saveBefore: function(vulpejs) {
        vulpejs.item.birth = moment(vulpejs.item.birth, 'DD/MM/YYYY');
      }
    }
  }).init($scope);

  vulpejs.managerType = function(id, roles) {
    vulpejs.message.clean();
    vulpejs.http.post({
      url: '/user/type/',
      data: {
        id: id,
        roles: roles
      },
      callback: {
        success: function() {
          vulpejs.message.success('Type successfully changed!');
          vulpejs.$timeout(function() {
            vulpejs.model.list();
            vulpejs.ui.focus();
          }, 100);
        },
        error: function(data, status, header, config) {
          vulpejs.message.error('Operation successfully executed!');
        }
      }
    });
  };
}]);