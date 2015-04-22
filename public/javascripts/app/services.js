'use strict';

/* Services */
var app = angular.module('app.services', ['ui.bootstrap', 'dialogs', 'i18n', 'ngCookies']);

app
  .factory(
    "$store", ['$parse', '$cookieStore', function($parse, $cookieStore) {
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
         * @returns {*} - whatever the real type of stored value was
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
         * @returns {*} - will return whatever it is you've stored in the local storage
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
         * @returns {*} - Object,String,Float,Boolean depending on what you stored
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
         * @returns {boolean} - if everything went as planned
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
         * @returns {*} - returns whatever the stored value is
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
 * @returns {String|Boolean}
 */
app.factory('VulpeJS', ['$rootScope', '$http', '$authenticator', '$messages', '$dialogs', '$timeout', 'i18n', '$store', '$cookieStore', '$sce', '$window', '$filter', function($rootScope, $http, $authenticator, $messages, $dialogs, $timeout, i18n, $store, $cookieStore, $sce, $window, $filter) {
  var nothing = function() {};
  var empty = function() {
    return '';
  };

  var vulpejs = {
    $store: $store,
    $authenticator: $authenticator,
    $timeout: $timeout,
    $filter: $filter,
    $window: $window,
    broadcast: function(name) {
      $rootScope.$broadcast(name)
    },
    i18n: function(text) {
      return i18n.__(text);
    },
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
          vulpe.util.tryExecute(options.callback);
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
            vulpe.util.tryExecute(options.callback.success, data);
          } else {
            vulpe.util.tryExecute(options.callback, data);
          };
        }).error(function(data, status, header, config) {
          vulpe.util.tryExecute(options.callback.error, {
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
            vulpe.util.tryExecute(options.callback.success, data);
          } else {
            vulpe.util.tryExecute(options.callback, data);
          };
        }).error(function(data, status, header, config) {
          vulpe.util.tryExecute(options.callback.error, {
            data: data,
            status: status,
            header: header,
            config: config
          });
        });
      },
      post: function(options) {
        $http.post(options.url, options.data).success(function(data) {
          vulpe.util.tryExecute(options.callback.success, data);
        }).error(function(data, status, header, config) {
          vulpe.util.tryExecute(options.callback.error, {
            data: data,
            status: status,
            header: header,
            config: config
          });
        });
      }
    },
    rootContext: vulpe.ng.rootContext,
    onlyNumbers: /^\d+$/,
    showing: false,
    form: {},
    name: '',
    listUrl: '',
    predicate: '',
    reverse: true,
    populate: false,
    item: {},
    items: [],
    history: [],
    historyItems: [],
    historyVersion: null,
    saveType: '',
    selectedTab: 0,
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
    newItem: nothing,
    focus: nothing,
    hotkeys: nothing,
    listFilter: function(vulpejs) {
      return !vulpejs.filter.status ? '' : '/status/' + vulpejs.filter.status;
    },
    listBefore: nothing,
    listAfter: nothing,
    validate: nothing,
    createBefore: nothing,
    createAfter: nothing,
    findBefore: nothing,
    findAfter: nothing,
    saveBefore: nothing,
    saveAfter: nothing,
    cancelBefore: nothing,
    cancelAfter: nothing,
    statusBefore: nothing,
    statusAfter: nothing,
    removeBefore: function(id, callback) {
      callback();
    },
    removeAfter: nothing,
    loadArrays: [],
    loadProperties: [],
    doLoadProperties: function() {
      if (vulpejs.loadProperties.length > 0) {
        vulpejs.loadProperties.forEach(function(property) {
          vulpejs.loadProperty(property);
        })
      }
    },
    init: nothing,
    errorHandler: {},
    filter: {
      status: ''
    },
    doDebug: function(opts) {
      if (vulpejs.debug) {
        console.debug(opts);
      }
    },
    pageSize: 15,
    totalItems: 0,
    pageChangeHandler: function(newPageNumber) {
      vulpejs.message.clean();
      vulpejs.list(newPageNumber);
    },
    historyPageChangeHandler: function(newPageNumber) {
      vulpejs.message.clean();
      vulpejs.historyList(newPageNumber);
      vulpejs.historyVersion = null;
    },
    trustSrc: function(src) {
      return $sce.trustAsResourceUrl(src);
    },
    expressionEval: function(text) {
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
    propertiesEval: function(item) {
      if (angular.isObject(item)) {
        for (var property in item) {
          if (angular.isArray(item[property])) {
            item[property].forEach(function(value) {
              value = vulpejs.propertiesEval(value);
            });
          } else if (angular.isObject(item[property])) {
            item[property] = vulpejs.propertiesEval(item[property]);
          } else {
            item[property] = vulpejs.expressionEval(item[property]);
          }
        }
      }
      return item;
    },
    create: function() {
      vulpejs.createBefore(vulpejs);
      vulpejs.doDebug({
        type: 'CREATE-BEFORE',
        item: vulpejs.item
      });
      clearItem(true);
      $timeout(function() {
        vulpejs.focus();
      }, 100);
      vulpejs.createAfter(vulpejs);
      vulpejs.doDebug({
        type: 'CREATE-AFTER',
        item: vulpejs.item
      });
    },
    cancel: function() {
      vulpejs.cancelBefore(vulpejs);
      vulpejs.doDebug({
        type: 'CANCEl-BEFORE',
        item: vulpejs.item
      });
      clearItem(false);
      vulpejs.cancelAfter(vulpejs);
      vulpejs.doDebug({
        type: 'CANCEl-AFTER',
        item: vulpejs.item
      });
    },
    historyCopy: function() {
      var valid = angular.isObject(vulpejs.historyVersion);
      $rootScope.form.historySelected.$setValidity('historyNotSelected', valid);
      if (valid) {
        var version = vulpejs.item.version;
        vulpejs.item = vulpejs.historyVersion;
        if (version) {
          vulpejs.item.version = version;
        }
      }
    },
    list: function(page) {
      if (!page) {
        page = 1;
        vulpejs.currentPage = 0;
      }
      vulpejs.listBefore(vulpejs);
      vulpejs.doDebug({
        type: 'LIST-BEFORE',
        items: vulpejs.items
      });
      var filter = vulpejs.listFilter(vulpejs);
      filter += '/page/' + page;
      $http.get(vulpejs.rootContext + vulpejs.listUrl + filter).success(function(data) {
        vulpejs.items = data.items;
        $rootScope.totalItems = data.pageCount * $rootScope.pageSize;
        vulpejs.listAfter(vulpejs);
        vulpejs.doDebug({
          type: 'LIST-AFTER',
          items: vulpejs.items
        });
      });
    },
    historyList: function(page) {
      clearHistory();
      if (!page) {
        page = 1;
      }
      $http.get(vulpejs.rootContext + vulpejs.name + '/history/' + vulpejs.item._id + '/page/' + page).success(function(data) {
        vulpejs.history = data.items;
        if (vulpejs.history.length !== 0) {
          vulpejs.historyPageSize = data.pageCount;
          angular.forEach(vulpejs.history, function(value, key) {
            vulpejs.historyItems.push(JSON.parse(value.content));
          });
        }
      });
    },
    find: function(id) {
      vulpejs.findBefore(vulpejs);
      vulpejs.doDebug({
        type: 'FIND-BEFORE',
        item: vulpejs.item
      });
      $http.get(vulpejs.rootContext + '/' + vulpejs.name + ($rootScope.populate ? '/populate' : '') + '/' + id).success(function(data) {
        vulpejs.item = data.item;
        vulpejs.showing = !vulpejs.showing;
        vulpejs.history = data.history.items;
        if (vulpejs.history.length !== 0) {
          vulpejs.historyPageSize = data.history.pageCount;
          angular.forEach(vulpejs.history, function(value, key) {
            vulpejs.historyItems.push(JSON.parse(value.content));
          });
        }
        vulpejs.findAfter(vulpejs);
        vulpejs.doDebug({
          type: 'FIND-AFTER',
          item: vulpejs.item
        });
        vulpejs.doLoadProperties();
        $timeout(function() {
          vulpejs.focus();
        }, 100);
      });
    },
    close: function(item) {
      vulpejs.closeBefore(vulpejs);
      vulpejs.doDebug({
        type: 'CLONE-BEFORE',
        item: vulpejs.item
      });
      vulpejs.item = angular.copy(item);
      delete vulpejs.item._id;
      vulpejs.showing = true;
      clearHistory();
      vulpejs.closeAfter(vulpejs);
      vulpejs.doDebug({
        type: 'CLONE-AFTER',
        item: vulpejs.item
      });
      vulpejs.doLoadProperties();
      $timeout(function() {
        vulpejs.focus();
      }, 100);
    },
    remove: function(id) {
      vulpejs.operation = 'REMOVE';
      var remove = function() {
        vulpejs.message.clean();
        vulpejs.removeBefore(id, function() {
          $http({
            method: 'DELETE',
            url: '/' + vulpejs.name + '/' + id
          }).success(function() {
            clearItem(false);
            vulpejs.list();
            vulpejs.message.success('Record successfully deleted!');
            vulpejs.removeAfter(vulpejs);
          }).error(httpErrorHandler);
        });
      };
      $dialogs.confirm(i18n.__('Confirmation'), i18n.__('Do you really want to delete?')).result.then(function(btn) {
        remove();
      }, function(btn) {});
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
    clone: function(item) {
      vulpejs.cloneBefore(vulpejs);
      vulpejs.doDebug({
        type: 'CLONE-BEFORE',
        item: vulpejs.item
      });
      vulpejs.item = angular.copy(item);
      delete vulpejs.item._id;
      vulpejs.showing = true;
      clearHistory();
      vulpejs.cloneAfter(vulpejs);
      vulpejs.doDebug({
        type: 'CLONE-AFTER',
        item: vulpejs.item
      });
      vulpejs.doLoadProperties();
      $timeout(function() {
        vulpejs.focus();
      }, 100);
    },
    save: function(type) {
      if ($rootScope.form.$valid) {
        if (type) {
          vulpejs.saveType = type;
        } else {
          if (vulpejs.item._id) {
            vulpejs.isUpdate = true;
          }
          vulpejs.isValid = true;
          vulpejs.operation = 'SAVE';
          vulpejs.saveBefore(vulpejs);
          if (vulpejs.isValid) {
            vulpejs.doDebug({
              type: 'SAVE-BEFORE',
              item: vulpejs.item
            });
            vulpejs.message.clean();
            $http.post(vulpejs.rootContext + '/' + vulpejs.name, vulpejs.item).success(function(data) {
              vulpejs.item = data.item;
              if (vulpejs.saveType.length > 0) {
                if (vulpejs.saveType === 'NEW') {
                  vulpejs.create();
                } else if (vulpejs.saveType === 'CLOSE') {
                  vulpejs.create();
                  vulpejs.showing = false;
                }
                vulpejs.saveType = '';
              }
              vulpejs.message.success('Record successfully saved!');
              $timeout(function() {
                vulpejs.list();
                vulpejs.focus();
              }, 100);
              vulpejs.saveAfter(vulpejs);
              vulpejs.doDebug({
                type: 'SAVE-AFTER',
                item: vulpejs.item
              });
              vulpejs.doLoadProperties();
            }).error(httpErrorHandler);
          }
        }
      }
    },
    status: function(id, status) {
      vulpejs.operation = 'STATUS';
      vulpejs.message.clean();
      vulpejs.statusBefore(vulpejs);
      $http.post(vulpejs.rootContext + '/' + vulpejs.name + '/status', {
        id: id,
        status: status
      }).success(function() {
        if (vulpejs.item._id) {
          vulpejs.item.status = status;
        }
        vulpejs.message.success('Status successfully changed!');
        vulpejs.statusAfter(vulpejs);
        $timeout(function() {
          vulpejs.list($rootScope.currentPage + 1);
          vulpejs.focus();
        }, 100);
      }).error(httpErrorHandler);
    },
    datepicker: function($event) {
      $event.preventDefault();
      $event.stopPropagation();
      vulpejs.datepickerOpened = !vulpejs.datepickerOpened;
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
    tabNext: function() {
      if (vulpejs.showing) {
        $($("li.ng-isolate-scope").get($rootScope.selectedTab + 1)).find("a").trigger("click");
      }
    },
    tabPrevious: function() {
      if (vulpejs.showing) {
        $($("li.ng-isolate-scope").get($rootScope.selectedTab - 1)).find("a").trigger("click");
      }
    },
    tabFocus: function(focus) {
      if (focus && focus.length > 0) {
        $timeout(function() {
          vulpejs.focusTo(vulpejs.name + '-' + focus);
        }, 100);
      }
    },
    tabsHotkeys: function() {
      $(document).bind("keydown.left", function(evt) {
        vulpejs.tabPrevious();
        return false;
      }).bind("keydown.right", function(evt) {
        vulpejs.tabNext();
        return false;
      });
    },
    focusTo: function(id) {
      $(id.indexOf('#') !== 0 ? '#' + id : id).focus();
    },
    checkUncheckAll: function(items) {
      $rootScope.selectAll = !$rootScope.selectAll;
      angular.forEach($rootScope[items], function(item) {
        item.selected = $rootScope.selectAll;
      });
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
    typeaheadOnSelect: function(rootProperty, $item, itemProperty) {
      vulpejs.item[rootProperty] = $item[itemProperty];
    },
    selectOnChange: function(name, items, value, label) {
      if (typeof vulpejs.item[name] !== 'undefined') {
        $rootScope.vulpejs[items].forEach(function(option) {
          if (option[value] === vulpejs.item[name]) {
            $rootScope.vulpejs[name] = option;
          }
        });
      }
    },
    loadArray: function(options) {
      var from = options.from,
        to = options.to,
        label = options.label;
      $rootScope.vulpejs[to] = [];
      from = vulpejs.expressionEval(from);
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
    loadProperty: function(options) {
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
    flowFilesSubmit: function($flow) {
      $flow.upload();
    }
  };
  vulpejs.debug = $cookieStore.get('debug') || vulpejs.debug;

  if (window.location.search) {
    var search = window.location.search.substring(1);
    var status = function(value) {
      var parts = value.split('=');
      if (parts[0] === 'status') {
        vulpejs.filter.status = parts[1];
      }
    }
    if (search.indexOf('&') !== -1) {
      search.split('&').forEach(function(value) {
        if (value.indexOf('status=') !== -1) {
          status(value);
        }
      });
    } else {
      status(search);
    }
  }

  var service = function(options) {
    if (options) {
      vulpejs.debug = options.debug || false;
      vulpejs.name = options.name;
      vulpejs.listUrl = options.listUrl || '/' + options.name + 's';
      vulpejs.predicate = options.predicate || '';
      if (options.populate) {
        vulpejs.populate = options.populate;
      }
      if (options.focus) {
        vulpejs.focus = function() {
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
        vulpejs.messages = options.messages;
      }
      vulpejs.hotkeys = options.hotkeys || nothing;
      if (options.list) {
        if (options.list.filter) {
          vulpejs.listFilter = options.list.filter;
        }
        vulpejs.listBefore = options.list.before || nothing;
        vulpejs.listAfter = options.list.after || nothing;
      }
      if (options.actions) {
        vulpejs.newItem = options.actions.newItem || nothing;
        if (options.actions.focus) {
          vulpejs.focus = options.actions.focus;
        }
        vulpejs.validate = options.actions.validate || nothing;
        vulpejs.createBefore = options.actions.createBefore || nothing;
        vulpejs.createAfter = options.actions.createAfter || nothing;
        vulpejs.cloneBefore = options.actions.cloneBefore || nothing;
        vulpejs.cloneAfter = options.actions.cloneAfter || nothing;
        vulpejs.findBefore = options.actions.findBefore || nothing;
        vulpejs.findAfter = options.actions.findAfter || nothing;
        vulpejs.saveBefore = options.actions.saveBefore || nothing;
        vulpejs.saveAfter = options.actions.saveAfter || nothing;
        vulpejs.statusBefore = options.actions.statusBefore || nothing;
        vulpejs.statusAfter = options.actions.statusAfter || nothing;
        if (options.actions.removeBefore) {
          $rootScop.vulpejse.removeBefore = options.actions.removeBefore;
        }
        vulpejs.removeAfter = options.actions.removeAfter || nothing;
        vulpejs.cancelBefore = options.actions.cancelBefore || nothing;
        vulpejs.cancelAfter = options.actions.cancelAfter || nothing;
      }
      if (options.load) {
        vulpejs.loadArrays = options.load.arrays || [];
        vulpejs.loadProperties = options.load.properties || [];
      }
      if (options.error) {
        vulpejs.errorHandler = options.error.handle || nothing;
      }
      vulpejs.init = options.init || nothing;
    } else {
      vulpejs.debug = false;
    }
  };

  var httpErrorHandler = function(data, status, header, config) {
    if (angular.isFunction($rootScope.errorHandler)) {
      vulpejs.errorHandler({
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
          vulpejs.message.info(vulpejs.messages.validate.save.exists);
        } else if (vulpejs.operation === 'REMOVE') {
          vulpejs.message.info(vulpejs.messages.validate.remove.exists);
        }
      }
    } else {
      vulpejs.message.error('An error occurred in the execution.');
    }
  };

  var clearHistory = function() {
    vulpejs.history = [];
    vulpejs.historyItems = [];
    vulpejs.historyVersion = null;
  };
  var clearItem = function(show) {
    vulpejs.item = vulpejs.newItem(vulpejs);
    vulpejs.item = vulpejs.propertiesEval(vulpejs.item);
    vulpejs.showing = show;
    clearHistory();
  };
  var addJSONValue = function(item, key, value) {
    var json = JSON.stringify(item);
    json = json.substring(0, json.length - 1) + ", \"" + key + "\":\"" + value + "\"}";
    return JSON.parse(item);
  };

  service.prototype.init = function($scope) {
    $authenticator.userDetails();
    vulpejs.init(vulpejs);
    if (application.init) {
      vulpe.util.tryExecute(application.init);
    }
    if ($scope) {
      $(document).ready(function() {
        if ($scope.mainForm) {
          $rootScope.form = $scope.mainForm;
        };
        $scope.multiSelectTranslation = {
          selectAll: i18n.__('Select all'),
          selectNone: i18n.__('Select none'),
          reset: i18n.__('Reset'),
          search: i18n.__('Search'),
          nothingSelected: i18n.__('Nothing is selected')
        }
      });
    }
    if (vulpejs.name) {
      clearItem(false);
      vulpejs.validate();
      vulpejs.list();
      if (vulpejs.loadArrays.length > 0) {
        angular.forEach(vulpejs.loadArrays, function(array) {
          vulpejs.loadArray(array);
        });
      }
      vulpejs.hotkeys();
      vulpejs.tabsHotkeys();
      vulpejs.focus();
    }
    return $rootScope.vulpejs;
  };
  service.prototype.store = $store;

  $rootScope.vulpejs = vulpejs;

  return service;
}]);