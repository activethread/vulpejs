"use strict";

exports.plugins = {
  //paginate: require('mongoose-paginate'),
  //deepPopulate: require('mongoose-deep-populate'),
  //autoIncrement: require('mongoose-auto-increment'),
  autoIncrement: require('../mongoose/auto-increment'),
  deepPopulate: require('../mongoose/deep-populate'),
  paginate: require('../mongoose/paginate')
};

/**
 * Validate presence of value.
 * @param   {String}  value Value
 * @return {Boolean} True if exists and False if not.
 */
exports.validatePresenceOf = function(value) {
  return value && value.length;
};

/**
 * Make model from schema.
 * @param   {Object} options {name, schema}
 * @return {Object} Model
 */
exports.make = function(options) {
  var Schema = exports.schema(options);
  Schema.pre('save', function(next) {
    this.modified = Date.now();
    next();
  });

  return exports.set(options.name, Schema);
};

/**
 * Make schema from options.
 * @param   {Object} options {name, schema}
 * @return {Object} Schema
 */
exports.schema = function(options) {
  var Schema = vulpejs.mongoose.Schema;
  var Model = new Schema(options.schema);

  Model.plugin(exports.plugins.paginate);
  Model.plugin(exports.plugins.deepPopulate);

  return Model;
};

/**
 * Get model.
 * @param   {String} name
 * @return {Object} Model
 */
exports.get = function(name) {
  return vulpejs.mongoose.model(name);
};

/**
 * Set model.
 * @param   {String} name
 * @return {Object} Model
 */
exports.set = function(name, model) {
  return vulpejs.mongoose.model(name, model);
};

/**
 * Save object in database.
 * @param {Object} options {model, item, data, callback {success, error}}
 */
exports.save = function(options) {
  var History = exports.get('History');
  var Model = exports.get(options.model);
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
      vulpejs.utils.execute(error ? vulpejs.app.callback.model.save.error : vulpejs.app.callback.model.save.success, {
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
          vulpejs.log.error('ITEM-FIND', {
            error: error,
            options: options
          });
          vulpejs.utils.execute(options.callback.error);
        } else {
          var content = JSON.stringify(oldItem);
          var history = new History({
            type: options.model,
            cid: oldItem._id,
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
                vulpejs.log.error('ITEM-UPDATE', {
                  error: error,
                  options: options
                });
                vulpejs.utils.execute(options.callback.error);
              } else {
                vulpejs.utils.execute(options.callback.success, obj);
              }
            });
          };
          if (options.history) {
            history.save(function(error, obj) {
              if (error) {
                vulpejs.log.error('HISTORY-SAVE', {
                  error: error,
                  options: options
                });
                vulpejs.utils.execute(options.callback.error);
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
          vulpejs.log.error('ITEM-SAVE', {
            error: error,
            options: options
          });
          vulpejs.utils.execute(options.callback.error);
        } else {
          vulpejs.utils.execute(options.callback.success, obj);
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
        vulpejs.log.error('VALIDATE-SAVE-ITEM', {
          error: error,
          options: options
        });
        vulpejs.utils.execute(options.callback.error);
      } else {
        if (total > 0) {
          vulpejs.utils.execute(options.callback.validate, {
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
 * @param {Object} options {model, id, callback}
 */
exports.remove = function(options) {
  var Model = exports.get(options.model);
  var query = options.query;
  var callback = function(item, error) {
    vulpejs.utils.execute(error ? vulpejs.app.callback.model.remove.error : vulpejs.app.callback.model.remove.success, {
      type: 'DELETE',
      model: options.model,
      message: error || '',
      item: item,
      user: options.userId
    });
  };
  var execute = function() {
    Model.findOne(query, function(error, item) {
      if (error) {
        vulpejs.log.error(error);
        vulpejs.utils.execute(options.callback.error);
      } else {
        Model.remove(query, function(err, obj) {
          callback(item, err);
          if (err) {
            vulpejs.log.error(err);
            vulpejs.utils.execute(options.callback.error, err);
          } else {
            vulpejs.utils.execute(options.callback.success, item);
          }
        });
      }
    });
  };
  if (options.validate && options.validate.exists && options.validate.exists.dependency) {
    var validateQuery = {
      server: options.item._id
    };
    // TODO: Remove Validate
    // for (var i = 0, len = options.validate.exists.dependencies.length; i < leng; ++i) {
    //   exports.get(options.validate.exists[i]).count(query).exec(function(error, total) {
    //     if (error) {
    //       vulpejs.log.error(error);
    //       vulpejs.utils.execute(options.callback.error);
    //     } else {
    //       if (total > 0) {
    //         vulpejs.utils.execute(options.callback.validate, {
    //           exists: true,
    //           total: total
    //         });
    //       } else {
    //         execute();
    //       }
    //     }
    //   });
    // }
    exports.get(options.validate.exists.dependency).count(validateQuery).exec(function(error, total) {
      if (error) {
        vulpejs.log.error('VALIDATE-REMOVE-ITEM', {
          error: error,
          options: options
        });
        vulpejs.utils.execute(options.callback.error);
      } else {
        if (total > 0) {
          vulpejs.utils.execute(options.callback.validate, {
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
 * Update from database.
 * @param {Object} options {model, query, set, multi, callback}
 */
exports.update = function(options) {
  var query = options.query || {};
  var set = options.set || {};
  var uOptions = {};
  if (options.multi) {
    uOptions.multi = true;
  }
  var Model = exports.get(options.model);
  Model.update(query, set, uOptions, function(error, raw) {
    if (error) {
      vulpejs.log.error('UPDATE-ITEM', {
        error: error,
        options: options
      });
      vulpejs.utils.execute(options.callback.error);
    } else {
      vulpejs.utils.execute(options.callback.success, raw);
    }
  });
};

/**
 * Count from database.
 * @param {Object} options {model, query, callback}
 */
exports.count = function(options) {
  var query = options.query || {};
  var Model = exports.get(options.model);
  Model.count(query).exec(function(error, total) {
    if (error) {
      vulpejs.log.error('COUNT-ITEM', {
        error: error,
        options: options
      });
      vulpejs.utils.execute(options.callback.error);
    } else {
      vulpejs.utils.execute(options.callback.success, total);
    }
  });
};

/**
 * List from database.
 * @param {Object} options {model, query, populate, sort, userId, callback}
 */
exports.list = function(options) {
  var populate = options.populate || '';
  var query = options.query || {};
  var sort = options.sort || {};
  var Model = exports.get(options.model);
  var callback = function(items, error) {
    vulpejs.utils.execute(error ? vulpejs.app.callback.model.list.error : vulpejs.app.callback.model.list.success, {
      type: 'SELECT',
      model: options.model,
      message: error || '',
      items: items,
      user: options.userId
    });
  };
  var find = Model.find(query);
  if (populate.indexOf('.') !== -1) {
    find.deepPopulate(populate);
  } else {
    find.populate(populate);
  }
  find.sort(sort).exec(function(error, items) {
    callback(items, error);
    if (error) {
      vulpejs.log.error('LIST-ITEMS', {
        error: error,
        options: options
      });
      vulpejs.utils.execute(options.callback.error);
    } else {
      vulpejs.utils.execute(options.callback.success, items);
    }
  });
};

/**
 * Paginate list from database.
 * @param {Object} options {model, query, populate, sort, userId, callback}
 */
exports.paginate = function(options) {
  var populate = options.populate || '';
  var sort = options.sort || {};
  var query = options.query || {};
  var fields = options.fields || {};
  var page = options.page || 1;
  if (page === 0) {
    page = 1;
  }
  var Model = exports.get(options.model);
  var callback = function(items, error) {
    vulpejs.utils.execute(error ? vulpejs.app.callback.model.list.error : vulpejs.app.callback.model.list.success, {
      type: 'SELECT',
      model: options.model,
      message: error || 'page:' + page,
      items: items,
      user: options.userId
    });
  };
  Model.paginate(query, {
    populate: populate,
    sortBy: sort,
    page: page,
    columns: fields,
    limit: vulpejs.app.pagination.items,
  }, function(error, items, pageCount, itemCount) {
    callback(items, error);
    if (error) {
      vulpejs.log.error('PAGE-ITEMS', {
        error: error,
        options: options
      });
      vulpejs.utils.execute(options.callback.error);
    } else {
      vulpejs.utils.execute(options.callback.success, {
        items: items,
        pageCount: pageCount,
        itemCount: itemCount
      });
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
  var History = exports.get('History');
  History.paginate(query, {
    page: page,
    limit: vulpejs.app.pagination.history
  }, function(error, items, pageCount, itemCount) {
    if (error) {
      vulpejs.log.error('HISTORY', error);
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
 * Find object/objects in database and execute callback without HTTP response.
 * @param {Object} options (model, object id, query, populate, sort, callback)
 */
exports.find = function(options) {
  var Model = exports.get(options.model);
  if (!options.populate) {
    options.populate = '';
  }
  var page = options.page || 1;
  if (!options.fields) {
    options.fields = '';
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
  var cache = function(value) {
    if (options.cache) {
      if (!options.cache.interval) {
        options.cache.interval = 60 * 60 * 1000;
      }
      if (!options.cache.name) {
        options.cache.name = options.model;
      }
      vulpejs.cache.put(options.cache.name, value);
      setTimeout(function() {
        delete options.callback;
        exports.find(options);
      }, options.cache.interval);
    }
  };
  if (options.one) {
    var query = Model.findOne(options.query);
    if (options.populate.indexOf('.') !== -1) {
      query.deepPopulate(options.populate);
    } else {
      query.populate(options.populate);
    }
    query.select(options.fields).exec(function(error, item) {
      if (error) {
        vulpejs.log.error('FIND-ONE', {
          error: error,
          options: options
        });
        vulpejs.utils.execute(options.callback.error, error);
      } else if (options && options.callback) {
        if (item && options.history) {
          history({
            type: options.model,
            cid: item._id
          }, page, function(error, history) {
            if (error) {
              vulpejs.log.error('FIND-ONE-HISTORY', {
                error: error,
                options: options
              });
              vulpejs.utils.execute(options.callback.error, error);
            } else {
              cache(item);
              vulpejs.utils.execute(options.callback.success || options.callback, {
                item: item,
                history: history
              });
            }
          });
        } else {
          cache(item);
          vulpejs.utils.execute(options.callback.success || options.callback, item);
        }
      }
    });
  } else {
    if (!options.sort) {
      options.sort = {};
    }
    var query = Model.find(options.query)
    if (options.populate.indexOf('.') !== -1) {
      query.deepPopulate(options.populate);
    } else {
      query.populate(options.populate);
    }
    if (options.limit) {
      query.limit(options.limit);
    }
    query.sort(options.sort).select(options.fields).exec(function(error, items) {
      if (error) {
        vulpejs.log.error('FIND-MANY', error);
        vulpejs.utils.execute(options.callback.error, error);
      } else if (options && options.callback) {
        cache(items);
        vulpejs.utils.execute(options.callback.success || options.callback, items);
      }
    });
  }
};

/**
 * Retrive distinct list of objects from database.
 */
exports.distinct = function(options) {
  exports.get(options.model).find(options.query).distinct(options.distinct, function(error, items) {
    if (error) {
      vulpejs.log.error('DISTINCT', error);
      vulpejs.utils.execute(options.callback.error, error);
    } else {
      if (options.sort) {
        items.sort(vulpejs.utils.compare.normal);
      }
      vulpejs.utils.execute(options.callback.success, options.array ? items : {
        items: items
      });
    }
  });
};

/**
 * Find object by id and update.
 * @param {Object} options {model, id, data, callback}
 */
exports.findByIdAndUpdate = function(options) {
  exports.get(options.model).findByIdAndUpdate(options.id, {
    $set: options.data
  }, function(error, item) {
    if (error) {
      vulpejs.utils.execute(options.callback.error, error);
    } else {
      vulpejs.utils.execute(options.callback.success, item);
    }
  });
};

/**
 * Change status of object in database.
 * @param {Object} options {model, callback}
 */
exports.status = function(options) {
  var item = options.data;
  exports.get(options.model).findByIdAndUpdate(item.id, {
    $set: {
      status: item.status
    }
  }, function(error, item) {
    if (error) {
      vulpejs.utils.execute(options.callback.error, error);
    } else {
      vulpejs.utils.execute(options.callback.success, item);
    }
  });
};

/**
 * Aggregate object/objects in database an execute callback.
 * @param {Object} options {model, group, callback}
 */
exports.aggregate = function(options) {
  exports.get(options.model).aggregate(options.aggregate,
    function(error, results) {
      if (error) {
        vulpejs.utils.execute(options.callback.error, error);
      } else {
        vulpejs.utils.execute(options.callback.success, results);
      }
    });
};

/**
 * Init Models Module
 *
 * @return {}
 */
exports.init = function() {
  var vulpejs = global.vulpejs;
  var database = vulpejs.app.database;
  if (!vulpejs.app.database) {
    vulpejs.app.database = {
      development: {
        host: 'localhost',
        port: 27017,
        name: 'appName',
        auth: {
          source: 'admin',
          user: 'admin',
          pass: 'vulpejs'
        }
      }
    };
    database = vulpejs.app.database.development;
  } else {
    database = vulpejs.app.database[vulpejs.app.env];
    if (!database.host) {
      database.host = 'localhost';
    }
    if (!database.port) {
      database.port = 27017;
    }
    if (!database.name) {
      database.name = 'appName';
    }
    if (!database.auth) {
      database.auth = {
        source: 'admin',
        user: 'admin',
        pass: 'vulpejs'
      }
    }
    if (!database.auth.source) {
      database.auth.source = 'admin';
    }
    if (!database.auth.user) {
      database.auth.user = 'admin';
    }
    if (!database.auth.pass) {
      database.auth.pass = 'vulpejs';
    }
  }
  var db = vulpejs.mongoose.connection;
  db.on('error', console.error);
  db.once('open', function() {
    var init = function() {
      vulpejs.log.info(vulpejs.i18n.__('Database successfully started!'));
      vulpejs.schedules.init();
    };
    require(root.vulpejs.dir + '/models/security');
    var modelsDir = vulpejs.app.root.dir + '/models/';
    var listModules = function(callback) {
      vulpejs.io.read.dir(modelsDir, function(list) {
        var modules = [];
        if (list) {
          list.forEach(function(name) {
            var stats = vulpejs.io.info.file(modelsDir + name);
            if (stats.isFile() && name[0] !== '.') {
              modules.push(name.split('.')[0]);
            }
          });
          callback(modules);
        }
      });
    };
    var done = function() {
      listModules(function(modules) {
        modules.forEach(function(name) {
          require(modelsDir + name);
        });
        init();
      });
    };
    if (vulpejs.app.models) {
      if (Array.isArray(vulpejs.app.models)) {
        vulpejs.app.models.forEach(function(model) {
          require(modelsDir + model);
        });
        init();
      } else if (vulpejs.app.models.load && vulpejs.app.models.load.first) {
        listModules(function(modules) {
          vulpejs.app.models.load.first.forEach(function(name) {
            var removed = modules.splice(modules.indexOf(name), 1);
            require(modelsDir + removed)();
          });
          modules.forEach(function(name) {
            require(modelsDir + name);
          });
          init();
        });
      } else {
        done();
      }
    } else {
      done();
    }
  });
  var mongoUrl = 'mongodb://${auth}${host}:${port}/${db}?${authSource}w=1';
  mongoUrl = mongoUrl.replace('${host}', database.host);
  mongoUrl = mongoUrl.replace('${port}', database.port);
  mongoUrl = mongoUrl.replace('${db}', database.name);
  mongoUrl = mongoUrl.replace('${auth}', database.auth ? database.auth.user + ':' + database.auth.pass + '@' : '');
  mongoUrl = mongoUrl.replace('${authSource}', database.auth ? 'authSource=' + database.auth.source + '&' : '');
  vulpejs.mongoose.connect(mongoUrl);
  exports.plugins.autoIncrement.initialize(vulpejs.mongoose.connection);
};