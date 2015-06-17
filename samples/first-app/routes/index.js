"use strict";

var router = vulpejs.express.router;

router.all('*', vulpejs.routes.auth.check);

router.get('/', function(req, res) {
  vulpejs.routes.render(res, 'index', {
    ui: {
      controller: 'Index'
    }
  });
});

router.get('/dashboard', function(req, res) {
  vulpejs.routes.render(res, 'dashboard', {
    ui: {
      controller: 'Dashboard'
    }
  });
});

// HISTORY
router.get('/histories', function(req, res) {
  req.params.model = 'History';
  vulpejs.routes.list(req, res);
});

// SETTINGS
router.get('/settings', function(req, res) {
  vulpejs.routes.render(res, 'settings', {
    ui: {
      controller: 'Settings'
    }
  });
});

// LOGIN
router.get('/login', vulpejs.routes.login);
router.post('/login', vulpejs.routes.doLogin);
router.get('/logout', vulpejs.routes.logout);

// MY DATA
router.get('/my-data', function(req, res) {
  vulpejs.routes.render(res, 'my-data', {
    ui: {
      controller: 'MyData'
    }
  });
});

// MY SERVICES
router.get('/my-services', function(req, res) {
  vulpejs.routes.render(res, 'my-services', {
    ui: {
      controller: 'MyServices'
    }
  });
});

module.exports = router;