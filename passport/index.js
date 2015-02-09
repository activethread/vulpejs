// I18N
var i18n = require('i18n');
// MOONGOOSE
var mongoose = require('mongoose');
// PASSPORT
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

module.exports = function(app) {
  passport.use(new LocalStrategy({
    passReqToCallback: true
  }, function(req, username, password, done) {
    var User = mongoose.model('User');
    User.findOne({
      email: username
    }, function(error, user) {
      if (error) {
        return done(error);
      }
      if (!user) {
        return done(null, false, {
          message: i18n.__('Incorrect username.')
        });
      }
      if (!user.authenticate(password)) {
        return done(null, false, {
          message: i18n.__('Incorrect password.')
        });
      }
      return done(null, user);
    });
  }));

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    var User = mongoose.model('User');
    User.findOne({
      _id: id
    }, function(error, user) {
      if (error) {
        return done(new Error(i18n.__('User ' + id + ' does not exist')));
      }
      return done(null, user);
    });
  });
  app.use(passport.initialize());
  app.use(passport.session());

  return passport;
}