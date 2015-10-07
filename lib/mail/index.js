"use strict";

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

/**
 * Send mail.
 * @param {Object} options {from, to, subject, html, res, callback}
 */
exports.send = function(options) {
  vulpejs.smtp.transport.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html
  }, function(error, info) {
    if (error) {
      vulpejs.log.error('Error on send mail \'' + options.subject + '\' to ' + options.to + ': ' + error, info);
      if (options.res) {
        vulpejs.routes.response.error(options.res, error);
      }
    } else {
      vulpejs.utils.execute(options.callback);
    }
  });
};

/**
 * Init Mail Module
 *
 * @return {}
 */
exports.init = function() {
  vulpejs.smtp = {
    transport: nodemailer.createTransport(smtpTransport(vulpejs.app.smtp))
  };
};