"use strict";

var multipart = require('connect-multiparty');
var router = vulpejs.express.router;
var flow = require(vulpejs.root.dir + '/uploader/flow.js')(vulpejs.app.upload.files);

var ACCESS_CONTROLL_ALLOW_ORIGIN = vulpejs.app.cors.enabled;

router.post('/flow/upload', multipart({
  uploadDir: vulpejs.app.upload.tmp
}), function(req, res) {
  flow.post(req, function(status, filename, original_filename, identifier) {
    if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
      res.header("Access-Control-Allow-Origin", "*");
    }
    res.status(status).send();
  });
});

router.options('/flow/upload', function(req, res) {
  if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.status(200).send();
});

router.get('/flow/upload', function(req, res) {
  flow.get(req, function(status, filename, original_filename, identifier) {
    if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
      res.header("Access-Control-Allow-Origin", "*");
    }

    if (status === 'found') {
      status = 200;
    } else {
      status = 404;
    }

    res.status(status).send();
  });
});

router.get('/flow/download/:identifier', function(req, res) {
  res.setHeader('Content-Disposition', 'attachment;');
  flow.write(req.params.identifier, res);
});

router.get('/flow/download/:identifier/:name', function(req, res) {
  res.setHeader('Content-Disposition', 'attachment; filename="' + req.params.name + '"');
  flow.write(req.params.identifier, res);
});

module.exports = router;