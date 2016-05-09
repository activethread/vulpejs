'use strict';

var router = vulpejs.express.router;

router.all('*', vulpejs.routes.auth.check);

router.get(['/', '/dashboard'], function(req, res) {
  vulpejs.routes.render(res, 'dashboard', {
    ui: {
      controller: 'Dashboard',
    },
  });
});

module.exports = router;
