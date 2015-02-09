"use strict";
var moment = require('moment');
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
        console.log('Job[' + job.name + '][' + moment().format("DD-MM-YYYY HH:mm:ss") + '] ' + message);
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