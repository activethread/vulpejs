"use strict";
var models = require(global.app.rootDir + '/vulpejs/models');

/**
 * Create Security Model
 * @param   {Object} mongoose Mongoose
 * @returns {Object} Model
 */
module.exports = function(mongoose) {
  return models.getModel({
    name: 'Secutiry',
    schema: {
      url: {
        type: String,
        required: true
      },
      roles: [{
        name: {
          type: String,
          required: true
        }
      }],
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  });
};