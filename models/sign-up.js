"use strict";

/**
 * Create Sign Up Model
 * @param   {Object} mongoose Mongoose
 * @return {Object} Model
 */
module.exports = vulpejs.models.make({
  name: 'SignUp',
  schema: {
    email: {
      type: String,
      validate: [vulpejs.models.validatePresenceOf, vulpejs.i18n.__('Email is required')],
      index: {
        unique: true
      }
    },
    userData: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      'default': Date.now
    },
    confirmDate: {
      type: Date
    }
  }
});