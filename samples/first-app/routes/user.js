"use strict";

var router = vulpejs.routes.make({
  name: 'user',
  save: {
    data: function(item) {
      return {
        type: item.type,
        identification: item.identification,
        name: item.name,
        addresses: item.addresses,
        phones: item.phones
      };
    }
  },
  ui: {
    controller: 'User',
    main: {
      title: 'User',
      inputs: [{
        type: 'email',
        name: 'email',
        label: 'Email',
        readonly: 'item._id',
        required: true
      }, {
        type: 'text',
        name: 'name',
        label: 'Name',
        capitalize: true,
        required: true
      }, {
        type: 'password',
        name: 'password',
        label: 'Password',
        readonly: 'item.email ===  userDetails.email',
        requiredIf: '!item._id'
      }, {
        type: 'password',
        name: 'passwordConfirm',
        label: 'Password Confirm',
        readonly: 'item.email ===  userDetails.email',
        requiredIf: '!item._id',
        validate: "'$value == item.password'",
        validateWatch: "'item.password'",
        validateMessage: 'Password do not match'
      }]
    },
    select: {
      title: 'User List',
      filter: {
        search: {
          colspan: 1
        },
        status: {
          colspan: 2,
          items: [{
            value: 'ACTIVE',
            label: 'Active'
          }, {
            value: 'INACTIVE',
            label: 'Inactive'
          }, {
            value: 'SUSPENDED',
            label: 'Suspended'
          }]
        }
      },
      detail: [{
        name: 'email',
        label: 'Email',
        width: '40%'
      }, {
        name: 'managerType',
        i18n: true,
        label: 'Type',
        width: '20%'
      }],
      items: [{
        name: 'name',
        label: 'Name',
        width: '65%'
      }, {
        name: 'status',
        className: 'text-center',
        images: [{
          name: 'status-online.png',
          showIf: "vulpejs.vulpejs.equals(item, 'status', 'ACTIVE')",
          title: 'Active'
        }, {
          name: 'status-offline.png',
          showIf: "vulpejs.vulpejs.equals(item, 'status', 'INACTIVE')",
          title: 'Inactive'
        }],
        label: 'Status',
        width: '10%'
      }, {
        label: 'Actions',
        width: '25%'
      }],
      actions: [{
        className: 'divider',
        show: "vulpejs.hasRoles(['SUPER']) && vulpejs.equals(item, 'status', 'ACTIVE')"
      }, {
        show: "vulpejs.hasRoles(['SUPER']) && vulpejs.equals(item, 'status', 'ACTIVE') && item.managerType === 'ADMIN'",
        link: {
          click: "vulpejs.managerType(item._id, 'SUPER')",
          icon: 'fa-slack',
          label: 'Make super'
        }
      }, {
        show: "vulpejs.hasRoles(['SUPER']) && vulpejs.equals(item, 'status', 'ACTIVE') && item.managerType === 'SUPER'",
        link: {
          click: "vulpejs.managerType(item._id, 'SUPER')",
          icon: 'fa-user',
          label: 'Make admin'
        }
      }]
    }
  }
});

// USER
router.get('/users', function(req, res) {
  req.params.model = 'User';
  req.params.filter = '{"managerType" : "ADMIN"}';
  if (req.param('status')) {
    req.params.filter = '{"status": "' + req.param('status') + '", "managerType" : "ADMIN"}';
  }
  vulpejs.routes.list(req, res);
});
router.post('/user/type', function(req, res) {
  vulpejs.routes.findByIdAndUpdate(req, res, {
    id: req.body.id,
    model: 'User',
    data: {
      role: req.body.role
    }
  });
});
router.get('/password', function(req, res) {
  vulpejs.routes.render(res, 'auto', {
    ui: {
      controller: 'Password',
      title: 'Password Change',
      form: {
        submit: 'vulpejs.change()'
      },
      inputs: [{
        type: 'email',
        name: 'email',
        label: 'Email',
        readonly: 'vulpejs.item._id'
      }, {
        type: 'text',
        name: 'name',
        label: 'Name',
        readonly: 'vulpejs.item._id',
        capitalize: true
      }, {
        type: 'password',
        name: 'password',
        label: 'Password',
        required: true
      }, {
        type: 'password',
        name: 'passwordConfirm',
        label: 'Password Confirm',
        required: true,
        validate: {
          expression: "'$value == item.password'",
          watch: "'vulpejs.item.password'",
          message: 'Password do not match'
        }
      }]
    }
  });
});
router.post('/password', function(req, res) {
  vulpejs.routes.findAndCallback(req, res, {
    model: 'User',
    id: req.body._id,
    callback: function(item) {
      item.password = req.body.password;
      item.save();
      res.status(201).end();
    }
  });
});

module.exports = router;