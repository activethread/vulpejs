'use strict';

exports.CronJob = require('cron').CronJob;

/**
 * Start jobs
 *
 * @param  {Object} options {jobs}
 * @return {}
 */
exports.start = function(options) {
  if (options.env && vulpejs.app.env !== options.env) {
    return;
  }
  if (options.jobs) {
    options.jobs.forEach(function(job) {
      if (!job.timeZone) {
        job.timeZone = 'America/Sao_Paulo';
      }
      if (!job.start) {
        job.start = false;
      }
      job.log = function(message) {
        vulpejs.log.debug('Job[' + job.name + ']', message);
      };
      job.error = function(message) {
        vulpejs.log.error('Job[' + job.name + ']', message);
      };
      new exports.CronJob({
        cronTime: job.cron,
        onTick: function() {
          job.command(job);
        },
        start: job.start,
        timeZone: job.timeZone,
      }).start();
    });
  }
};

/**
 * Init Schedules Module
 *
 * @return {}
 */
exports.init = function() {
  vulpejs.io.file.exists(root.dir + '/schedules/index.js', function(exists) {
    if (exists) {
      require(root.dir + '/schedules')
    };
  });
};