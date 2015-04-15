"use strict";
var debug = require('../debug');
var CronJob = require('cron').CronJob;

exports.startJobs = function(options) {
  if (options.jobs) {
    options.jobs.forEach(function(job) {
      if (!job.timeZone) {
        job.timeZone = 'America/Sao_Paulo';
      }
      if (!job.start) {
        job.start = false;
      }
      job.log = function(message) {
        debug.log('Job[' + job.name + ']', message);
      };
      job.error = function(message) {
        debug.error('Job[' + job.name + ']', message);
      };
      new CronJob({
        cronTime: job.cron,
        onTick: function() {
          job.command(job);
        },
        start: job.start,
        timeZone: job.timeZone
      }).start();
    });
  }
}