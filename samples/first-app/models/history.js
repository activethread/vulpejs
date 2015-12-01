'use strict';

/**
 * History Model
 * 
 * @return {Object} Model
 */
module.exports = vulpejs.models.make({
  name: 'History',
  schema: {
    type: {
      type: String,
      required: true
    },
    cid: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    modified: {
      type: Date,
      'default': Date.now
    },
    user: {
      type: vulpejs.mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
});