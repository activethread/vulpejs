'use strict';

/* Services */
var app = angular.module('app.services', ['ui.bootstrap', 'dialogs', 'i18n', 'ngCookies']);

app.factory("$store", ['$parse', '$cookieStore', function($parse, $cookieStore) {
  /**
   * Global Vars
   */
  var storage = (typeof window.localStorage === 'undefined') ? undefined : window.localStorage,
    supported = !(typeof storage == 'undefined' || typeof window.JSON == 'undefined');

  var privateMethods = {
    /**
     * Pass any type of a string from the localStorage to be parsed so it returns a usable version (like an Object)
     *
     * @param res -
     *            a string that will be parsed for type
     * @return {*} - whatever the real type of stored value was
     */
    parseValue: function(res) {
      var val;
      try {
        val = JSON.parse(res);
        if (typeof val == 'undefined') {
          val = res;
        }
        if (val == 'true') {
          val = true;
        }
        if (val == 'false') {
          val = false;
        }
        if (parseFloat(val) == val && !angular.isObject(val)) {
          val = parseFloat(val);
        }
      } catch (e) {
        val = res;
      }
      return val;
    }
  };
  var publicMethods = {
    /**
     * Set - let's you set a new localStorage key pair set
     *
     * @param key -
     *            a string that will be used as the accessor for the pair
     * @param value -
     *            the value of the localStorage item
     * @return {*} - will return whatever it is you've stored in the local storage
     */
    set: function(key, value) {
      if (!supported) {
        try {
          $cookieStore.set(key, value);
          return value;
        } catch (e) {
          console.log('Local Storage not supported, make sure you have the $cookieStore supported.');
        }
      }
      var saver = JSON.stringify(value);
      storage.setItem(key, saver);
      return privateMethods.parseValue(saver);
    },
    /**
     * Get - let's you get the value of any pair you've stored
     *
     * @param key -
     *            the string that you set as accessor for the pair
     * @return {*} - Object,String,Float,Boolean depending on what you stored
     */
    get: function(key) {
      if (!supported) {
        try {
          return privateMethods.parseValue($cookieStore.get(key));
        } catch (e) {
          return null;
        }
      }
      var item = storage.getItem(key);
      return privateMethods.parseValue(item);
    },
    /**
     * Remove - let's you nuke a value from localStorage
     *
     * @param key -
     *            the accessor value
     * @return {boolean} - if everything went as planned
     */
    remove: function(key) {
      if (!supported) {
        try {
          $cookieStore.remove(key);
          return true;
        } catch (e) {
          return false;
        }
      }
      storage.removeItem(key);
      return true;
    },
    /**
     * Bind - let's you directly bind a localStorage value to a $scope variable
     *
     * @param $scope -
     *            the current scope you want the variable available in
     * @param key -
     *            the name of the variable you are binding
     * @param def -
     *            the default value (OPTIONAL)
     * @return {*} - returns whatever the stored value is
     */
    bind: function($scope, key, def) {
      def = def || '';
      if (!publicMethods.get(key)) {
        publicMethods.set(key, def);
      }
      $parse(key).assign($scope, publicMethods.get(key));
      $scope.$watch(key, function(val) {
        publicMethods.set(key, val);
      }, true);
      return publicMethods.get(key);
    }
  };
  return publicMethods;
}]);

app.factory('$authenticator', ['$rootScope', '$store', function($rootScope, $store) {
  $rootScope.vulpejs = {
    userDetails: {}
  };
  return {
    userDetails: function() {
      $rootScope.vulpejs.userDetails = $store.get('userDetails');
      return $rootScope.vulpejs.userDetails;
    },
    loginSuccessfully: function(user) {
      $rootScope.vulpejs.userDetails = user;
      $store.set('userDetails', $rootScope.vulpejs.userDetails);
    },
    updateUserDetails: function() {
      $store.set('userDetails', $rootScope.vulpejs.userDetails);
    },
    logoutSuccessfully: function() {
      this.userIsAuthenticated = false;
      $store.remove('userDetails');
      $store.remove('userIsAuthenticated');
      if (application && application.login && application.login.arrays) {
        application.login.arrays.forEach(function(name) {
          $store.remove(name);
        });
      }
    }
  };
}]);

app.factory('$messages', ['$rootScope', function($rootScope) {
  return {
    type: '',
    message: '',
    addMessage: function(type, msg) {
      this.type = type;
      this.message = msg;
      this.broadcastMessage();
    },
    addErrorMessage: function(msg) {
      this.type = 'danger';
      this.message = msg;
      this.broadcastMessage();
    },
    addInfoMessage: function(msg) {
      this.type = 'info';
      this.message = msg;
      this.broadcastMessage();
    },
    addWarningMessage: function(msg) {
      this.type = 'warning';
      this.message = msg;
      this.broadcastMessage();
    },
    addSuccessMessage: function(msg) {
      this.type = 'success';
      this.message = msg;
      this.broadcastMessage();
    },
    cleanAllMessages: function() {
      this.broadcastCleanMessages();
    },
    broadcastMessage: function() {
      $rootScope.$broadcast('messageBroadcast');
    },
    broadcastCleanMessages: function() {
      $rootScope.$broadcast('cleanMessagesBroadcast');
    }
  };
}]);

/**
 * VulpeJS Service to implement CRUD.
 * @param   {Object}         $rootScope     Root Scope
 * @param   {Object}         $http          HTTP
 * @param   {Object}         $authenticator Authenticator
 * @param   {Object}         $messages      Messages
 * @param   {Object}         $dialogs       Dialogs
 * @param   {Object}         $timeout       Timeout
 * @param   {Object}         i18n           I18N
 * @param   {Object}         $store         $store
 * @return {String|Boolean}
 */
app.factory('VulpeJS', ['$rootScope', '$parse', '$http', '$authenticator', '$messages', '$dialogs', '$timeout', 'i18n', '$store', '$cookieStore', '$cookies', '$sce', '$window', '$filter', function($rootScope, $parse, $http, $authenticator, $messages, $dialogs, $timeout, i18n, $store, $cookieStore, $cookies, $sce, $window, $filter) {
  var nothing = function() {};
  var empty = function() {
    return '';
  };

  var pagination = $cookies.pagination ? JSON.parse($cookies.pagination) : {
    items: 15,
    history: 5
  };

  var vulpejs = {
    $store: $store,
    $authenticator: $authenticator,
    $cookies: $cookies,
    $timeout: $timeout,
    $filter: $filter,
    $window: $window,
    $parse: $parse,
    broadcast: function(name) {
      $rootScope.$broadcast(name);
    },
    parse: function(name) {
      return $parse(name);
    },
    i18n: function(text) {
      return i18n.__(text);
    },
    now: [],
    ever: [],
    message: {
      success: function(msg) {
        $messages.addSuccessMessage(msg);
      },
      error: function(msg) {
        $messages.addErrorMessage(msg);
      },
      info: function(msg) {
        $messages.addInfoMessage(msg);
      },
      warning: function(msg) {
        $messages.addWarningMessage(msg);
      },
      clean: function() {
        $messages.cleanAllMessages();
      }
    },
    dialog: {
      confirm: function(options) {
        $dialogs.confirm(vulpejs.i18n('Confirmation'), vulpejs.i18n(options.message)).result.then(function(btn) {
          vulpe.utils.execute(options.callback);
        }, function(btn) {});
      }
    },
    http: {
      get: function(options) {
        $http({
          url: options.url,
          params: options.params || {}
        }).success(function(data) {
          if (options.callback.success) {
            vulpe.utils.execute(options.callback.success, data);
          } else {
            vulpe.utils.execute(options.callback, data);
          };
        }).error(function(data, status, header, config) {
          vulpe.utils.execute(options.callback.error, {
            data: data,
            status: status,
            header: header,
            config: config
          });
        });
      },
      delete: function(options) {
        $http({
          url: options.url,
          method: 'DELETE',
          params: options.params || {}
        }).success(function(data) {
          if (options.callback.success) {
            vulpe.utils.execute(options.callback.success, data);
          } else {
            vulpe.utils.execute(options.callback, data);
          };
        }).error(function(data, status, header, config) {
          vulpe.utils.execute(options.callback.error, {
            data: data,
            status: status,
            header: header,
            config: config
          });
        });
      },
      post: function(options) {
        $http.post(options.url, options.data).success(function(data) {
          vulpe.utils.execute(options.callback.success, data);
        }).error(function(data, status, header, config) {
          vulpe.utils.execute(options.callback.error, {
            data: data,
            status: status,
            header: header,
            config: config
          });
        });
      },
      error: {
        handle: {}
      },
      ajax: function(options) {
        $.ajax({
          url: options.url
        }).done(function(data) {
          if (options.callback.success) {
            vulpe.utils.execute(options.callback.success, data);
          } else {
            vulpe.utils.execute(options.callback, data);
          };
        }).fail(function(error) {
          vulpe.utils.execute(options.callback.error, error);
        });
      }
    },
    context: {

    },
    item: {},
    itemOld: {},
    items: [],
    itemHistory: {
      data: [],
      item: [],
      version: null
    },
    model: {
      item: {},
      messages: {
        validate: {
          save: {
            exists: 'This record already exists.'
          },
          remove: {
            exists: 'This record is being used by another registry and can not be deleted.'
          }
        }
      },
      populate: false,
      cancelBefore: nothing,
      cancel: function() {
        var doCancel = function() {
          vulpejs.model.cancelBefore(vulpejs);
          vulpejs.doDebug({
            type: 'CANCEl-BEFORE',
            item: vulpejs.item
          });
          vulpejs.act.clear.item(false);
          vulpejs.model.cancelAfter(vulpejs);
          vulpejs.doDebug({
            type: 'CANCEl-AFTER',
            item: vulpejs.item
          });
        };
        if (vulpejs.hasChanged()) {
          vulpejs.dialog.confirm({
            message: 'The changed data will be lost. Do you really want to continue?',
            callback: function() {
              doCancel();
            }
          });
        } else {
          doCancel();
        }
      },
      cancelAfter: nothing,
      cloneBefore: nothing,
      clone: function(item) {
        vulpejs.model.cloneBefore(vulpejs);
        vulpejs.doDebug({
          type: 'CLONE-BEFORE',
          item: vulpejs.item
        });
        vulpejs.item = vulpejs.copy(item);
        vulpejs.itemOld = vulpejs.copy(item);
        delete vulpejs.item._id;
        vulpejs.ui.showing = true;
        vulpejs.act.clear.history();
        vulpejs.model.cloneAfter(vulpejs);
        vulpejs.doDebug({
          type: 'CLONE-AFTER',
          item: vulpejs.item
        });
        vulpejs.act.load.properties();
        $timeout(function() {
          vulpejs.ui.focus();
        }, 100);
      },
      cloneAfter: nothing,
      closeBefore: nothing,
      close: function(item) {
        vulpejs.model.closeBefore(vulpejs);
        vulpejs.doDebug({
          type: 'CLONE-BEFORE',
          item: vulpejs.item
        });
        vulpejs.item = vulpejs.copy(item);
        delete vulpejs.item._id;
        vulpejs.ui.showing = true;
        vulpejs.act.clear.history();
        vulpejs.model.closeAfter(vulpejs);
        vulpejs.doDebug({
          type: 'CLONE-AFTER',
          item: vulpejs.item
        });
        vulpejs.act.load.properties();
        $timeout(function() {
          vulpejs.ui.focus();
        }, 100);
      },
      closeAfter: nothing,
      createBefore: nothing,
      create: function() {
        var doCreate = function() {
          vulpejs.model.createBefore(vulpejs);
          vulpejs.doDebug({
            type: 'CREATE-BEFORE',
            item: vulpejs.item
          });
          vulpejs.act.clear.item(true);
          $timeout(function() {
            vulpejs.ui.focus();
          }, 100);
          vulpejs.model.createAfter(vulpejs);
          vulpejs.doDebug({
            type: 'CREATE-AFTER',
            item: vulpejs.item
          });
        };
        if (Object.keys(vulpejs.item).length > 0 && vulpejs.item._id && vulpejs.hasChanged()) {
          vulpejs.dialog.confirm({
            message: 'The changed data will be lost. Do you really want to continue?',
            callback: function() {
              doCreate();
            }
          });
        } else {
          doCreate();
        }
      },
      createAfter: nothing,
      filter: {
        status: ''
      },
      findBefore: nothing,
      find: function(id) {
        vulpejs.model.findBefore(vulpejs);
        vulpejs.doDebug({
          type: 'FIND-BEFORE',
          item: vulpejs.item
        });
        $http.get(vulpejs.url.get() + (vulpejs.model.populate ? '/populate' : '') + '/' + id).success(function(data) {
          vulpejs.item = data.item;
          vulpejs.ui.showing = !vulpejs.ui.showing;
          vulpejs.itemHistory.data = data.history.items;
          if (vulpejs.itemHistory.data.length !== 0) {
            vulpejs.ui.pagination.history.totalPages = data.history.pageCount;
            angular.forEach(vulpejs.itemHistory.data, function(value, key) {
              vulpejs.itemHistory.items.push(JSON.parse(value.content));
            });
          }
          vulpejs.model.findAfter(vulpejs);
          vulpejs.doDebug({
            type: 'FIND-AFTER',
            item: vulpejs.item
          });
          vulpejs.act.load.properties();
          vulpejs.itemOld = vulpejs.copy(vulpejs.item);
          $timeout(function() {
            vulpejs.ui.focus();
          }, 100);
        });
      },
      findAfter: nothing,
      history: {
        copy: function() {
          var valid = angular.isObject(vulpejs.itemHistory.version);
          vulpejs.ui.form.historySelected.$setValidity('historyNotSelected', valid);
          if (valid) {
            var version = vulpejs.item.version;
            vulpejs.item = vulpejs.itemHistory.version;
            if (version) {
              vulpejs.item.version = version;
            }
            vulpejs.itemOld = vulpejs.copy(vulpejs.item);
          }
        },
        list: function(page) {
          vulpejs.act.clear.history();
          if (!page) {
            page = 1;
          }
          $http.get(vulpejs.url.get() + '/history/' + vulpejs.item._id + '/page/' + page).success(function(data) {
            vulpejs.itemHistory.data = data.items;
            if (vulpejs.itemHistory.data.length !== 0) {
              vulpejs.ui.pagination.history.totalPages = data.pageCount;
              angular.forEach(vulpejs.itemHistory.data, function(value, key) {
                vulpejs.itemHistory.items.push(JSON.parse(value.content));
              });
            }
          });
        },
      },
      listBefore: nothing,
      list: function(page) {
        if (!page) {
          page = 1;
          vulpejs.currentPage = 0;
        }
        vulpejs.model.listBefore(vulpejs);
        vulpejs.doDebug({
          type: 'LIST-BEFORE',
          items: vulpejs.items
        });
        var filter = vulpejs.model.search.filter(vulpejs);
        filter += '/page/' + page;
        $http.get(vulpejs.url.get(vulpejs.url.list) + filter).success(function(data) {
          vulpejs.items = data.items;
          vulpejs.ui.pagination.totalPages = data.pageCount;
          vulpejs.ui.pagination.totalItems = data.pageCount * vulpejs.ui.pagination.size;
          vulpejs.model.listAfter(vulpejs);
          vulpejs.doDebug({
            type: 'LIST-AFTER',
            items: vulpejs.items
          });
        });
      },
      listAfter: nothing,
      saveBefore: nothing,
      saveType: '',
      save: function(type) {
        if (vulpejs.ui.form.$valid) {
          if (type) {
            vulpejs.model.saveType = type;
          } else {
            if (vulpejs.item._id) {
              vulpejs.isUpdate = true;
            }
            vulpejs.isValid = true;
            vulpejs.operation = 'SAVE';
            vulpejs.model.saveBefore(vulpejs);
            if (vulpejs.isValid) {
              vulpejs.doDebug({
                type: 'SAVE-BEFORE',
                item: vulpejs.item
              });
              vulpejs.message.clean();
              $http.post(vulpejs.url.get(), vulpejs.item).success(function(data) {
                vulpejs.item = data.item;
                vulpejs.itemOld = data.item;
                if (vulpejs.model.saveType.length > 0) {
                  if (vulpejs.model.saveType === 'NEW') {
                    vulpejs.model.create();
                  } else if (vulpejs.model.saveType === 'CLOSE') {
                    vulpejs.model.create();
                    vulpejs.ui.showing = false;
                  }
                  vulpejs.model.saveType = '';
                }
                vulpejs.message.success('Record successfully saved!');
                $timeout(function() {
                  vulpejs.model.list(vulpejs.ui.pagination.current);
                  vulpejs.ui.focus();
                }, 100);
                vulpejs.model.saveAfter(vulpejs);
                vulpejs.doDebug({
                  type: 'SAVE-AFTER',
                  item: vulpejs.item
                });
                vulpejs.act.load.properties();
              }).error(httpErrorHandler);
            }
          }
        } else {
          for (var property in vulpejs.item) {
            if (vulpejs.item.hasOwnProperty(property)) {
              var value = vulpejs.item[property];
              if (typeof value === 'string' && value.length === 0) {
                $timeout(function() {
                  vulpejs.ui.focusTo(vulpejs.ui.name.replace(/\-/g, '') + '-' + property.replace(/\./g, '-'));
                }, 100);
                break;
              }
            }
          }
        }
      },
      saveAfter: nothing,
      search: {
        filter: function(vulpejs) {
          return !vulpejs.model.filter.status ? '' : '/status/' + vulpejs.model.filter.status;
        },
        predicate: '',
        reverse: true
      },
      statusBefore: nothing,
      status: function(id, status) {
        vulpejs.operation = 'STATUS';
        vulpejs.message.clean();
        vulpejs.model.statusBefore(vulpejs);
        $http.post(vulpejs.url.get() + '/status', {
          id: id,
          status: status
        }).success(function() {
          if (vulpejs.item._id) {
            vulpejs.item.status = status;
          }
          vulpejs.message.success('Status successfully changed!');
          vulpejs.model.statusAfter(vulpejs);
          $timeout(function() {
            vulpejs.model.list(vulpejs.ui.pagination.current);
            vulpejs.ui.focus();
          }, 100);
        }).error(httpErrorHandler);
      },
      statusAfter: nothing,
      removeBefore: function(id, callback) {
        callback();
      },
      remove: function(id) {
        vulpejs.operation = 'REMOVE';
        var remove = function() {
          vulpejs.message.clean();
          vulpejs.model.removeBefore(id, function() {
            $http({
              method: 'DELETE',
              url: '/' + vulpejs.ui.name + '/' + id
            }).success(function() {
              vulpejs.act.clear.item(false);
              vulpejs.model.list(vulpejs.ui.pagination.current);
              vulpejs.message.success('Record successfully deleted!');
              vulpejs.model.removeAfter(vulpejs);
            }).error(httpErrorHandler);
          });
        };
        $dialogs.confirm(i18n.__('Confirmation'), i18n.__('Do you really want to delete?')).result.then(function(btn) {
          remove();
        }, function(btn) {});
      },
      removeAfter: nothing,
      validate: nothing
    },
    load: {
      arrays: [],
      properties: []
    },
    act: {
      clear: {
        history: function() {
          vulpejs.itemHistory.data = [];
          vulpejs.itemHistory.items = [];
          vulpejs.itemHistory.version = null;
        },
        item: function(show) {
          vulpejs.item = vulpejs.copy(vulpejs.model.item);
          vulpejs.item = vulpejs.eval.properties(vulpejs.item);
          vulpejs.act.clear.history();
          $timeout(function() {
            vulpejs.itemOld = vulpejs.copy(vulpejs.item);
          }, 100);
          vulpejs.ui.showing = show;
        }
      },
      addJSONValue: function(item, key, value) {
        var json = JSON.stringify(item);
        json = json.substring(0, json.length - 1) + ", \"" + key + "\":\"" + value + "\"}";
        return JSON.parse(item);
      },
      removeFromArray: function(name, property, index) {
        var remove = function() {
          vulpejs.message.clean();
          vulpejs.item[name].splice(index, 1);
        };
        var propertyValue = vulpejs.item[name][index][property];
        if (propertyValue) {
          $dialogs.confirm(i18n.__('Confirmation'), i18n.__('Do you really want to delete?')).result.then(function(btn) {
            remove();
          }, function(btn) {});
        } else {
          remove();
        }
      },
      addToArray: function(name, object) {
        vulpejs.message.clean();
        vulpejs.item[name].push(object);
      },
      load: {
        array: function(options) {
          var from = options.from,
            to = options.to,
            label = options.label;
          $rootScope.vulpejs[to] = [];
          from = vulpejs.eval.expression(from);
          if (from.length > 0) {
            $http.get(from).success(function(data) {
              $rootScope.vulpejs[to] = data.items;
              if (label) {
                angular.forEach($rootScope.vulpejs[to], function(item) {
                  item.label = '';
                  if (angular.isString(label)) {
                    item.label += item[label];
                  } else {
                    var properties = [];
                    var separator = ' - ';
                    if (angular.isArray(label)) {
                      properties = label;
                    } else if (angular.isObject(label)) {
                      properties = label.properties;
                      separator = label.separator;
                    }
                    properties.forEach(function(property) {
                      if (item.label.length > 0) {
                        item.label += separator;
                      }
                      item.label += item[property];
                    });
                  }
                });
              }
            });
          }
        },
        property: function(options) {
          var from = options.from,
            to = options.to,
            when = options.when,
            fromParts = from.split('.'),
            fromProperty = fromParts.pop();
          from = null;
          var toParts = to.split('.'),
            toProperty = toParts.pop();
          to = null;
          fromParts.forEach(function(part) {
            if (from === null) {
              from = $rootScope.vulpejs[part];
            } else {
              from = from[part];
            }
          });
          toParts.forEach(function(part) {
            if (to === null) {
              to = $rootScope.vulpejs[part];
            } else {
              to = to[part];
            }
          });
          if (angular.isArray(from)) {
            var array = from;
            for (var i = 0; i < array.length; i++) {
              from = array[i];
              if (eval(when)) {
                to[toProperty] = from[fromProperty];
                break;
              }
            }
          }
        },
        properties: function() {
          if (vulpejs.load.properties.length > 0) {
            vulpejs.load.properties.forEach(function(property) {
              vulpejs.act.load.property(property);
            });
          }
        }
      }
    },
    eval: {
      expression: function(text) {
        var newText = text;
        if (/\{(.*)\}/.test(text)) {
          var expression = text.match(/\{(.*)\}/);
          var parts = expression[1].split(':');
          newText = newText.replace(expression[0], '');
          var value = '';
          if (parts.length > 1) {
            if (parts[1].indexOf('.') !== -1) {
              var object = parts[1].split('.');
              if (parts[0] === 'store') {
                value = $store.get(object[0]) ? $store.get(object[0])[object[1]] : '';
              } else {
                value = $rootScope.vulpejs[object[0]] ? $rootScope.vulpejs[object[0]][object[1]] : '';
              }
            } else {
              if (parts[0] === 'store') {
                value = $store.get(parts[1]) ? $store.get(parts[1]) : '';
              } else {
                value = $rootScope.vulpejs[parts[1]] ? $rootScope.vulpejs[parts[1]] : '';
              }
            }
          } else {
            if (parts[0].indexOf('.') !== -1) {
              var object = parts[0].split('.');
              value = $rootScope.vulpejs[object[0]][object[1]]
            } else {
              value = $rootScope.vulpejs[parts[0]];
            }
          }
          if (value.length === 0) {
            newText = '';
          } else {
            newText += value;
          }
        }
        return newText;
      },
      properties: function(item) {
        if (angular.isObject(item)) {
          for (var property in item) {
            if (angular.isArray(item[property])) {
              item[property].forEach(function(value) {
                value = vulpejs.eval.properties(value);
              });
            } else if (angular.isObject(item[property])) {
              item[property] = vulpejs.eval.properties(item[property]);
            } else {
              item[property] = vulpejs.eval.expression(item[property]);
            }
          }
        }
        return item;
      }
    },
    init: nothing,
    doDebug: function(opts) {
      if (vulpejs.debug) {
        console.debug(opts);
      }
    },
    ui: {
      form: {},
      name: '',
      showing: false,
      datepicker: function($event) {
        $event.preventDefault();
        $event.stopPropagation();
        vulpejs.datepickerOpened = !vulpejs.datepickerOpened;
      },
      hotkeys: nothing,
      tab: {
        selected: 0,
        next: function() {
          if (vulpejs.ui.showing) {
            $($("li.ng-isolate-scope").get(vulpejs.ui.tab.selected + 1)).find("a").trigger("click");
          }
        },
        previous: function() {
          if (vulpejs.ui.showing) {
            $($("li.ng-isolate-scope").get(vulpejs.ui.tab.selected - 1)).find("a").trigger("click");
          }
        },
        focus: function(focus) {
          if (focus && focus.length > 0) {
            $timeout(function() {
              vulpejs.ui.focusTo(vulpejs.ui.name.replace(/\-/g, '') + '-' + focus);
            }, 100);
          }
        },
        hotkeys: function() {
          $(document).bind("keydown.left", function(evt) {
            vulpejs.ui.tab.previous();
            return false;
          }).bind("keydown.right", function(evt) {
            vulpejs.ui.tab.next();
            return false;
          });
        }
      },
      focus: nothing,
      focusTo: function(id) {
        $(id.indexOf('#') !== 0 ? '#' + id : id).focus();
      },
      inputFocus: function(name) {
        var token = "input[name='" + name + "']";
        var inputs = $(token).filter(function() {
          return this.value == "";
        });
        if (inputs.length > 0) {
          $(inputs.get(0)).focus();
        } else {
          $(token).focus();
        }
      },
      checkUncheckAll: function(items) {
        $rootScope.selectAll = !$rootScope.selectAll;
        angular.forEach($rootScope[items], function(item) {
          item.selected = $rootScope.selectAll;
        });
      },
      on: {
        blur: function(options) {},
        click: function(options) {},
        change: function(options) {
          var type = options.type;
          if (type && type === 'SELECT') {
            if (typeof vulpejs.item[options.name] !== 'undefined') {
              vulpejs[options.items].forEach(function(option) {
                if (option[options.value] === vulpejs.item[options.name]) {
                  vulpejs[options.name] = option;
                }
              });
            } else {
              delete vulpejs[options.name];
            }
          }
        },
        select: function(options) {
          var type = options.type;
          if (type && type === 'TYPEAHEAD') {
            vulpejs.item[options.rootProperty] = options.$item[options.itemProperty];
          }
        }
      },
      flow: {
        submitBefore: nothing,
        submitAfter: nothing,
        submit: function($flow, model) {
          var $model = $parse(model);
          vulpejs.ui.flow.submitBefore($flow, $model);
          $flow.upload();
          vulpejs.ui.flow.submitAfter($flow, $model);
        },
        successBefore: nothing,
        successAfter: nothing,
        success: function($flow, $file, model) {
          var $model = $parse(model);
          vulpejs.ui.flow.successBefore($flow, $file, $model);
          $parse(model).assign($rootScope, window.location.origin + '/flow/download/' + $file.uniqueIdentifier + '?' + Date.now());
          vulpejs.ui.flow.successAfter($flow, $file, $model);
        }
      },
      pagination: {
        size: pagination.items,
        current: 0,
        totalPages: 0,
        totalItems: 0,
        history: {
          size: pagination.history,
          current: 0,
          totalPages: 0,
          totalItems: 0,
          changeHandler: function(newPageNumber) {
            vulpejs.message.clean();
            vulpejs.ui.pagination.history.current = newPageNumber;
            vulpejs.model.history.list(newPageNumber);
            vulpejs.itemHistory.version = null;
          }
        },
        changeHandler: function(newPageNumber) {
          vulpejs.message.clean();
          vulpejs.ui.pagination.current = newPageNumber;
          vulpejs.model.list(newPageNumber);
        }
      }
    },
    hasRoles: function(roles) {
      var user = $authenticator.userDetails();
      for (var i = 0; i < roles.length; i++) {
        var role = roles[i];
        if (user.roles.indexOf(role) !== -1) {
          return true;
        }
      }
      return false;
    },
    equals: function(item, property, value) {
      return item ? item[property] === value : false;
    },
    on: {
      ready: function(execute) {
        $(document).ready(function() {
          vulpe.utils.execute(execute);
        });
      },
      change: function(type) {}
    },
    hasChanged: function(value, valueOld) {
      if (!value && !valueOld) {
        value = vulpejs.item;
        valueOld = vulpejs.itemOld;
      }
      return angular.toJson(value) !== angular.toJson(valueOld);
    },
    copy: function(value) {
      return angular.copy(value);
    },
    trustSrc: function(src) {
      return $sce.trustAsResourceUrl(src);
    },
    url: {
      context: vulpe.ng.rootContext,
      get: function(value) {
        if (!value) {
          value = vulpejs.ui.name;
        }
        return vulpejs.url.context + (value.indexOf('/') === 0 ? value : '/' + value);
      },
      list: ''
    },
    query: {},
    params: {},
    redirect: function(url) {
      vulpejs.$window.location = url;
    }
  };
  vulpejs.debug = $cookieStore.get('debug') || vulpejs.debug;

  if (window.location.search) {
    var search = window.location.search.substring(1);
    var status = function(value) {
      if (value.indexOf('status=') !== -1) {
        var parts = value.split('=');
        if (parts[0] === 'status') {
          vulpejs.model.filter.status = parts[1];
        }
      }
    };
    if (search.indexOf('&') !== -1) {
      search.split('&').forEach(function(value) {
        var parts = value.split('=');
        vulpejs.query[parts[0]] = parts[1];
        status(value);
      });
    } else {
      var parts = search.split('=');
      vulpejs.query[parts[0]] = parts[1];
      status(search);
    }
  }

  var service = function(options) {
    if (options) {
      vulpejs.debug = options.debug || false;
      vulpejs.ui.name = options.name;
      vulpejs.url.list = options.plural || options.name + 's';
      vulpejs.model.search.predicate = options.predicate || '';
      if (options.populate) {
        vulpejs.model.populate = options.populate;
      }
      if (options.focus) {
        vulpejs.ui.focus = function() {
          if (angular.isFunction(options.focus)) {
            options.focus(vulpejs);
          } else {
            var prefix = '#' + options.name.replace(/\-/g, '') + '-';
            if (angular.isObject(options.focus)) {
              $(prefix + (vulpejs.item._id ? options.focus.edit : options.focus.new)).focus();
            } else {
              $(prefix + options.focus).focus();
            }
          }
        };
      }
      if (options.messages) {
        vulpejs.model.messages = options.messages;
      }
      vulpejs.ui.hotkeys = options.hotkeys || nothing;
      if (options.list) {
        if (options.list.filter) {
          vulpejs.model.search.filter = options.list.filter;
        }
        vulpejs.model.listBefore = options.list.before || nothing;
        vulpejs.model.listAfter = options.list.after || nothing;
      }
      vulpejs.model.item = options.model || {};
      if (options.actions) {
        if (options.actions.focus) {
          vulpejs.ui.focus = options.actions.focus;
        }
        vulpejs.model.validate = options.actions.validate || nothing;
        vulpejs.model.createBefore = options.actions.createBefore || nothing;
        vulpejs.model.createAfter = options.actions.createAfter || nothing;
        vulpejs.model.cloneBefore = options.actions.cloneBefore || nothing;
        vulpejs.model.cloneAfter = options.actions.cloneAfter || nothing;
        vulpejs.model.findBefore = options.actions.findBefore || nothing;
        vulpejs.model.findAfter = options.actions.findAfter || nothing;
        vulpejs.model.saveBefore = options.actions.saveBefore || nothing;
        vulpejs.model.saveAfter = options.actions.saveAfter || nothing;
        vulpejs.model.statusBefore = options.actions.statusBefore || nothing;
        vulpejs.model.statusAfter = options.actions.statusAfter || nothing;
        if (options.actions.removeBefore) {
          vulpejs.model.removeBefore = options.actions.removeBefore;
        }
        vulpejs.model.removeAfter = options.actions.removeAfter || nothing;
        vulpejs.model.cancelBefore = options.actions.cancelBefore || nothing;
        vulpejs.model.cancelAfter = options.actions.cancelAfter || nothing;
      }
      if (options.load) {
        vulpejs.load.arrays = options.load.arrays || [];
        vulpejs.load.properties = options.load.properties || [];
      }
      if (options.error) {
        vulpejs.http.error.handle = options.error.handle || nothing;
      }
      vulpejs.init = options.init || nothing;
    } else {
      vulpejs.debug = false;
    }
  };

  var httpErrorHandler = function(data, status, header, config) {
    if (angular.isFunction(vulpejs.http.error.handle)) {
      vulpejs.http.error.handle({
        operation: vulpejs.operation,
        data: data,
        status: status,
        header: header,
        config: config,
        vulpejs: vulpejs
      });
    } else if (data.validate) {
      if (data.validate.exists) {
        if (vulpejs.operation === 'SAVE') {
          vulpejs.message.info(vulpejs.model.messages.validate.save.exists);
        } else if (vulpejs.operation === 'REMOVE') {
          vulpejs.message.info(vulpejs.model.messages.validate.remove.exists);
        }
      }
    } else {
      vulpejs.message.error('An error occurred in the execution.');
    }
  };

  service.prototype.init = function($scope) {
    $authenticator.userDetails();
    vulpejs.init(vulpejs);
    if (application.init) {
      vulpe.utils.execute(application.init);
    }
    if ($scope) {
      $(document).ready(function() {
        if ($scope.mainForm) {
          vulpejs.ui.form = $scope.mainForm;
        };
        $scope.multiSelectTranslation = {
          selectAll: i18n.__('Select all'),
          selectNone: i18n.__('Select none'),
          reset: i18n.__('Reset'),
          search: i18n.__('Search'),
          nothingSelected: i18n.__('Nothing is selected')
        };
      });
    }
    if (vulpejs.ui.name) {
      vulpejs.act.clear.item(false);
      if (vulpejs.load.arrays.length > 0) {
        angular.forEach(vulpejs.load.arrays, function(array) {
          vulpejs.act.load.array(array);
        });
      }
      var itemId = $('#item-id');
      if (itemId.length === 1) {
        var values = itemId.text().split(':');
        if (values.length === 2) {
          vulpejs.model.populate = true;
        }
        vulpejs.model.find(values[0]);
      } else {
        vulpejs.model.validate();
        vulpejs.model.list(vulpejs.ui.pagination.current);
      }
      vulpejs.ui.hotkeys();
      vulpejs.ui.tab.hotkeys();
      vulpejs.ui.focus();
    }
    return $rootScope.vulpejs;
  };
  service.prototype.store = $store;

  $rootScope.vulpejs = vulpejs;

  return service;
}]);