'use strict';

exports.multipart = require('connect-multiparty');

var loginSkip = ['/login', '/logout', '/sign-up', '/sign-up-confirm',
  '/reset-password', '/forgot-password', '/fonts', '/javascripts',
  '/stylesheets', '/images', '/i18n', '/language',
];

var helper = {
  controller: {
    make: function(options) {
      if (vulpejs.utils.isObject(options.ui.controller)) {
        var code = 'vulpe.ng.controller(' + vulpejs.utils.to.text(options.ui.controller) + ');';
        if (vulpejs.app.minifier[vulpejs.app.env]) {
          vulpejs.utils.js.obfuscate(code, {
            success: function(obfuscated) {
              vulpejs.app.javascripts.push(obfuscated);
            },
            error: function(error) {
              vulpejs.app.javascripts.push(code);
            },
          });
        } else {
          vulpejs.app.javascripts.push(code);
        }
      }
    }
  }
};

exports.map = [];

exports.response = {
  error: function(options, error) {
    vulpejs.log.error(options.operation || 'RESPONSE-ERROR', error);
    options.res.status(500).json({
      error: error,
    });
  },
  data: function(options, status, data) {
    vulpejs.log.debug(options.operation || 'RESPONSE-DATA', {
      status: status,
      data: data,
    });
    options.res.status(status || 201).json(data);
  },
  success: function(options) {
    vulpejs.log.debug(options.operation || 'RESPONSE-SUCCESS');
    options.res.status(201).end();
  },
  validate: function(options, validate) {
    vulpejs.log.debug(options.operation || 'RESPONSE-VALIDATE', validate);
    options.res.status(500).json({
      validate: validate,
    });
  },
};

exports.auth = {
  /**
   * Check if user is authenticated.
   * @param {Object}  req  Request
   * @param {Object}  res  Response
   * @param {Boolean} next Call next if is autenticated.
   */
  check: function(req, res, next) {
    if (vulpejs.app.security.ignore) {
      exports.auth.checkAfter(req, res, next);
      return;
    }
    if (!req.cookies.appLanguage || req.cookies.appLanguage === 'undefined') {
      res.cookie('appLanguage', 'pt');
    }
    var skip = false;
    for (var i = 0, len = loginSkip.length; i < len; ++i) {
      var skipUri = vulpejs.app.root.context + loginSkip[i];
      if (skipUri === req.originalUrl || (skipUri !== '/' && req.originalUrl.indexOf(skipUri) === 0)) {
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
      exports.auth.checkAfter(req, res, next);
    } else {
      var roles = req.session['user-roles'];
      if (skip || !roles || roles.length === 0 || !vulpejs.app.security.routes || vulpejs.app.security.routes.length === 0) {
        exports.auth.checkAfter(req, res, next);
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
        exports.auth.checkAfter(req, res, next);
      } else {
        res.status(403);
        exports.render(res, 'error', {
          ui: {
            controller: 'Error',
          },
          error: {
            status: 403,
            message: 'Forbidden',
          },
        });
      }
    }
  },
  checkBefore: function(req, res, next) {},
  checkAfter: function(req, res, next) {
    next();
  }
};

exports.render = function(res, name, options) {
  if (!vulpejs.app.started) {
    res.status(500).end();
    return;
  }
  res.cookie('pagination', JSON.stringify(vulpejs.app.pagination));
  if (!options) {
    options = {
      app: {
        release: vulpejs.app.release,
        version: vulpejs.app.version,
      },
    };
  } else if (!options.app) {
    options.app = {
      release: vulpejs.app.release,
      version: vulpejs.app.version,
    };
  }
  if (!options.ui) {
    options.ui = {
      minifier: vulpejs.app.minifier[vulpejs.app.env],
      uploader: {},
    };
  } else {
    if (!options.ui.minifier) {
      options.ui.minifier = vulpejs.app.minifier[vulpejs.app.env];
    }
    if (!options.ui.uploader) {
      options.ui.uploader = {};
    }
  }
  options.ui.data = vulpejs.app.data;
  helper.controller.make(options);
  res.render(name, options);
};

exports.user = {
  id: function(req) {
    return req.session['user-id'];
  },
  roles: function(req) {
    return req.session['user-roles'];
  },
};

exports.save = {
  /**
   * Save object in database.
   * @param {Object} req     Request
   * @param {Object} res     Response
   * @param {Object} options {model, data, callback}
   */
  do: function(req, res, options) {
    if (!options) {
      options = {};
    }
    options.operation = 'SAVE';
    options.res = res;
    if (req.params.model) {
      options.model = req.params.model;
    }
    if (req.body) {
      options.item = req.body;
    }
    if (req.params.data) {
      options.data = req.params.data;
    }
    exports.save.before(req, res, options);
    var userId = req.session['user-id'];
    vulpejs.models.save({
      model: options.model,
      item: options.item,
      data: options.data,
      validate: options.validate || false,
      userId: userId,
      callback: {
        success: function(item) {
          if (!vulpejs.utils.execute(options.callback, {
              item: item,
              postedItem: options.item,
              res: res,
            })) {
            exports.save.after(req, res, item);
            res.json({
              item: item,
              postedItem: options.item,
            });
          }
        },
        error: function(error) {
          exports.response.error(options, error);
        },
        validate: function(validate) {
          exports.response.validate(options, validate);
        },
      },
    });
  },
  before: function(req, res, options) {},
  after: function(req, res, item) {}
};

exports.remove = {
  /**
   * Remove object from database by id and callback if success.
   * @param {Object} req     Request
   * @param {Object} res     Response
   * @param {Object} options {model, id, callback}
   */
  do: function(req, res, options) {
    if (!options) {
      options = {};
    }
    options.operation = 'REMOVE';
    options.res = res;
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
        _id: req.params.id,
      };
    }
    exports.remove.before(req, res, options);
    var userId = req.session['user-id'];
    vulpejs.models.remove({
      model: options.model,
      item: {
        _id: req.params.id,
      },
      query: options.query,
      validate: options.validate || false,
      userId: userId,
      callback: {
        success: function(item) {
          if (!vulpejs.utils.execute(options.callback, {
              item: item,
              res: res,
            })) {
            exports.remove.after(req, res, item);
            res.json({
              item: item,
            });
          }
        },
        error: function(error) {
          exports.response.error(options, error);
        },
        validate: function(validate) {
          exports.response.validate(options, validate);
        },
      },
    });
  },
  before: function(req, res, options) {},
  after: function(req, res, item) {}
};

exports.list = {
  /**
   * List from database.
   * @param {Object} req Request
   * @param {Object} res Response
   */
  do: function(req, res) {
    var options = {
      operation: 'LIST',
      res: res,
    };
    exports.list.before(req, res, options);
    vulpejs.models.list({
      model: req.params.model,
      query: req.params.query || {},
      populate: req.params.populate || '',
      sort: req.params.sort || {},
      userId: req.session['user-id'],
      callback: {
        success: function(items) {
          exports.list.after(req, res, items);
          res.json({
            items: items,
          });
        },
        error: function(error) {
          exports.response.error(options, error);
        },
      },
    });
  },
  before: function(req, res, options) {},
  after: function(req, res, items) {}
};

exports.paginate = {
  /**
   * Paginate list from database.
   * @param {Object} req Request
   * @param {Object} res Response
   */
  do: function(req, res) {
    var options = {
      operation: 'PAGINATE',
      res: res,
    };
    exports.paginate.before(req, res, options);
    vulpejs.models.paginate({
      model: req.params.model,
      query: req.params.query || {},
      populate: req.params.populate || '',
      sort: req.params.sort || {},
      page: req.params.page || 1,
      userId: req.session['user-id'],
      callback: {
        success: function(data) {
          exports.paginate.after(req, res, data);
          res.json({
            items: data.items,
            pageCount: data.pageCount,
            itemCount: data.itemCount,
          });
        },
        error: function(error) {
          exports.response.error(options, error);
        },
      },
    });
  },
  before: function(req, res, options) {},
  after: function(req, res, data) {}
};

exports.distinct = {
  /**
   * Retrive distinct list of objects from database.
   * @param {Object} req Request
   * @param {Object} res Response
   */
  do: function(req, res) {
    var options = {
      operation: 'DISTINCT',
      res: res,
    };
    exports.distinct.before(req, res, options);
    vulpejs.models.distinct({
      model: req.params.model,
      query: req.params.query || {},
      sort: req.params.sort || false,
      array: req.params.array || false,
      callback: {
        success: function(items) {
          exports.distinct.after(req, res, items);
          res.json(items);
        },
        error: function(error) {
          vulpejs.log.error('DISTINCT', error);
          res.status(500).end();
        },
      },
    });
  },
  before: function(req, res, options) {},
  after: function(req, res, items) {}
};

exports.find = {
  /**
   * Find object in database.
   * @param {Object} req Request
   * @param {Object} res Response
   * @param {Object} options {model, populate, callback}
   */
  do: function(req, res, options) {
    if (!options) {
      options = {};
    }
    options.operation = 'FIND';
    options.res = res;
    exports.find.before(req, res, options);
    vulpejs.models.find({
      model: req.params.model,
      populate: req.params.populate,
      history: true,
      id: req.params.id || false,
      query: req.params.query || {
        _id: req.params.id,
      },
      callback: {
        success: function(data) {
          exports.find.after(req, res, data);
          if (options && options.callback) {
            vulpejs.utils.execute(options.callback, {
              item: data.item,
              history: data.history,
              res: res,
            });
          } else {
            res.json(data);
          }
        },
        error: function(error) {
          exports.response.error(options, error);
        },
      },
    })
  },
  before: function(req, res, options) {},
  after: function(req, res, data) {}
};

exports.aggregate = {
  /**
   * Aggregate object/objects in database an execute callback.
   * @param {Object} req     Request
   * @param {Object} res     Response
   * @param {Object} options {model, group, callback}
   */
  do: function(req, res, options) {
    if (!options) {
      options = {};
    }
    options.operation = 'AGGREGATE';
    options.res = res;
    exports.aggregate.before(req, res, options);
    vulpejs.models.aggregate({
      model: req.params.model,
      aggregate: req.params.aggregate,
      callback: {
        success: function(results) {
          if (options && options.callback) {
            vulpejs.utils.execute(options.callback, results);
          } else {
            exports.aggregate.after(req, res, results);
            res.json({
              items: results,
            });
          }
        },
        error: function(error) {
          vulpejs.log.error('AGGREGATE', error);
          res.status(500).end();
        },
      },
    });
  },
  before: function(req, res, options) {},
  after: function(req, res, results) {}
};

/**
 * Find histories of object in database.
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.history = {
  do: function(req, res) {
    var options = {
      operation: 'HISTORY',
      res: res,
    };
    exports.history.before(req, res, options);
    vulpejs.models.get('History').find({
      type: req.params.model,
    }).exec(function(error, items) {
      if (error) {
        exports.response.error(options, error);
      } else {
        exports.history.after(req, res, items);
        res.json({
          items: items,
        });
      }
    });
  },
  before: function(req, res, options) {},
  after: function(req, res, items) {}
};

exports.status = {
  /**
   * Change status of object in database.
   * @param {Object} req     Request
   * @param {Object} res     Response
   * @param {Object} options {model, callback}
   */
  do: function(req, res, options) {
    if (!options) {
      options = {};
    }
    options.operation = 'STATUS';
    options.res = res;
    exports.status.before(req, res, options);
    vulpejs.models.status({
      model: req.params.model,
      data: req.body,
      callback: {
        success: function(item) {
          exports.status.after(req, res, item);
          if (options && options.callback) {
            vulpejs.utils.execute(options.callback, item);
          } else {
            exports.response.success(options);
          }
        },
        error: function(error) {
          exports.response.error(options, error);
        },
      },
    });
  },
  before: function(req, res, options) {},
  after: function(req, res, item) {}
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
      ui: {
        controller: 'Login',
        title: 'Access Control',
      },
    });
  }
};

/**
 * Executa login.
 * @param   {Object}   req  Request
 * @param   {Object}   res  Response
 * @param   {Function} next Next Function
 * @return {Object}   User details.
 */
exports.doLogin = function(req, res, next) {
  var type = 'local';
  if (req.params.token) {
    type = 'jwt';
    req.headers.authorization = 'JWT ' + req.params.token;
  }
  vulpejs.express.passport.authenticate(type, function(error, user, info) {
    if (error) {
      vulpejs.utils.execute(vulpejs.app.callback.login.error, {
        user: user,
        error: error,
      });
      return next(error);
    }

    if (!user) {
      vulpejs.utils.execute(vulpejs.app.callback.login.unauthorized, {
        user: user,
      });
      return res.redirect(401, '/login');
    }

    req.logIn(user, function(error) {
      if (error) {
        vulpejs.utils.execute(vulpejs.app.callback.login.error, {
          user: user,
          error: error,
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
      if (url !== '/') {
        var module = url.split('/')[0];
        if (exports.map.indexOf(module) === -1) {
          url = '/';
        }
      }
      delete req.session['redirect-to'];
      vulpejs.utils.execute(vulpejs.app.callback.login.success, {
        req: req,
        res: res,
        user: user,
      });
      user.hashed_password = '';
      user.salt = '';
      if (req.params.redirect || req.query.redirect) {
        url = req.params.redirect || req.query.redirect;
      }
      return type === 'jwt' ? exports.render(res, 'auth', {
        user: user,
        redirectTo: url,
        params: req.params,
        query: req.query,
        ui: {
          controller: 'Auth',
        },
      }) : res.json({
        user: user,
        redirectTo: url,
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
  vulpejs.utils.execute(vulpejs.app.callback.logout, {
    user: req.session['user-id'],
    req: req,
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
 * @param   {Object} options {name, plural, model, remove:{executeBefore}, save:{data}, populate}
 * @return {Object} Express router.
 */
exports.make = function(options) {
  var router = vulpejs.express.base.Router();
  // INIT OPTIONS
  if (!options.plural) {
    options.plural = options.name + 's';
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
  // TOKEN
  if (options.token) {
    router.get('/' + options.name + '/token/:id', function(req, res) {
      vulpejs.models.find({
        model: options.model,
        id: req.params.id,
        callback: function(item) {
          var properties = ''
          if (vulpejs.utils.isArray(options.token)) {
            options.token.forEach(function(property) {
              properties += item[property];
            });
          } else {
            properties = item[options.token];
          }
          res.json({
            token: vulpejs.jwt.sign({
              sub: properties,
            }, vulpejs.app.security.auth.jwt.secret, vulpejs.app.security.auth.jwt.options),
          });
        },
      });
    });
  }
  if (options.ui) {
    if (!options.ui.modules) {
      options.ui.modules = {};
    }
    var dependency = function(inputs) {
      for (var i = 0, len = inputs.length; i < len; ++i) {
        var input = inputs[i];
        if (input.type === 'color-picker') {
          options.ui.modules.colorPicker = true;
          continue;
        }
        if (input.type === 'checkbox' && input.toggle) {
          options.ui.modules.switch = true;
          continue;
        }
        if (input.type === 'editor') {
          options.ui.modules.editor = true;
          continue;
        }
        if (input.type.indexOf('-uploader') !== -1) {
          if (!options.ui.modules.uploader) {
            options.ui.modules.uploader = {
              flow: {},
            };
          }
          continue;
        }
        if (input.type === 'range-slider') {
          options.ui.modules.rangeSlider = true;
          continue;
        }
      }
    };
    if (options.ui.inputs) {
      dependency(options.ui.inputs);
    } else if (options.ui.main && options.ui.main.inputs) {
      dependency(options.ui.main.inputs);
    }

    helper.controller.make(options);
    // CONTROLLER
    if (options.ui.controller && vulpejs.utils.isObject(options.ui.controller)) {
      if (options.ui.controller.service && !options.ui.controller.service.name) {
        options.ui.controller.service.name = options.name;
      }
      vulpejs.express.router.get('/javascripts/app/controllers/' + options.ui.controller.name + 'Controller' + (vulpejs.app.minifier[vulpejs.app.env] ? '.min' : '') + '.js', function(req, res) {
        res.writeHead(200, {
          'Content-Type': 'text/javascript',
        });
        var code = 'vulpe.ng.controller(' + vulpejs.utils.to.text(options.ui.controller) + ');';
        if (vulpejs.app.minifier[vulpejs.app.env]) {
          vulpejs.utils.js.obfuscate(code, {
            success: function(obfuscated) {
              res.write(obfuscated);
              res.end();
            },
            error: function(error) {
              exports.response.error(options, error);
            },
          });
        } else {
          res.write(code);
          res.end();
        }
      });
    }
  }
  // VIEW
  var doView = function(req, res) {
    var auto = (options.ui && options.ui.controller && (typeof options.ui.auto === 'undefined' || options.ui.auto));
    var views = [];
    var renderOptions = {
      ui: options.ui,
    };
    if (req.isAuthenticated()) {
      renderOptions.auth = {
        user: req.user,
      };
    }
    var render = function() {
      if (auto) {
        exports.render(res, 'auto', renderOptions);
      } else if (options.ui) {
        exports.render(res, options.name, renderOptions);
      } else {
        exports.render(res, options.name);
      }
    };
    if (auto) {
      if (options.ui.actions) {
        views.push({
          uri: options.ui.actions,
          name: 'htmlActions',
        });
      }
      if (options.ui.main && options.ui.main.actions) {
        views.push({
          uri: options.ui.main.actions,
          name: 'htmlActions',
          main: true,
        });
      }
      if (options.ui.select) {
        if (options.ui.select.actions && typeof options.ui.select.actions === 'string') {
          views.push({
            uri: options.ui.select.actions,
            name: 'htmlActions',
            select: true,
          });
          if (options.ui.select.viewActions) {
            views.push({
              uri: options.ui.select.viewActions,
              name: 'htmlViewActions',
              select: true,
            });
          }
        }
        if (options.ui.select.filter && typeof options.ui.select.filter === 'string') {
          views.push({
            uri: options.ui.select.filter,
            name: 'htmlFilter',
            select: true,
          });
        }
      }
    }
    if (views.length > 0) {
      vulpejs.async.eachSeries(views, function(view, callback) {
        res.render(view.uri, renderOptions, function(error, html) {
          if (error && error.length > 0) {
            vulpejs.log.error('RENDER-VIEW', {
              view: view.uri,
              html: html,
              error: error,
            });
          } else {
            if (view.include) {
              options.ui.includes[view.name] = html;
            } else if (!view.main && !view.select) {
              options.ui[view.name] = html;
            } else if (view.main) {
              options.ui.main[view.name] = html;
            } else if (view.select) {
              options.ui.select[view.name] = html;
            }
          }
          callback();
        });
      }, function() {
        render();
      });
    } else {
      render();
    }
  };
  router.get('/' + options.name, function(req, res) {
    doView(req, res);
  });
  // FIND
  router.get('/' + options.name + '/:id', function(req, res) {
    if (options.ui) {
      delete options.ui.item;
    }
    req.params.model = options.model;
    exports.find.do(req, res);
  });
  router.get('/' + options.name + '/view/:id/:uriback?', function(req, res) {
    options.ui.item = {
      id: req.params.id,
    };
    if (req.params.uriback) {
      options.ui.uriback = req.params.uriback;
    }
    doView(req, res);
  });
  router.get('/' + options.name + '/view/populate/:id/:uriback?', function(req, res) {
    options.ui.item = {
      id: req.params.id,
    };
    if (req.params.uriback) {
      options.ui.uriback = req.params.uriback;
    }
    options.ui.item.populate = true;
    doView(req, res);
  });
  router.get('/' + options.name + '/populate/:id', function(req, res) {
    if (options.ui) {
      delete options.ui.item;
    }
    if (options.populate) {
      req.params.populate = options.populate;
    }
    var opts = {};
    if (options.find) {
      if (options.find.populate) {
        opts = options.find.populate;
      }
      if (options.find.view) {
        var query = JSON.stringify(options.find.view.query).replace(':id', req.params.id);
        req.params.query = JSON.parse(query);
      }
    }

    req.params.model = options.model;
    exports.find.do(req, res, opts);
  });
  router.get('/' + options.name + '/query/:query', function(req, res) {
    req.params.model = options.model;
    req.params.query = JSON.parse(req.params.query);
    exports.find.do(req, res);
  });
  // DELETE
  router.delete('/' + options.name + '/:id', function(req, res) {
    options.remove.executeBefore(req, res, function() {
      req.params.model = options.model;
      exports.remove.do(req, res, options.remove);
    });
  });
  // SAVE
  router.post('/' + options.name, function(req, res) {
    req.params.model = options.model;
    if (!options.save) {
      options.save = {};
    }
    exports.save.do(req, res, options.save);
  });
  // LIST
  var configure = function(req, type) {
    req.params.model = options.model;
    if (options.populate) {
      req.params.populate = options.populate;
    }
    if (type && type === 'SEARCH') {
      req.params.query = {};
      if (options.ui.select.filter.fields) {
        if (vulpejs.utils.isArray(options.ui.select.filter.fields)) {
          req.params.query.$or = [];
          options.ui.select.filter.fields.forEach(function(field) {
            var condition = {};
            condition[field] = {
              $regex: req.params.search,
              $options: 'i',
            };
            req.params.query.$or.push(condition);
          });
        } else {
          req.params.query[options.ui.select.filter.fields] = {
            $regex: req.params.search,
            $options: 'i',
          };
        }
      }
    } else if (options.list) {
      if (!options.list.query) {
        options.list.query = {};
      }
      if (type && type === 'STATUS') {
        options.list.query.status = req.params.status;
        req.params.query = options.list.query;

      }
      if (options.list.sort) {
        req.params.sort = options.list.sort;
      }
    } else if (type && type === 'STATUS') {
      req.params.query = {
        status: req.params.status,
      };
    }
  };
  router.get('/' + options.plural, function(req, res) {
    configure(req);
    exports.list.do(req, res);
  });
  router.get('/' + options.plural + '/status/:status', function(req, res) {
    configure(req, 'STATUS');
    exports.list.do(req, res);
  });
  router.get('/' + options.plural + '/search/:search', function(req, res) {
    configure(req, 'SEARCH');
    exports.list.do(req, res);
  });
  router.get('/' + options.plural + '/query/:query', function(req, res) {
    req.params.model = options.model;
    req.params.query = JSON.parse(req.params.query);
    exports.list.do(req, res);
  });
  router.get('/' + options.plural + '/page/:page', function(req, res) {
    configure(req);
    exports.paginate.do(req, res);
  });
  router.get('/' + options.plural + '/status/:status/page/:page', function(req, res) {
    configure(req, 'STATUS');
    exports.paginate.do(req, res);
  });
  router.get('/' + options.plural + '/search/:search/page/:page', function(req, res) {
    configure(req, 'SEARCH');
    exports.paginate.do(req, res);
  });
  // STATUS CHANGE
  router.post('/' + options.name + '/status', function(req, res) {
    req.params.model = options.model;
    exports.status(req, res);
  });

  return router;
};

/**
 * Init Routes Module
 *
 * @return {}
 */
exports.init = function() {
  var router = vulpejs.express.router;
  var path = require('path');

  if (vulpejs.app.security && vulpejs.app.security.auth && vulpejs.app.security.auth.skip) {
    vulpejs.app.security.auth.skip.forEach(function(value) {
      loginSkip.push(value);
    });
  }

  var configuration = {
    directory: vulpejs.app.root.dir + '/locales/',
    extension: '.json',
    objectNotation: '.',
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
        return request.cookies.appLanguage || vulpejs.i18n.getLocale.apply(request, arguments);
      },
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
          locale: locale,
        });
        // Retrieve the translation object from the catalog and return it.
        var catalog = vulpejs.i18n.getCatalog(locale);
        result = singular.split(configuration.objectNotation).reduce(function(object, index) {
          return object[index];
        }, catalog);
      } else {
        result = vulpejs.i18n.__({
          phrase: phrase,
          locale: locale,
        });
      }
      response.send(result);
    },
  };

  vulpejs.express.app.use(getLocale);
  configure();
  // LANGUAGE
  router.get('/language/:language', exports.language);
  router.get('/javascripts/all-auto' + (vulpejs.app.minifier[vulpejs.app.env] ? '.min' : '') + '.js', function(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/javascript',
    });
    res.write(vulpejs.app.javascripts.join(''));
    res.end();
  });

  router.get('/javascripts/internal-controllers' + (vulpejs.app.minifier[vulpejs.app.env] ? '.min' : '') + '.js', function(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/javascript',
    });
    vulpejs.io.read.dir(vulpejs.app.root.dir + '/public/javascripts/internal/controllers/', function(list) {
      var controllers = [];
      if (list) {
        vulpejs.async.eachSeries(list, function(name, callback) {
          controllers.push(vulpejs.io.read.file(vulpejs.app.root.dir + '/public/javascripts/internal/controllers/' + name));
          callback();
        }, function() {
          res.write(controllers.join(''));
          res.end();
        });
      }
    });
  });

  // LOGIN
  router.get('/login', exports.login);
  router.post('/login', exports.doLogin);
  router.post('/login/:token/:redirect?', exports.doLogin);
  router.get('/login/:token/:redirect?', exports.doLogin);
  router.get('/token/:json', function(req, res) {
    var token = vulpejs.jwt.sign(JSON.parse(req.params.json), vulpejs.app.security.auth.jwt.secret, vulpejs.app.security.auth.jwt.options);
    res.json({
      token: token,
    });
  });
  router.get('/logout', exports.logout);

  router.get('/global/debug/:enable', function(req, res) {
    vulpejs.app.debug = eval(req.params.enable);
    res.cookie('debug', vulpejs.app.debug);
    res.json({
      debug: vulpejs.app.debug,
    });
  });
  router.get('/pagination/template', function(req, res) {
    res.render('dir-pagination-tpl');
  });
  if (!vulpejs.app.backend) {
    // FLOW UPLOADER
    var multipart = require('connect-multiparty');
    var router = vulpejs.express.router;
    var flow = require(vulpejs.root.dir + '/flow')(vulpejs.app.uploader[vulpejs.app.env].dir.files);

    router.post('/flow/upload', multipart({
      uploadDir: vulpejs.app.uploader[vulpejs.app.env].dir.tmp,
    }), function(req, res) {
      flow.post(req, function(status, filename, original_filename, identifier) {
        if (vulpejs.app.cors.enabled) {
          res.header('Access-Control-Allow-Origin', '*');
        }
        res.status(status).send();
      });
    });

    router.options('/flow/upload', function(req, res) {
      if (vulpejs.app.cors.enabled) {
        res.header('Access-Control-Allow-Origin', '*');
      }
      res.status(200).send();
    });

    router.get('/flow/upload', function(req, res) {
      flow.get(req, function(status, filename, original_filename, identifier) {
        if (vulpejs.app.cors.enabled) {
          res.header('Access-Control-Allow-Origin', '*');
        }

        if (status === 'found') {
          status = 200;
        } else {
          status = 404;
        }

        res.status(status).send();
      });
    });

    router.get('/flow/download/:identifier', function(req, res) {
      res.setHeader('Content-Disposition', 'attachment;');
      flow.write(req.params.identifier, res);
    });

    router.get('/flow/download/:identifier/:name', function(req, res) {
      res.setHeader('Content-Disposition', 'attachment; filename="' + req.params.name + '"');
      flow.write(req.params.identifier, res);
    });

    router.delete('/flow/clean/:identifier', function(req, res) {
      flow.clean(req.params.identifier);
      res.status(200).send();
    });

    if (vulpejs.plugins.uploader) {
      require('vulpejs-uploader')(router);
    }
  }

  var routes = [router];
  var routesDir = vulpejs.app.root.dir + '/routes/';
  var init = function() {
    // Catch 404 and forward to error handler
    vulpejs.express.app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // Error handlers
    vulpejs.express.app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      exports.render(res, 'error', {
        ui: {
          controller: 'Error',
        },
        message: err.message,
        error: vulpejs.app.env === 'production' ? {} : err,
      });
    });
  };
  var listModules = function(callback) {
    vulpejs.io.read.dir(routesDir, function(list) {
      if (list) {
        list.forEach(function(name) {
          var stats = vulpejs.io.info.file(routesDir + name);
          if (stats.isFile() && name[0] !== '.') {
            exports.map.push(name.split('.')[0]);
          }
        });
        callback(exports.map);
      }
    });
  };
  if (vulpejs.app.routes) {
    if (Array.isArray(vulpejs.app.routes)) {
      vulpejs.async.eachSeries(vulpejs.app.routes, function(value, callback) {
        if (value.name && (value.routes || value.route)) {
          if (value.routes) {
            var list = [];
            vulpejs.async.eachSeries(value.routes, function(route, _callback) {
              list.push(require(routesDir + route));
              _callback();
            }, function() {
              vulpejs.express.app.use(value.name, list);
              callback();
            });
          } else {
            vulpejs.express.app.use(value.name, require(routesDir + value.route));
            callback();
          }
        } else {
          routes.push(require(routesDir + value));
          callback();
        }
      }, function() {
        vulpejs.express.app.use('/', routes);
        init();
      });
    } else if (vulpejs.app.routes.load && vulpejs.app.routes.load.first) {
      listModules(function(modules) {
        vulpejs.async.eachSeries(vulpejs.app.routes.load.first, function(name, callback) {
          if (modules.indexOf(name) !== -1) {
            routes.push(require(routesDir + modules.splice(modules.indexOf(name), 1)));
          }
          callback();
        }, function() {
          vulpejs.async.eachSeries(modules, function(name, callback) {
            routes.push(require(routesDir + name));
            callback();
          }, function() {
            vulpejs.express.app.use('/', routes);
            init();
          });
        });
      });
    }
  } else {
    listModules(function(modules) {
      vulpejs.async.eachSeries(modules, function(name, callback) {
        routes.push(require(routesDir + name));
        callback();
      }, function() {
        vulpejs.express.app.use('/', routes);
        init();
      });
    });
  }
};