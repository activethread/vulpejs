"use strict";
// PASSPORT
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
  passReqToCallback: true
}, function(req, username, password, done) {
  var User = vulpejs.mongoose.model('User');
  User.findOne({
    email: username
  }, function(error, user) {
    if (error) {
      return done(error);
    }
    if (!user) {
      return done(null, false, {
        message: vulpejs.i18n.__('Incorrect username.')
      });
    }
    if (!user.authenticate(password)) {
      return done(null, false, {
        message: vulpejs.i18n.__('Incorrect password.')
      });
    }
    return done(null, user);
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  var User = vulpejs.mongoose.model('User');
  User.findOne({
    _id: id
  }, function(error, user) {
    if (error) {
      return done(new Error(vulpejs.i18n.__('User %s does not exist', id)));
    }
    return done(null, user);
  });
});
vulpejs.express.app.use(passport.initialize());
vulpejs.express.app.use(passport.session());

module.exports = passport;