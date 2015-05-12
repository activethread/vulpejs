"use strict";

var loginSkip = ['/login', '/logout', '/sign-up', '/sign-up-confirm', '/reset-password', '/forgot-password', '/fonts', '/javascripts', '/stylesheets', '/images', '/i18n', '/language'];

/**
 * Response Error.
 * @param {Object}  res    Response
 * @param {Object}  error  Error
 */
exports.responseError = function(res, error) {
  vulpejs.debug.error('RESPONSE', error);
  res.status(500).json({
    error: error
  });
};

exports.responseSuccess = function(res) {
  res.status(201).end();
};

exports.responseValidate = function(res, validate) {
  vulpejs.debug.log(validate);
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
    var skipUri = vulpejs.app.root.context + loginSkip[i];
    if (skipUri === req.originalUrl || req.originalUrl.indexOf(skipUri) === 0) {
      skip = true;
      break;
    }
  }
  if (!req.isAuthenticated()) {
    if (!skip) {
      req.session['redirect-to'] = req.originalUrl;
      res.redirect(vulpejs.app.root.context + '/login');
      return;
    }
    next();
  } else {
    var roles = req.session['user-roles'];
    if (skip || !roles || roles.length === 0 || !vulpejs.app.security.routes || vulpejs.app.security.routes.length === 0) {
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
    var routes = vulpejs.app.security.routes.length;
    for (var i = 0; i < routes; ++i) {
      var route = vulpejs.app.security.routes[i];
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
  res.cookie('pagination', JSON.stringify(vulpejs.app.pagination));
  if (!options) {
    options = {
      app: {
        release: vulpejs.app.release,
        version: vulpejs.app.version
      }
    };
  } else if (!options.app) {
    options.app = {
      release: vulpejs.app.release,
      version: vulpejs.app.version
    };
  }
  if (!options.page) {
    options.page = {
      minifier: vulpejs.app.page.minifier
    };
  } else if (!options.page.minifier) {
    options.page.minifier = vulpejs.app.page.minifier;
  }
  res.render(name, options);
};

/**
 * Save object in database.
 * @param {Object} options {model, item, data, callback {success, error}}
 */
exports.doSave = function(options) {
  var History = vulpejs.mongoose.model('History');
  var Model = vulpejs.mongoose.model(options.model);
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
      vulpejs.utils.tryExecute(error ? vulpejs.app.callback.save.error : vulpejs.app.callback.save.success, {
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
          vulpejs.debug.error('ITEM-FIND', error);
          vulpejs.utils.tryExecute(options.callback.error);
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
              vulpejs.utils.copy(item, oldItem);
            }
            oldItem.save(function(error, obj) {
              callback(obj, error);
              if (error) {
                vulpejs.debug.error('ITEM-UPDATE', error);
                vulpejs.utils.tryExecute(options.callback.error);
              } else {
                vulpejs.utils.tryExecute(options.callback.success, obj);
              }
            });
          };
          if (options.history) {
            history.save(function(error, obj) {
              if (error) {
                vulpejs.debug.error('HISTORY-SAVE', error);
                vulpejs.utils.tryExecute(options.callback.error);
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
          vulpejs.debug.error('ITEM-SAVE', error);
          vulpejs.utils.tryExecute(options.callback.error);
        } else {
          vulpejs.utils.tryExecute(options.callback.success, obj);
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
        vulpejs.debug.error('VALIDATE-SAVE-ITEM', error);
        vulpejs.utils.tryExecute(options.callback.error);
      } else {
        if (total > 0) {
          vulpejs.utils.tryExecute(options.callback.validate, {
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
        if (!vulpejs.utils.tryExecute(options.callback, {
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
        exports.responseError(res, error);
      },
      validate: function(validate) {
        exports.responseValidate(res, validate);
      }
    }
  });
};

/**
 * Remove object from database by id and callback if success.
 * @param {Object} options {model, id, callback}
 */
exports.doRemove = function(options) {
  var Model = vulpejs.mongoose.model(options.model);
  var query = options.query;
  var callback = function(item, error) {
    vulpejs.utils.tryExecute(error ? vulpejs.app.callback.remove.error : vulpejs.app.callback.remove.success, {
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
        vulpejs.debug.error(error);
        vulpejs.utils.tryExecute(options.callback.error);
      } else {
        vulpejs.utils.tryExecute(options.callback.success, item);
      }
    });
  }
  if (options.validate && options.validate.exists && options.validate.exists.dependency) {
    var validateQuery = {
      server: options.item._id
    };
    // for (var i = 0, len = options.validate.exists.dependencies.length; i < leng; ++i) {
    //   vulpejs.mongoose.model(options.validate.exists[i]).count(query).exec(function(error, total) {
    //     if (error) {
    //       vulpejs.debug.error(error);
    //       vulpejs.utils.tryExecute(options.callback.error);
    //     } else {
    //       if (total > 0) {
    //         vulpejs.utils.tryExecute(options.callback.validate, {
    //           exists: true,
    //           total: total
    //         });
    //       } else {
    //         execute();
    //       }
    //     }
    //   });
    // }
    vulpejs.mongoose.model(options.validate.exists.dependency).count(validateQuery).exec(function(error, total) {
      if (error) {
        vulpejs.debug.error('VALIDATE-REMOVE-ITEM', error);
        vulpejs.utils.tryExecute(options.callback.error);
      } else {
        if (total > 0) {
          vulpejs.utils.tryExecute(options.callback.validate, {
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
        if (!vulpejs.utils.tryExecute(options.callback, {
            item: obj,
            res: res
          })) {
          res.json({
            item: obj
          });
        }
      },
      error: function(error) {
        exports.responseError(res, error);
      },
      validate: function(validate) {
        exports.responseValidate(res, validate);
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
  var Model = vulpejs.mongoose.model(req.params.model);
  var userId = req.session['user-id'];
  var callback = function(items, error) {
    vulpejs.utils.tryExecute(error ? vulpejs.app.callback.list.error : vulpejs.app.callback.list.success, {
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
      exports.responseError(res, error);
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
  var populate = req.params.populate || '';
  var orderBy = req.params.orderBy || {};
  var query = req.params.query || {};
  var page = req.params.page || 1;
  var userId = req.session['user-id'];
  var Model = vulpejs.mongoose.model(req.params.model);
  var callback = function(items, error) {
    vulpejs.utils.tryExecute(error ? vulpejs.app.callback.list.error : vulpejs.app.callback.list.success, {
      type: 'SELECT',
      model: req.params.model,
      message: error || 'page:' + page,
      items: items,
      user: userId
    });
  };
  Model.paginate(query, page, vulpejs.app.pagination.items, function(error, pageCount, items, itemCount) {
    callback(items, error);
    if (error) {
      vulpejs.debug.error('PAGE-ITEMS', error);
    } else {
      res.json({
        items: items,
        pageCount: pageCount,
        itemCount: itemCount
      });
    }
  }, {
    populate: populate,
    sortBy: orderBy
  });
};

/**
 * Retrive distinct list of objects from database.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.distinct = function(req, res) {
  var Model = vulpejs.mongoose.model(req.params.model);
  var query = req.params.query || {};
  Model.find(query).distinct(req.params.distinct, function(error, items) {
    if (error) {
      vulpejs.debug.error('DISTINCT', error);
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
  var Model = vulpejs.mongoose.model(req.params.model);
  var query = req.params.query || {};
  Model.find(query).distinct(req.params.distinct, function(error, items) {
    if (error) {
      vulpejs.debug.error('DISTINCT-ARRAY', error);
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
  var History = vulpejs.mongoose.model('History');
  History.paginate(query, page, vulpejs.app.pagination.history, function(error, pageCount, items, itemCount) {
    if (error) {
      vulpejs.debug.error('HISTORY', error);
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
  var Model = vulpejs.mongoose.model(req.params.model);
  var populate = req.params.populate || '';
  Model.findOne({
    _id: req.params.id
  }).populate(populate).exec(function(error, item) {
    if (error) {
      exports.responseError(res, error);
    } else if (item) {
      history({
        type: req.params.model,
        cid: item.id
      }, page, function(error, history) {
        if (error) {
          exports.responseError(res, error);
        } else {
          if (options && options.callback) {
            vulpejs.utils.tryExecute(options.callback, {
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
  var Model = vulpejs.mongoose.model(req.params.model);
  Model.aggregate(req.params.aggregate,
    function(err, results) {
      if (err) {
        vulpejs.debug.error('AGGREGATE', err);
      } else {
        if (options && options.callback) {
          vulpejs.utils.tryExecute(options.callback, results);
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
  var Model = vulpejs.mongoose.model(options.model);
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
          vulpejs.utils.tryExecute(options.callbackError, error);
        } else {
          res.json({
            error: error
          });
        }
      } else if (options && options.callback) {
        vulpejs.utils.tryExecute(options.callback, item);
      }
    });
  } else if (options.many) {
    Model.find(options.query).populate(options.populate).exec(function(error, items) {
      if (error) {
        res.status(500);
        if (options.callbackError) {
          vulpejs.utils.tryExecute(options.callbackError, error);
        } else {
          res.json({
            error: error
          });
        }
      } else if (options && options.callback) {
        vulpejs.utils.tryExecute(options.callback, items);
      }
    });
  }
};

/**
 * Find object/objects in database and execute callback without HTTP response.
 * @param {Object} options {model, object id, query, populate, callback}
 */
exports.doFind = function(options) {
  var Model = vulpejs.mongoose.model(options.model);
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
        vulpejs.debug.error('FIND-ONE', error);
      } else if (options && options.callback) {
        vulpejs.utils.tryExecute(options.callback, item);
      }
    });
  } else
  if (options.many) {
    if (!options.orderBy) {
      options.orderBy = {};
    }
    Model.find(options.query).populate(options.populate).sort(options.orderBy).exec(function(error, items) {
      if (error) {
        vulpejs.debug.error('FIND-MANY', error);
      } else if (options && options.callback) {
        vulpejs.utils.tryExecute(options.callback, items);
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
  var Model = vulpejs.mongoose.model(options.model);
  Model.findByIdAndUpdate(options.id, {
    $set: options.data
  }, function(error, item) {
    if (error) {
      exports.responseError(res, error);
      return;
    } else if (options && options.callback) {
      vulpejs.utils.tryExecute(options.callback, item);
    } else {
      exports.responseSuccess(res);
    }
  });
};

/**
 * Find histories of object in database.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.history = function(req, res) {
  var History = vulpejs.mongoose.model('History');
  History.find({
    type: req.params.model
  }).exec(function(error, items) {
    if (error) {
      exports.responseError(res, error);
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
  var Model = vulpejs.mongoose.model(req.params.model);
  var item = req.body;
  Model.findByIdAndUpdate(item.id, {
    $set: {
      status: item.status
    }
  }, function(error, item) {
    if (error) {
      exports.responseError(res, error);
    } else if (options && options.callback) {
      vulpejs.utils.tryExecute(options.callback, item);
    } else {
      exports.responseSuccess(res);
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
  vulpejs.passport.authenticate('local', function(error, user, info) {
    if (error) {
      vulpejs.utils.tryExecute(vulpejs.app.callback.login.error, {
        user: user,
        error: error
      });
      return next(error);
    }

    if (!user) {
      vulpejs.utils.tryExecute(vulpejs.app.callback.login.unauthorized, {
        user: user
      });
      return res.redirect(403, '/login');
    }

    req.logIn(user, function(error) {
      if (error) {
        vulpejs.utils.tryExecute(vulpejs.app.callback.login.error, {
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
      vulpejs.utils.tryExecute(vulpejs.app.callback.login.success, {
        user: user
      });
      user.hashed_password = '';
      user.salt = '';
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
  vulpejs.utils.tryExecute(vulpejs.app.callback.logout, {
    user: req.session['user-id']
  });
  delete req.session['user-id'];
  res.redirect(vulpejs.app.root.context + '/');
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
 * Make default routes.
 * @param   {Object} options {name, listName, model, remove:{executeBefore}, save:{data}, populate}
 * @returns {Object} Express router.
 */
exports.makeRoutes = function(options) {
  var router = vulpejs.express.router;
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
            vulpejs.debug.error('RENDER-VIEW', err);
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
          if (options.page.select && options.page.select.actions) {
            loadView(options.page.select.actions, function(html) {
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
exports.start = function(options) {
  var router = vulpejs.express.router;
  var path = require('path');

  if (vulpejs.app.security && vulpejs.app.security.login && vulpejs.app.security.login.skip) {
    vulpejs.app.security.login.skip.forEach(function(value) {
      loginSkip.push(value);
    });
  }

  var configuration = {
    directory: vulpejs.app.root.dir + '/locales/',
    extension: '.json',
    objectNotation: '.'
  };

  /**
   * Configure the express routes through which translations are served.
   * @param app
   * @param {Object} [configObject]
   */
  var configure = function(configObject) {
    if (typeof configObject !== 'undefined') {
      configuration.directory = configObject.directory || configuration.directory;
      configuration.extension = configObject.extension || configuration.extension;
      configuration.objectNotation = configObject.objectNotation || configuration.objectNotation;
    }

    // Register routes
    var uri = vulpejs.app.root.context + '/i18n/:locale';
    vulpejs.express.app.get(uri, i18nRoutes.i18n);
    vulpejs.express.app.get(uri + '/:phrase', i18nRoutes.translate);
  };

  /**
   * Middleware to allow retrieval of users locale in the template engine.
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   */
  var getLocale = function(request, response, next) {
    response.locals.i18n = {
      getLocale: function() {
        return vulpejs.i18n.getLocale.apply(request, arguments);
      }
    };

    // For backwards compatibility, also define 'acceptedLanguage'.
    response.locals.acceptedLanguage = response.locals.i18n.getLocale;

    if (typeof next !== 'undefined') {
      next();
    }
  };

  var i18nRoutes = {
    /**
     * Sends a translation file to the client.
     * @param request
     * @param response
     */
    i18n: function(request, response) {
      var locale = request.params.locale;
      var sendFile = response.sendFile || response.sendfile;
      sendFile.apply(response, [path.join(configuration.directory, locale + configuration.extension)]);
    },

    /**
     * Translate a given string and provide the result.
     * @param request
     * @param response
     */
    translate: function(request, response) {
      var locale = request.params.locale;
      var phrase = request.params.phrase;

      var result;
      if (request.query.plural) {
        var singular = phrase;
        var plural = request.query.plural;
        // Make sure the information is added to the catalog if it doesn't exist yet.
        var translated = vulpejs.i18n.__n({
          singular: singular,
          plural: plural,
          count: request.query.count,
          locale: locale
        });
        // Retrieve the translation object from the catalog and return it.
        var catalog = vulpejs.i18n.getCatalog(locale);
        result = singular.split(configuration.objectNotation).reduce(function(object, index) {
          return object[index];
        }, catalog);

      } else {
        result = vulpejs.i18n.__({
          phrase: phrase,
          locale: locale
        });
      }
      response.send(result);
    }
  };

  vulpejs.express.app.use(getLocale);
  configure();

  router.get('/global/debug/:enable', function(req, res) {
    vulpejs.app.debug = eval(req.params.enable);
    res.cookie('debug', vulpejs.app.debug);
    res.json({
      debug: vulpejs.app.debug
    });
  });
  var routes = [router, require(vulpejs.root.dir + '/routes/flow-uploader')];
  var routesDir = vulpejs.app.root.dir + '/routes/';
  var init = function() {
    // catch 404 and forward to error handler
    vulpejs.express.app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handlers
    vulpejs.express.app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      exports.render(res, 'error', {
        message: err.message,
        error: vulpejs.app.env === 'production' ? {} : err
      });
    });
  };
  var listModules = function(callback) {
    vulpejs.io.read.dir(routesDir, function(list) {
      var modules = [];
      list.forEach(function(name) {
        var stats = vulpejs.io.info.file(routesDir + name);
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
          vulpejs.express.app.use(value.route, require(value.path));
        } else {
          routes.push(require(routesDir + value));
        }
      });
      vulpejs.express.app.use('/', routes);
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
        vulpejs.express.app.use('/', routes);
        init();
      });
    }
  } else {
    listModules(function(modules) {
      modules.forEach(function(name) {
        routes.push(require(routesDir + name));
      });
      vulpejs.express.app.use('/', routes);
      init();
    });
  }
};