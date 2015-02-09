"use strict";
var http = require('http');
var dustfs = require('dustfs');
dustfs.dirs(appRoot + '/templates');
var express = require('express');
var async = require('async');
var mongoose = require('mongoose');
var passport = require('passport');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var transport = nodemailer.createTransport(smtpTransport({
  host: 'mail.sitehosting.com.br',
  port: 587,
  auth: {
    user: 'nao-responda@sitehosting.com.br',
    pass: '0Gul0LfTfA5T'
  }
}));

var rootContext = global.rootContext || '';
var loginSkip = ['/login', '/sign-up', '/sign-up-confirm', '/reset-password', '/forgot-password', '/fonts', '/javascripts', '/stylesheets', '/images', '/i18n'];
if (global.login && global.login.skip) {
  global.login.skip.forEach(function(value) {
    loginSkip.push(value);
  });
}

/**
 * Compare two objects to order.
 * @param   {Object} a Object
 * @param   {Object} b Object
 * @returns {Number} Order to sort.
 */
exports.compare = function(a, b) {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

/**
 * Compare two objects to order reverse.
 * @param   {Object} a Object
 * @param   {Object} b Object
 * @returns {Number} Order to sort.
 */
exports.compareReverse = function(a, b) {
  if (a > b) {
    return -1;
  }
  if (a < b) {
    return 1;
  }
  return 0;
};

exports.linux = /^linux/.test(process.platform);

/**
 * Try execute function with parameter.
 * @param   {Function} execute Function to execute
 * @param   {Object}   item    Item to return
 * @param   {Object}   res     Response
 * @returns {Boolean}  True if is function to execute and False if not.
 */
exports.tryExecute = function(execute, item, res) {
  if (typeof(execute) === 'function') {
    if (!item) {
      execute();
    } else {
      if (!res) {
        execute(item);
      } else {
        execute(item, res);
      }
    }
    return true;
  }
  return false;
};

/**
 * Check auth if user is authenticated.
 * @param {Object}  req  Request
 * @param {Object}  res  Response
 * @param {Boolean} next True if is autenticated and False if is not.
 */
exports.checkAuth = function(req, res, next) {
  if (!req.isAuthenticated()) {
    var skip = false;
    for (var i = 0; i < loginSkip.length; i++) {
      var skipUri = rootContext + loginSkip[i];
      if (skipUri === req.originalUrl) {
        skip = true;
        break;
      }
    }
    if (!skip) {
      req.session['redirect-to'] = req.originalUrl;
      res.redirect(rootContext + '/login');
      return;
    }
  }

  next();
};

/**
 * Save object in database.
 * @param {Object} req     Request
 * @param {Object} res     Response
 * @param {Object} options {model, data}
 */
exports.save = function(req, res, options) {
  var History = mongoose.model('History');
  var Model = mongoose.model(req.params.model);
  var item = new Model(req.body);
  if (req.body._id) {
    Model.findOne({
      _id: item._id
    }, function(error, oldItem) {
      if (error) {
        res.status(500).json({
          error: error
        });
      }
      var content = JSON.stringify(oldItem);
      var history = new History({
        type: req.params.model,
        cid: oldItem.id,
        content: content,
        user: item.user
      });
      history.save(function(error, obj) {
        if (error) {
          console.error(error);
          res.status(500).json({
            error: error
          });
        } else {
          if (options.simple) {
            options.data(oldItem, item);
            oldItem.save(function(error, obj) {
              if (error) {
                console.error(error);
                res.status(500).json({
                  error: error
                });
              } else {
                if (!exports.tryExecute(options.callback, obj, res)) {
                  res.json({
                    item: obj
                  });
                }
              }
            });
          } else {
            Model.findByIdAndUpdate(item._id, {
              $set: options.data(item)
            }, function(error, obj) {
              if (error) {
                console.error(error);
                res.status(500).json({
                  error: error
                });
              } else {
                if (!exports.tryExecute(options.callback, obj, res)) {
                  res.json({
                    item: obj
                  });
                }
              }
            });
          }
        }
      });
    });
  } else {
    item.save(function(error, obj) {
      if (error) {
        console.error(error);
        res.status(500).json({
          error: error
        });
      } else {
        if (!exports.tryExecute(options.callback, obj, res)) {
          res.json({
            item: obj
          });
        }
      }
    });
  }
};

/**
 * Remove object from database by id and callback if success.
 * @param {Object} req     Request
 * @param {Object} res     Response
 * @param {Object} options {model, id, callback}
 */
exports.remove = function(req, res, options) {
  var Model = mongoose.model(req.params.model);
  var query = req.params.query || {
    _id: req.params.id
  };
  Model.remove(query, function(error, item) {
    if (error) {
      console.error(error);
      res.status(500).json({
        error: error
      });
    } else if (options && options.callback) {
      exports.tryExecute(options.callback, item);
    } else {
      res.status(201).end();
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
  Model.find(query).populate(populate).exec(function(error, items) {
    if (error) {
      res.status(500).json({
        error: error
      });
    }

    res.json({
      items: items
    });
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
  var Model = mongoose.model(req.params.model);
  Model.paginate(query, page, 15, function(error, pageCount, items, itemCount) {
    if (error) {
      console.error(error);
    } else {
      res.json({
        items: items,
        pageCount: pageCount
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
      console.error(error);
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
      console.error(error);
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
  History.paginate(query, page, 5, function(error, pageCount, items, itemCount) {
    if (error) {
      console.error(error);
    } else {
      callback(error, {
        items: items,
        pageCount: pageCount
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
 */
exports.find = function(req, res, options) {
  var page = req.params.page || 1;
  var Model = mongoose.model(req.params.model);
  var populate = req.params.populate || '';
  Model.findOne({
    _id: req.params.id
  }).populate(populate).exec(function(error, item) {
    if (error) {
      res.status(500).json({
        error: error
      });
    }
    history({
      type: req.params.model,
      cid: item.id
    }, page, function(error, history) {
      if (error) {
        res.status(500).json({
          error: error
        });
      }
      if (options && options.callback) {
        exports.tryExecute(options.callback, item, res);
      } else {
        res.json({
          item: item,
          history: history
        });
      }
    });
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
          exports.tryExecute(options.callbackError, error);
        } else {
          res.json({
            error: error
          });
        }
      } else if (options && options.callback) {
        exports.tryExecute(options.callback, item);
      }
    });
  } else if (options.many) {
    Model.find(options.query).populate(options.populate).exec(function(error, items) {
      if (error) {
        res.status(500);
        if (options.callbackError) {
          exports.tryExecute(options.callbackError, error);
        } else {
          res.json({
            error: error
          });
        }
      } else if (options && options.callback) {
        exports.tryExecute(options.callback, items);
      }
    });
  }
};

/**
 * Find object/objects in database and execute callback without HTTP response.
 * @param {Object} options {model, object id, query, populate, callback}
 */
exports.simpleFindAndCallback = function(options) {
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
  if (options.one) {
    Model.findOne(options.query).populate(options.populate).exec(function(error, item) {
      if (error) {
        console.error(error);
      } else if (options && options.callback) {
        exports.tryExecute(options.callback, item);
      }
    });
  } else
  if (options.many) {
    Model.find(options.query).populate(options.populate).exec(function(error, items) {
      if (error) {
        console.error(error);
      } else if (options && options.callback) {
        exports.tryExecute(options.callback, items);
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
      console.error(error);
      res.status(500).json({
        error: error
      });
      return;
    } else if (options && options.callback) {
      exports.tryExecute(options.callback, item);
    } else {
      res.status(201).end();

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
      res.status(500).json({
        error: error
      });
    }

    res.json({
      items: items
    });
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
      console.error(error);
      res.status(500).json({
        error: error
      });
    } else if (options && options.callback) {
      exports.tryExecute(options.callback, item);
    } else {
      res.status(201).end();
    }
  });
};

/**
 * Load Dust template and execute callback.
 * @param {Object} options {name, data, res, callback}
 */
exports.template = function(options) {
  dustfs.render(options.name, options.data, function(error, out) {
    if (error) {
      if (options.res) {
        options.res.json({
          error: error
        });
      } else {
        console.log('Error on parse template ' + options.name + ': ' + error);
      }
    } else {
      exports.tryExecute(options.callback, out);
    }
  });
};

/**
 * Send mail.
 * @param {Object} options {from, to, subject, html, res, out, callback}
 */
exports.sendmail = function(options) {
  var from = options.from || 'Site Hosting <nao-responda@sitehosting.com.br>';
  transport.sendMail({
    from: from,
    to: options.to,
    subject: options.subject,
    html: options.html
  }, function(error, info) {
    if (error) {
      if (options.res) {
        options.res.json({
          error: error
        });
      } else {
        console.log('Error on send mail \'' + options.subject + '\' to ' + options.to + ': ' + error);
      }
    } else {
      exports.tryExecute(options.callback, options.out);
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
    res.render('login', {
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
      return next(error);
    }

    if (!user) {
      return res.redirect(403, '/login');
    }

    req.logIn(user, function(error) {
      if (error) {
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
      var url = req.session['redirect-to'] || '/';
      delete req.session['redirect-to'];
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
  delete req.session['user-id'];
  res.redirect(rootContext + '/');
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
      exports.tryExecute(callback, html);
    });
  }).on('error', function(e) {
    console.log("HTTP GET error: " + e.message);
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
  if (!options.remove || !options.remove.executeBefore) {
    options.remove = {
      executeBefore: function(req, res, callback) {
        callback(req, res);
      }
    };
  }
  // FIND
  router.get('/' + options.name, function(req, res) {
    if (options.page && options.page.controller && (typeof options.page.auto === 'undefined' || options.page.auto)) {
      res.render('auto', {
        page: options.page
      });
    } else if (options.page) {
      res.render(options.name, {
        page: options.page
      });
    } else {
      res.render(options.name);
    }
  });
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
      exports.remove(req, res);
    });
  });
  // SAVE
  router.post('/' + options.name, function(req, res) {
    req.params.model = options.model;
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