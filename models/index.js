"use strict";

exports.plugins = {
  paginate: require('mongoose-paginate'),
  autoIncrement: require('mongoose-auto-increment')
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
  return vulpejs.mongoose.model(name, model);;
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
          vulpejs.debug.error('ITEM-FIND', error);
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
                vulpejs.debug.error('ITEM-UPDATE', error);
                vulpejs.utils.execute(options.callback.error);
              } else {
                vulpejs.utils.execute(options.callback.success, obj);
              }
            });
          };
          if (options.history) {
            history.save(function(error, obj) {
              if (error) {
                vulpejs.debug.error('HISTORY-SAVE', error);
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
          vulpejs.debug.error('ITEM-SAVE', error);
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
        vulpejs.debug.error('VALIDATE-SAVE-ITEM', error);
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
        vulpejs.debug.error(error);
        vulpejs.utils.execute(options.callback.error);
      } else {
        Model.remove(query, function(err, obj) {
          callback(item, err);
          if (err) {
            vulpejs.debug.error(err);
            vulpejs.utils.execute(options.callback.error);
          } else {
            vulpejs.utils.execute(options.callback.success, item);
          }
        });
      }
    });
  }
  if (options.validate && options.validate.exists && options.validate.exists.dependency) {
    var validateQuery = {
      server: options.item._id
    };
    // TODO: Remove Validate
    // for (var i = 0, len = options.validate.exists.dependencies.length; i < leng; ++i) {
    //   exports.get(options.validate.exists[i]).count(query).exec(function(error, total) {
    //     if (error) {
    //       vulpejs.debug.error(error);
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
        vulpejs.debug.error('VALIDATE-REMOVE-ITEM', error);
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
  Model.find(query).populate(populate).sort(sort).exec(function(error, items) {
    callback(items, error);
    if (error) {
      vulpejs.debug.error('LIST-ITEMS', error);
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
  Model.paginate(query, page, vulpejs.app.pagination.items, function(error, pageCount, items, itemCount) {
    callback(items, error);
    if (error) {
      vulpejs.debug.error('PAGE-ITEMS', error);
      vulpejs.utils.execute(options.callback.error);
    } else {
      vulpejs.utils.execute(options.callback.success, {
        pageCount: pageCount,
        items: items,
        itemCount: itemCount
      });
    }
  }, {
    populate: populate,
    sortBy: sort
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
  if (options.one) {
    Model.findOne(options.query).populate(options.populate).select(options.fields).exec(function(error, item) {
      if (error) {
        vulpejs.debug.error('FIND-ONE', error);
        vulpejs.utils.execute(options.callback.error, error);
      } else if (options && options.callback) {
        if (item && options.history) {
          history({
            type: options.model,
            cid: item._id
          }, page, function(error, history) {
            if (error) {
              vulpejs.debug.error('FIND-ONE-HISTORY', error);
              vulpejs.utils.execute(options.callback.error, error);
            } else {
              vulpejs.utils.execute(options.callback.success || options.callback, {
                item: item,
                history: history
              });
            }
          });
        } else {
          vulpejs.utils.execute(options.callback.success || options.callback, item);
        }
      }
    });
  } else {
    if (!options.sort) {
      options.sort = {};
    }
    Model.find(options.query).populate(options.populate).sort(options.sort).select(options.fields).exec(function(error, items) {
      if (error) {
        vulpejs.debug.error('FIND-MANY', error);
        vulpejs.utils.execute(options.callback.error, error);
      } else if (options && options.callback) {
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
      vulpejs.debug.error('DISTINCT', error);
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
    function(err, results) {
      if (err) {
        vulpejs.utils.execute(options.callback.error, error);
      } else {
        vulpejs.utils.execute(options.callback.success, results);
      }
    });
};

/**
 * Init Models Module
 *
 * @param  {Object} options
 * @return {}
 */
exports.init = function(options) {
  var vulpejs = global.vulpejs;
  if (!options.database) {
    options.database = {
      host: 'localhost',
      port: 27017,
      name: 'appName',
      user: 'admin',
      pass: 'q1w2e3r4'
    }
  } else {
    if (!options.database.host) {
      options.database.host = 'localhost';
    }
    if (!options.database.port) {
      options.database.port = 27017;
    }
    if (!options.database.name) {
      options.database.name = 'appName';
    }
    if (!options.database.user) {
      options.database.user = 'admin';
    }
    if (!options.database.pass) {
      options.database.pass = 'q1w2e3r4';
    }
  }
  var db = vulpejs.mongoose.connection;
  db.on('error', console.error);
  db.once('open', function() {
    var init = function() {
      vulpejs.debug.log(vulpejs.i18n.__('Database successfully started!'));
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
    if (options.models) {
      if (Array.isArray(options.models)) {
        options.models.forEach(function(model) {
          require(modelsDir + model);
        });
        init();
      } else if (options.models.load && options.models.load.first) {
        listModules(function(modules) {
          options.models.load.first.forEach(function(name) {
            var removed = modules.splice(modules.indexOf(name), 1);
            require(modelsDir + removed)();
          });
          modules.forEach(function(name) {
            require(modelsDir + name);
          });
          init();
        });
      }
    } else {
      listModules(function(modules) {
        modules.forEach(function(name) {
          require(modelsDir + name);
        });
        init();
      });
    }
  });
  var mongoUrl = 'mongodb://${auth}${host}:${port}/${db}?authSource=admin&w=1';
  var database = options.database;
  if (database && database[vulpejs.app.env]) {
    database = database[vulpejs.app.env];
    if (!database.port) {
      database.port = 27017;
    }
  }
  if (database.user && database.pass) {
    mongoUrl = mongoUrl.replace('${auth}', database.user + ':' + database.pass + '@');
  } else {
    mongoUrl = mongoUrl.replace('${auth}', '');
  }
  mongoUrl = mongoUrl.replace('${host}', database.host);
  mongoUrl = mongoUrl.replace('${port}', database.port);
  mongoUrl = mongoUrl.replace('${db}', database.name);
  vulpejs.mongoose.connect(mongoUrl);
  exports.plugins.autoIncrement.initialize(vulpejs.mongoose.connection);
};