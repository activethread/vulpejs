"use strict";
var utils = require('../utils');
var debug = require('../debug');
var http = require('http');
var fs = require('fs');
var dust = require('dustjs-linkedin');
var express = require('express');
var async = require('async');
var mongoose = require('mongoose');
var passport = require('passport');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var transport = nodemailer.createTransport(smtpTransport(global.app.smtp));

var appRenderOptions = {
  release: global.app.release,
  version: global.app.version
};

var defaultAppRenderOptions = {
  app: {
    release: global.app.release,
    version: global.app.version
  }
};

global.app.rootContext = global.app.rootContext || '';
var loginSkip = ['/login', '/logout', '/sign-up', '/sign-up-confirm', '/reset-password', '/forgot-password', '/fonts', '/javascripts', '/stylesheets', '/images', '/i18n', '/language'];
if (global.app.security && global.app.security.login && global.app.security.login.skip) {
  global.app.security.login.skip.forEach(function(value) {
    loginSkip.push(value);
  });
}

/**
 * Response Error.
 * @param {Object}  res    Response
 * @param {Object}  error  Error
 */
var responseError = function(res, error) {
  debug.error('RESPONSE', error);
  res.status(500).json({
    error: error
  });
};

var responseSuccess = function(res) {
  res.status(201).end();
};

var responseValidate = function(res, validate) {
  debug.log(validate);
  res.status(500).json({
    validate: validate
  });
};

/**
 * Check auth if user is authenticated.
 * @param {Object}  req  Request
 * @param {Object}  res  Response
 * @param {Boolean} next True if is autenticated and False if is not.
 */
exports.checkAuth = function(req, res, next) {
  var skip = false;
  for (var i = 0, len = loginSkip.length; i < len; ++i) {
    var skipUri = global.app.rootContext + loginSkip[i];
    if (skipUri === req.originalUrl || req.originalUrl.indexOf(skipUri) === 0) {
      skip = true;
      break;
    }
  }
  if (!req.isAuthenticated()) {
    if (!skip) {
      req.session['redirect-to'] = req.originalUrl;
      res.redirect(global.app.rootContext + '/login');
      return;
    }
    next();
  } else {
    var roles = req.session['user-roles'];
    if (skip || !roles || roles.length === 0 || !global.app.security.routes || global.app.security.routes.length === 0) {
      next();
      return;
    }
    var hasRouteRoles = function(route) {
      if (route === '') {
        return false;
      }
      var roleExists = !route.roles || route.roles.length === 0;
      if (!roleExists) {
        for (var i = 0, len = roles.length; i < len; ++i) {
          if (route.roles.indexOf(roles[i]) !== -1) {
            roleExists = true;
            break;
          }
        }
      }
      return roleExists;
    };
    var routeWildcard = '';
    var requestedRoute = '';
    var roleExists = false;
    var routeExists = false;
    var routes = global.app.security.routes.length;
    for (var i = 0; i < routes; ++i) {
      var route = global.app.security.routes[i];
      if (route.uri === '/**') {
        routeWildcard = route;
      } else if ((route.uri === '/' && req.originalUrl === route.uri) || (route.uri !== '/' && req.originalUrl.indexOf(route.uri) === 0)) {
        requestedRoute = route;
        break;
      }
    }
    if (((requestedRoute === '' && routeWildcard === '') || hasRouteRoles(requestedRoute)) || (routeWildcard !== '' && hasRouteRoles(routeWildcard))) {
      next();
    } else {
      res.status(403);
      exports.render(res, 'error', {
        error: {
          status: 403,
          message: 'Unauthorized'
        }
      });
    }
  }
};

exports.render = function(res, name, options) {
  if (!options) {
    options = exports.defaultAppRenderOptions;
  } else if (!options.app) {
    options.app = appRenderOptions;
  }
  if (!options.page) {
    options.page = {
      minifier: global.app.page.minifier
    };
  } else if (!options.page.minifier) {
    options.page.minifier = global.app.page.minifier;
  }
  res.render(name, options);
};

/**
 * Save object in database.
 * @param {Object} options {model, item, data, callback {success, error}}
 */
exports.doSave = function(options) {
  var History = mongoose.model('History');
  var Model = mongoose.model(options.model);
  var item = new Model(options.item);
  if (options.userId) {
    item.user = options.userId;
  }
  var execute = function() {
    if (typeof options.history === 'undefined') {
      options.history = true;
    }
    if (typeof options.callback === 'undefined') {
      options.callback = {};
    }
    var callback = function(item, error) {
      utils.tryExecute(error ? global.app.callback.save.error : global.app.callback.save.success, {
        type: options.item._id ? 'UPDATE' : 'INSERT',
        model: options.model,
        message: error || '',
        item: item,
        user: options.userId
      });
    };
    if (options.item._id) {
      Model.findOne({
        _id: item._id
      }, function(error, oldItem) {
        if (error) {
          debug.error('ITEM-FIND', error);
          utils.tryExecute(options.callback.error);
        } else {
          var content = JSON.stringify(oldItem);
          var history = new History({
            type: options.model,
            cid: oldItem.id,
            content: content,
            user: item.user
          });
          var save = function() {
            if (options && options.data) {
              if (Array.isArray(options.data)) {
                options.data.forEach(function(property) {
                  oldItem[property] = item[property];
                });
              } else if (typeof options.data === 'function') {
                options.data(oldItem, item);
              }
            } else {
              utils.copy(item, oldItem);
            }
            oldItem.save(function(error, obj) {
              callback(obj, error);
              if (error) {
                debug.error('ITEM-UPDATE', error);
                utils.tryExecute(options.callback.error);
              } else {
                utils.tryExecute(options.callback.success, obj);
              }
            });
          };
          if (options.history) {
            history.save(function(error, obj) {
              if (error) {
                debug.error('HISTORY-SAVE', error);
                utils.tryExecute(options.callback.error);
              } else {
                save();
              }
            });
          } else {
            save();
          }
        }
      });
    } else {
      item.save(function(error, obj) {
        callback(obj, error);
        if (error) {
          debug.error('ITEM-SAVE', error);
          utils.tryExecute(options.callback.error);
        } else {
          utils.tryExecute(options.callback.success, obj);
        }
      });
    }
  };
  if (options.validate && options.validate.exists) {
    var query = {};
    if (item._id) {
      query = {
        _id: {
          $ne: item._id
        }
      };
    }
    options.validate.exists.properties.forEach(function(property) {
      query[property] = item[property];
    });
    Model.count(query).exec(function(error, total) {
      if (error) {
        debug.error('VALIDATE-SAVE-ITEM', error);
        utils.tryExecute(options.callback.error);
      } else {
        if (total > 0) {
          utils.tryExecute(options.callback.validate, {
            exists: true,
            total: total
          });
        } else {
          execute();
        }
      }
    });
  } else {
    execute();
  }
};

/**
 * Save object in database.
 * @param {Object} req     Request
 * @param {Object} res     Response
 * @param {Object} options {model, data, callback}
 */
exports.save = function(req, res, options) {
  if (req.params.model) {
    options.model = req.params.model;
  }
  if (req.body) {
    options.item = req.body;
  }
  if (req.params.data) {
    options.data = req.params.data;
  }
  var userId = req.session['user-id'];
  exports.doSave({
    model: options.model,
    item: options.item,
    data: options.data,
    validate: options.validate || false,
    userId: userId,
    callback: {
      success: function(obj) {
        if (!utils.tryExecute(options.callback, {
            item: obj,
            postedItem: options.item,
            res: res
          })) {
          res.json({
            item: obj,
            postedItem: options.item
          });
        }
      },
      error: function(error) {
        responseError(res, error);
      },
      validate: function(validate) {
        responseValidate(res, validate);
      }
    }
  });
};

/**
 * Remove object from database by id and callback if success.
 * @param {Object} options {model, id, callback}
 */
exports.doRemove = function(options) {
  var Model = mongoose.model(options.model);
  var query = options.query;
  var callback = function(item, error) {
    utils.tryExecute(error ? global.app.callback.remove.error : global.app.callback.remove.success, {
      type: 'DELETE',
      model: options.model,
      message: error || '',
      item: item,
      user: options.userId
    });
  };
  var execute = function() {
    Model.remove(query, function(error, item) {
      callback(item, error);
      if (error) {
        debug.error(error);
        utils.tryExecute(options.callback.error);
      } else {
        utils.tryExecute(options.callback.success, item);
      }
    });
  }
  if (options.validate && options.validate.exists && options.validate.exists.dependency) {
    var validateQuery = {
      server: options.item._id
    };
    // for (var i = 0, len = options.validate.exists.dependencies.length; i < leng; ++i) {
    //   mongoose.model(options.validate.exists[i]).count(query).exec(function(error, total) {
    //     if (error) {
    //       debug.error(error);
    //       utils.tryExecute(options.callback.error);
    //     } else {
    //       if (total > 0) {
    //         utils.tryExecute(options.callback.validate, {
    //           exists: true,
    //           total: total
    //         });
    //       } else {
    //         execute();
    //       }
    //     }
    //   });
    // }
    mongoose.model(options.validate.exists.dependency).count(validateQuery).exec(function(error, total) {
      if (error) {
        debug.error('VALIDATE-REMOVE-ITEM', error);
        utils.tryExecute(options.callback.error);
      } else {
        if (total > 0) {
          utils.tryExecute(options.callback.validate, {
            exists: true,
            total: total
          });
        } else {
          execute();
        }
      }
    });
  } else {
    execute();
  }
};

/**
 * Remove object from database by id and callback if success.
 * @param {Object} req     Request
 * @param {Object} res     Response
 * @param {Object} options {model, id, callback}
 */
exports.remove = function(req, res, options) {
  if (!options) {
    options = {};
  }
  if (req.params.model) {
    options.model = req.params.model;
  }
  if (req.params.query) {
    options.query = req.params.query;
  }
  if (req.params.id) {
    options.query = {
      _id: req.params.id
    };
  }
  var userId = req.session['user-id'];
  exports.doRemove({
    model: options.model,
    item: {
      _id: req.params.id
    },
    query: options.query,
    validate: options.validate || false,
    userId: userId,
    callback: {
      success: function(obj) {
        if (!utils.tryExecute(options.callback, {
            item: obj,
            res: res
          })) {
          res.json({
            item: obj
          });
        }
      },
      error: function(error) {
        responseError(res, error);
      },
      validate: function(validate) {
        responseValidate(res, validate);
      }
    }
  });
};

/**
 * List from database.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.list = function(req, res) {
  var populate = req.params.populate;
  if (!populate) {
    populate = '';
  }
  var query = req.params.query || {};
  var Model = mongoose.model(req.params.model);
  var userId = req.session['user-id'];
  var callback = function(items, error) {
    utils.tryExecute(error ? global.app.callback.list.error : global.app.callback.list.success, {
      type: 'SELECT',
      model: req.params.model,
      message: error || '',
      items: items,
      user: userId
    });
  };
  Model.find(query).populate(populate).exec(function(error, items) {
    callback(items, error);
    if (error) {
      responseError(res, error);
    } else {
      res.json({
        items: items
      });
    }
  });
};

/**
 * Page list from database.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.page = function(req, res) {
  var populate = req.params.populate;
  if (!populate) {
    populate = '';
  }
  var query = req.params.query || {};
  var page = req.params.page || 1;
  var userId = req.session['user-id'];
  var Model = mongoose.model(req.params.model);
  var callback = function(items, error) {
    utils.tryExecute(error ? global.app.callback.list.error : global.app.callback.list.success, {
      type: 'SELECT',
      model: req.params.model,
      message: error || 'page:' + page,
      items: items,
      user: userId
    });
  };
  Model.paginate(query, page, global.app.pagination.items, function(error, pageCount, items, itemCount) {
    callback(items, error);
    if (error) {
      debug.error('PAGE-ITEMS', error);
    } else {
      res.json({
        items: items,
        pageCount: pageCount,
        itemCount: itemCount
      });
    }
  }, {
    populate: populate
  });
};

/**
 * Retrive distinct list of objects from database.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.distinct = function(req, res) {
  var Model = mongoose.model(req.params.model);
  var query = req.params.query || {};
  Model.find(query).distinct(req.params.distinct, function(error, items) {
    if (error) {
      debug.error('DISTINCT', error);
    } else {
      res.json({
        items: items
      });
    }
  });
};

/**
 * Retrieve distinct order array of objects from database.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.distinctArray = function(req, res) {
  var Model = mongoose.model(req.params.model);
  var query = req.params.query || {};
  Model.find(query).distinct(req.params.distinct, function(error, items) {
    if (error) {
      debug.error('DISTINCT-ARRAY', error);
    } else {
      items.sort(exports.compare);
      res.json(items);
    }
  });
};

/**
 * Find and page histories of object in database.
 * @param {Object}   query   Query
 * @param {Number}   page     Page
 * @param {Function} callback Callback function
 */
var history = function(query, page, callback) {
  var History = mongoose.model('History');
  History.paginate(query, page, global.app.pagination.history, function(error, pageCount, items, itemCount) {
    if (error) {
      debug.error('HISTORY', error);
    } else {
      callback(error, {
        items: items,
        pageCount: pageCount,
        itemCount: itemCount
      });
    }
  }, {
    sortBy: {
      version: -1
    }
  });
};

/**
 * Find object in database.
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Object} options {model, populate, callback}
 */
exports.find = function(req, res, options) {
  var page = req.params.page || 1;
  var Model = mongoose.model(req.params.model);
  var populate = req.params.populate || '';
  Model.findOne({
    _id: req.params.id
  }).populate(populate).exec(function(error, item) {
    if (error) {
      responseError(res, error);
    } else if (item) {
      history({
        type: req.params.model,
        cid: item.id
      }, page, function(error, history) {
        if (error) {
          responseError(res, error);
        } else {
          if (options && options.callback) {
            utils.tryExecute(options.callback, {
              item: item,
              res: res
            });
          } else {
            res.json({
              item: item,
              history: history
            });
          }
        }
      });
    } else {
      res.status(404).end();
    }
  });
};

/**
 * Aggregate object/objects in database an execute callback.
 * @param {Object} req     Request
 * @param {Object} res     Response
 * @param {Object} options {model, group, callback}
 */
exports.aggregate = function(req, res, options) {
  var Model = mongoose.model(req.params.model);
  Model.aggregate(req.params.aggregate,
    function(err, results) {
      if (err) {
        debug.error('AGGREGATE', err);
      } else {
        if (options && options.callback) {
          utils.tryExecute(options.callback, results);
        } else {
          res.json({
            items: results
          });
        }
      }
    });
};

/**
 * Find object/objects in database an execute callback.
 * @param {Object} req     Request
 * @param {Object} res     Response
 * @param {Object} options {model, id, callback}
 */
exports.findAndCallback = function(req, res, options) {
  if (req.params.model) {
    options.model = req.params.model;
  }
  if (req.params.id) {
    options.id = req.params.id;
  }
  var Model = mongoose.model(options.model);
  if (!options.query) {
    options.query = {
      _id: options.id
    };
  }
  if (!options.populate) {
    options.populate = '';
  }
  if (options.id) {
    options.one = true;
  }
  if (!options.one && !options.many) {
    options.one = true;
  }
  if (options.one) {
    Model.findOne(options.query).populate(options.populate).exec(function(error, item) {
      if (error) {
        res.status(500);
        if (options.callbackError) {
          utils.tryExecute(options.callbackError, error);
        } else {
          res.json({
            error: error
          });
        }
      } else if (options && options.callback) {
        utils.tryExecute(options.callback, item);
      }
    });
  } else if (options.many) {
    Model.find(options.query).populate(options.populate).exec(function(error, items) {
      if (error) {
        res.status(500);
        if (options.callbackError) {
          utils.tryExecute(options.callbackError, error);
        } else {
          res.json({
            error: error
          });
        }
      } else if (options && options.callback) {
        utils.tryExecute(options.callback, items);
      }
    });
  }
};

/**
 * Find object/objects in database and execute callback without HTTP response.
 * @param {Object} options {model, object id, query, populate, callback}
 */
exports.doFind = function(options) {
  var Model = mongoose.model(options.model);
  if (!options.populate) {
    options.populate = '';
  }
  if (options.id) {
    options.one = true;
    if (!options.query) {
      options.query = {
        _id: options.id
      };
    }
  } else if (!options.query) {
    options.query = {};
  }
  if (options.one) {
    Model.findOne(options.query).populate(options.populate).exec(function(error, item) {
      if (error) {
        debug.error('FIND-ONE', error);
      } else if (options && options.callback) {
        utils.tryExecute(options.callback, item);
      }
    });
  } else
  if (options.many) {
    if (!options.orderBy) {
      options.orderBy = {};
    }
    Model.find(options.query).populate(options.populate).sort(options.orderBy).exec(function(error, items) {
      if (error) {
        debug.error('FIND-MANY', error);
      } else if (options && options.callback) {
        utils.tryExecute(options.callback, items);
      }
    });
  }
};

/**
 * Find object by id and update.
 * @param {Object} req     Request
 * @param {Object} res     Response
 * @param {Object} options {model, id, data, callback}
 */
exports.findByIdAndUpdate = function(req, res, options) {
  if (req.params.model) {
    options.model = req.params.model;
  }
  if (req.params.id) {
    options.id = req.params.id;
  }
  if (req.params.data) {
    options.data = req.params.data;
  }
  var Model = mongoose.model(options.model);
  Model.findByIdAndUpdate(options.id, {
    $set: options.data
  }, function(error, item) {
    if (error) {
      responseError(res, error);
      return;
    } else if (options && options.callback) {
      utils.tryExecute(options.callback, item);
    } else {
      responseSuccess(res);
    }
  });
};

/**
 * Find histories of object in database.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.history = function(req, res) {
  var History = mongoose.model('History');
  History.find({
    type: req.params.model
  }).exec(function(error, items) {
    if (error) {
      responseError(res, error);
    } else {
      res.json({
        items: items
      });
    }
  });
};

/**
 * Change status of object in database.
 * @param {Object} req     Request
 * @param {Object} res     Response
 * @param {Object} options {model, callback}
 */
exports.status = function(req, res, options) {
  var Model = mongoose.model(req.params.model);
  var item = req.body;
  Model.findByIdAndUpdate(item.id, {
    $set: {
      status: item.status
    }
  }, function(error, item) {
    if (error) {
      responseError(res, error);
    } else if (options && options.callback) {
      utils.tryExecute(options.callback, item);
    } else {
      responseSuccess(res);
    }
  });
};

/**
 * Load Dust template and execute callback.
 * @param {Object} options {name, data, res, callback}
 */
exports.template = function(options) {
  dust.compile(fs.readFileSync(global.app.rootDir + '/templates/' + options.name, 'utf8'), options.name);
  dust.render(options.name, options.data, function(error, out) {
    if (error) {
      debug.error('Error on parse template ' + options.name + ': ' + error);
      if (options.res) {
        responseError(options.res, error);
      }
    } else {
      utils.tryExecute(options.callback, out);
    }
  });
};

/**
 * Send mail.
 * @param {Object} options {from, to, subject, html, res, callback}
 */
exports.sendmail = function(options) {
  transport.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html
  }, function(error, info) {
    if (error) {
      debug.error('Error on send mail \'' + options.subject + '\' to ' + options.to + ': ' + error, info);
      if (options.res) {
        responseError(options.res, error);
      }
    } else {
      utils.tryExecute(options.callback);
    }
  });
};

/**
 * Redirect to login.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.login = function(req, res) {
  if (req.user) {
    res.redirect('/');
  } else {
    exports.render(res, 'login', {
      page: {
        controller: 'Login',
        title: 'Access Control'
      }
    });
  }
};

/**
 * Executa login.
 * @param   {Object}   req  Request
 * @param   {Object}   res  Response
 * @param   {Function} next Next Function
 * @returns {Object}   User details.
 */
exports.doLogin = function(req, res, next) {
  passport.authenticate('local', function(error, user, info) {
    if (error) {
      utils.tryExecute(global.app.callback.login.error, {
        user: user,
        error: error
      });
      return next(error);
    }

    if (!user) {
      utils.tryExecute(global.app.callback.login.unauthorized, {
        user: user
      });
      return res.redirect(403, '/login');
    }

    req.logIn(user, function(error) {
      if (error) {
        utils.tryExecute(global.app.callback.login.error, {
          user: user,
          error: error
        });
        return next(error);
      }
      var post = req.body;
      if (post.rememberMe) {
        delete post.rememberMe;
        res.cookie('remember', post);
      } else {
        res.clearCookie('remember');
      }
      req.session['user-id'] = user._id;
      req.session['user-roles'] = user.roles;
      var url = req.session['redirect-to'] || '/';
      delete req.session['redirect-to'];
      utils.tryExecute(global.app.callback.login.success, {
        user: user
      });
      return res.json({
        user: user,
        redirectTo: url
      });
    });

  })(req, res, next);
};

/**
 * Execute logout.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.logout = function(req, res) {
  if (req.isAuthenticated()) {
    req.logout();
  }
  utils.tryExecute(global.app.callback.logout, {
    user: req.session['user-id']
  });
  delete req.session['user-id'];
  res.redirect(global.app.rootContext + '/');
};

/**
 * Change language.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.language = function(req, res) {
  res.cookie('appLanguage', req.params.language);
  res.redirect('/');
};

/**
 * Get HTML content from HTTP.
 * @param {Object}   options {}
 * @param {Function} callback Callback function
 */
exports.httpGet = function(options, callback) {
  http.get(options, function(res) {
    var html = "";
    res.on("data", function(chunk) {
      html += chunk.toString();
    });
    res.on('end', function() {
      utils.tryExecute(callback, html);
    });
  }).on('error', function(e) {
    debug.error("HTTP GET error: " + e.message);
  });
};

/**
 * Make default routes.
 * @param   {Object} options {name, listName, model, remove:{executeBefore}, save:{data}, populate}
 * @returns {Object} Express router.
 */
exports.makeRoutes = function(options) {
  var router = express.Router();
  // INIT OPTIONS
  if (!options.listName) {
    options.listName = options.name + 's';
  }
  if (!options.model) {
    options.model = options.name.substr(0, 1).toUpperCase() + options.name.substr(1);
  }
  if (!options.remove) {
    options.remove = {};
  }
  if (!options.remove.executeBefore) {
    options.remove.executeBefore = function(req, res, callback) {
      callback(req, res);
    };
  }
  router.get('/' + options.name, function(req, res) {
    if (options.page && options.page.controller && (typeof options.page.auto === 'undefined' || options.page.auto)) {
      var loadView = function(view, callback) {
        res.render(view, function(err, html) {
          if (err) {
            debug.error('RENDER-VIEW', err);
          } else {
            callback(html);
          }
        });
      };
      var render = function() {
        exports.render(res, 'auto', {
          page: options.page
        });
      };
      if (options.page.actions) {
        loadView(options.page.actions, function(html) {
          options.page.htmlActions = html;
          render();
        });
      } else if (options.page.main && options.page.main.actions) {
        loadView(options.page.main.actions, function(html) {
          options.page.main.htmlActions = html;
          if (options.page.items && options.page.items.actions) {
            loadView(options.page.items.actions, function(html) {
              options.page.items.htmlActions = html;
              if (options.page.items.viewActions) {
                loadView(options.page.items.viewActions, function(html) {
                  options.page.items.htmlViewActions = html;
                  render();
                });
              } else {
                render();
              }
            });
          } else {
            render();
          }
        });
      } else {
        render();
      }
    } else if (options.page) {
      exports.render(res, options.name, {
        page: options.page
      });
    } else {
      exports.render(res, options.name);
    }
  });
  // FIND
  router.get('/' + options.name + '/:id', function(req, res) {
    req.params.model = options.model;
    exports.find(req, res);
  });
  router.get('/' + options.name + '/populate/:id', function(req, res) {
    req.params.model = options.model;
    if (options.populate) {
      req.params.populate = options.populate;
    }
    var opts = {};
    if (options.find && options.find.populate) {
      opts = options.find.populate;
    }
    exports.find(req, res, opts);
  });
  // DELETE
  router.delete('/' + options.name + '/:id', function(req, res) {
    options.remove.executeBefore(req, res, function() {
      req.params.model = options.model;
      exports.remove(req, res, options.remove);
    });
  });
  // SAVE
  router.post('/' + options.name, function(req, res) {
    req.params.model = options.model;
    if (!options.save) {
      options.save = {};
    }
    exports.save(req, res, options.save);
  });
  // LIST
  var configListParams = function(req, status) {
    req.params.model = options.model;
    if (options.populate) {
      req.params.populate = options.populate;
    }
    if (options.list && options.list.query) {
      if (status) {
        options.list.query.status = req.params.status;
      }
      req.params.query = options.list.query;
    } else if (status) {
      req.params.query = {
        status: req.params.status
      };
    }
  };
  router.get('/' + options.listName, function(req, res) {
    configListParams(req);
    exports.list(req, res);
  });
  router.get('/' + options.listName + '/status/:status', function(req, res) {
    configListParams(req, true);
    exports.list(req, res);
  });
  router.get('/' + options.listName + '/query/:query', function(req, res) {
    req.params.model = options.model;
    req.params.query = JSON.parse(req.params.query);
    exports.list(req, res);
  });
  router.get('/' + options.listName + '/page/:page', function(req, res) {
    configListParams(req);
    exports.page(req, res);
  });
  router.get('/' + options.listName + '/status/:status/page/:page', function(req, res) {
    configListParams(req, true);
    exports.page(req, res);
  });
  // STATUS CHANGE
  router.post('/' + options.name + '/status', function(req, res) {
    req.params.model = options.model;
    exports.status(req, res);
  });

  return router;
};
exports.start = function(app, options) {
  var router = express.Router();
  router.get('/global/debug/:enable', function(req, res) {
    global.app.debug = eval(req.params.enable);
    res.cookie('debug', global.app.debug);
    res.json({
      debug: global.app.debug
    });
  });
  var routes = [router, require(global.app.rootDir + '/vulpejs/routes/flow-uploader')];
  var routesDir = global.app.rootDir + '/routes/';
  var init = function() {
    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handlers
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      exports.render(res, 'error', {
        message: err.message,
        error: global.app.env === 'production' ? {} : err
      });
    });
  };
  var listModules = function(callback) {
    fs.readdir(routesDir, function(err, list) {
      var modules = [];
      list.forEach(function(name) {
        var stats = fs.statSync(routesDir + name);
        if (stats.isFile() && name[0] !== '.') {
          modules.push(name.split('.')[0]);
        }
      });
      callback(modules);
    });
  };
  if (options.routes) {
    if (Array.isArray(options.routes)) {
      options.routes.forEach(function(value) {
        if (value.route && value.path) {
          app.use(value.route, require(value.path));
        } else {
          routes.push(require(routesDir + value));
        }
      });
      app.use('/', routes);
      init();
    } else if (options.routes.load && options.routes.load.first) {
      listModules(function(modules) {
        options.routes.load.first.forEach(function(name) {
          if (modules.indexOf(name) !== -1) {
            routes.push(require(routesDir + modules.splice(modules.indexOf(name), 1)));
          }
        });
        modules.forEach(function(name) {
          routes.push(require(routesDir + name));
        });
        app.use('/', routes);
        init();
      });
    }
  } else {
    listModules(function(modules) {
      modules.forEach(function(name) {
        routes.push(require(routesDir + name));
      });
      app.use('/', routes);
      init();
    });
  }
};