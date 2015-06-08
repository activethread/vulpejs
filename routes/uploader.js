"use strict";

var fs = require('fs');
var uploader = require(root.vulpejs.dir + '/uploader')({
  tmpDir: root.dir + '/public/uploaded/tmp',
  publicDir: root.dir + '/public/uploaded',
  uploadDir: root.dir + '/public/uploaded/files',
  uploadUrl: '/uploaded/files/',
  downloadUrl: '/download/files/',
  maxPostSize: 11000000000, // 11 GB
  minFileSize: 1,
  maxFileSize: 10000000000, // 10 GB
  acceptFileTypes: /.+/i,
  copyImgAsThumb: true,
  // Files not matched by this regular expression force a download dialog,
  // to prevent executing any scripts in the context of the service domain:
  inlineFileTypes: /\.(gif|jpe?g|png)$/i,
  imageTypes: /\.(gif|jpe?g|png)$/i,
  imageVersions: {
    maxWidth: 80,
    maxHeight: 80
  },
  accessControl: {
    allowOrigin: '*',
    allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
    allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
  },
  nodeStatic: {
    cache: 3600 // seconds to cache served files
  }
});

/**
 * Uploader Module
 *
 * @param  {Router} router
 * @return {} Express route
 */
module.exports = function(router) {

  router.get('/upload', function(req, res) {
    uploader.get(req, res, function(obj) {
      res.json(obj);
    });
  });

  router.post('/upload', function(req, res) {
    uploader.post(req, res, function(obj) {
      res.json(obj);
    });
  });

  router.delete('/uploaded/files/:name', function(req, res) {
    uploader.delete(req, res, function(obj) {
      res.json(obj);
    });
  });

  return router;
};