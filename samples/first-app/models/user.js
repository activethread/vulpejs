'use strict';

/**
 * User Model
 *
 * @param   {Object} mongoose Mongoose
 * @return {Object} Model
 */
var User = vulpejs.models.schema({
  name: 'User',
  schema: {
    email: {
      type: String,
      validate: [vulpejs.models.validatePresenceOf, vulpejs.i18n.__('Email is required')],
      index: {
        unique: true
      }
    },
    hashedPassword: String,
    salt: String,
    name: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      'default': Date.now
    },
    roles: [{
      type: String,
      enum: ['NORMAL', 'ADMIN', 'SUPER']
    }],
    status: {
      type: String,
      required: true,
      'default': 'ACTIVE',
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED']
    },
    modified: {
      type: Date,
      'default': Date.now
    }
  }
});

User.virtual('id').get(function() {
  return this._id.toHexString();
});

User.virtual('password').set(function(password) {
  this._password = password;
  this.salt = this.makeSalt();
  this.hashedPassword = this.encryptPassword(password);
}).get(function() {
  return this._password;
});

User.method('authenticate', function(plainText) {
  return this.encryptPassword(plainText) === this.hashedPassword;
});

User.method('makeSalt', function() {
  return Math.round((new Date().valueOf() * Math.random())) + '';
});

User.method('encryptPassword', function(password) {
  return vulpejs.crypto.createHmac('sha1', this.salt).update(password).digest('hex');
});

User.pre('save', function(next) {
  if (!this._id && !vulpejs.models.validatePresenceOf(this.password)) {
    next(new Error(vulpejs.i18n.__('Invalid password')));
  } else {
    next();
  }
});

var UserModel = vulpejs.models.set('User', User);
UserModel.find({}, function(error, items) {
  if (items.length === 0) {
    var user = new UserModel({
      email: 'admin@vulpe.org',
      password: 'vulpejs',
      name: 'Super Administrator',
      roles: ['SUPER']
    });
    user.save(function(error, user) {});
  }
});

module.exports = UserModel;