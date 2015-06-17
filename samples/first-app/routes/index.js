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

module.exports = router;