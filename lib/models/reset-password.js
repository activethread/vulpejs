'use strict';

/**
 * Create Reset Password Model
 * @param   {Object} mongoose Mongoose
 * @return {Object} Model
 */
module.exports = vulpejs.models.make({
  name: 'ResetPassword',
  schema: {
    email: {
      type: String,
      validate: [vulpejs.models.validatePresenceOf, vulpejs.i18n.__('Email is required')],
      index: {
        unique: true,
      },
    },
    date: {
      type: Date,
      'default': Date.now,
    },
  },
});