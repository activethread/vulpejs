vulpe.ng.controller({
  name: 'User',
  service: {
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
  }
});
