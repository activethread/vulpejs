'use strict';

// PASSPORT
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var JwtStrategy = require('passport-jwt').Strategy;

/**
 * Express Passport submodule
 *
 * @param  {Express} app
 * @return {Passport}
 */
module.exports = function(app) {
  if (!vulpejs.app.models.ignore) {
    passport.use(new LocalStrategy({
      passReqToCallback: true,
    }, function(req, username, password, done) {
      var User = vulpejs.models.get('User');
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

    /*
    Options
        var opts = {
          secretOrKey: vulpejs.app.security.auth.jwt.secret,
          issuer: 'accounts.vulpe.org',
          audience: 'vulpe.org',
        };
    */

    var opts = {
      secretOrKey: vulpejs.app.security.auth.jwt.secret,
    };
    passport.use(new JwtStrategy(opts, function(payload, done) {
      var User = vulpejs.models.get('User');
      User.findOne({
        email: payload.email
      }, function(error, user) {
        if (error) {
          return done(error, false);
        }
        if (user) {
          done(null, user);
        } else {
          done(null, false, {
            message: vulpejs.i18n.__('Incorrect username.')
          });
        }
      });
    }));

    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      var User = vulpejs.models.get('User');
      User.findOne({
        _id: id
      }, function(error, user) {
        if (error) {
          return done(new Error(vulpejs.i18n.__('User %s does not exist', id)));
        }
        return done(null, user);
      });
    });
    app.use(passport.initialize());
    app.use(passport.session());
  }
  return passport;
};