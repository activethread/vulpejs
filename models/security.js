"use strict";

/**
 * Create Security Model
 * @param   {Object} mongoose Mongoose
 * @returns {Object} Model
 */
module.exports = function() {
  return vulpejs.models.make({
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
        type: vulpejs.mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  });
};