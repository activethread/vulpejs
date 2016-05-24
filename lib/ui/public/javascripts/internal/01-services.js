'use strict';

/* Services */
angular.module('app.services', ['ui.bootstrap', 'ui.router', 'dialogs', 'i18n', 'ngCookies', 'ngResource']).config([
  '$stateProvider', '$urlRouterProvider',
  function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');
    $(document).ready(function() {
      var states = [];
      $('[ui-sref]').each(function(index, element) {
        var $this = $(element);
        var state = $this.attr('ui-sref');
        if (states.indexOf(state) === -1) {
          states.push(state);
          var url = '/' + state.replace(/\./g, '/');
          $stateProvider.state(state, {
            url: url,
            templateUrl: url
          });
        }
      });
    });
  }
]).factory('$store', ['$parse', '$cookieStore', function($parse, $cookieStore) {
  /**
   * Global Vars
   */
  var storage = (typeof window.localStorage === 'undefined') ? undefined : window.localStorage,
    supported = !(typeof storage === 'undefined' || typeof window.JSON === 'undefined');

  var privateMethods = {
    /**
     * Pass any type of a string from the localStorage to be parsed so it returns a usable version (like an Object)
     *
     * @param res -
     *            a string that will be parsed for type
     * @return {*} - whatever the real type of stored value was
     */
    parseValue: function(res) {
      var value;
      try {
        value = JSON.parse(res);
        if (typeof value === 'undefined') {
          value = res;
        }
        if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else if (parseFloat(value) === value && !angular.isObject(value)) {
          value = parseFloat(value);
        }
      } catch (e) {
        value = res;
      }
      return value;
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
}]).factory('$authenticator', ['$rootScope', '$store', function($rootScope, $store) {
  return {
    user: function(value) {
      if (value) {
        return $store.set('userDetails', value);
      } else {
        var user = $store.get('userDetails');
        if (user) {
          user.is = function(roles) {
            if (typeof roles === 'string') {
              return user.roles.indexOf(roles) !== -1;
            } else {
              for (var i = 0; i < roles.length; i++) {
                var role = roles[i];
                if (user.roles.indexOf(role) !== -1) {
                  return true;
                }
              }
            }
            return false;
          };
        }
        return user;
      }
    },
    login: function(user) {
      $store.set('userDetails', user);
    },
    logout: function() {
      $store.remove('userDetails');
      if (application && application.login && application.login.arrays) {
        application.login.arrays.forEach(function(name) {
          $store.remove(name);
        });
      }
    }
  };
}]).factory('$messages', ['$rootScope', function($rootScope) {
  return {
    type: '',
    message: '',
    add: function(type, msg) {
      this.type = type;
      this.message = msg;
      this.broadcast();
    },
    error: function(msg) {
      this.type = 'danger';
      this.message = msg;
      this.broadcast();
    },
    info: function(msg) {
      this.type = 'info';
      this.message = msg;
      this.broadcast();
    },
    warning: function(msg) {
      this.type = 'warning';
      this.message = msg;
      this.broadcast();
    },
    success: function(msg) {
      this.type = 'success';
      this.message = msg;
      this.broadcast();
    },
    clean: function() {
      this.broadcastClean();
    },
    broadcast: function() {
      $rootScope.$broadcast('vulpejs-messages');
    },
    broadcastClean: function() {
      $rootScope.$broadcast('vulpejs-messages-clean');
    }
  };
}]).factory('VulpeJS', ['$rootScope', '$parse', '$http', '$authenticator', '$messages', '$dialogs', '$timeout', '$interval', 'i18n', '$store', '$cookieStore', '$cookies', '$sce', '$window', '$filter', '$resource', '$state', function($rootScope, $parse, $http, $authenticator, $messages, $dialogs, $timeout, $interval, i18n, $store, $cookieStore, $cookies, $sce, $window, $filter, $resource, $state) {
  var nothing = function() {};
  var empty = function() {
    return '';
  };

  var result = {
    ok: function() {
      return true;
    },
    cancel: function() {
      return false;
    }
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
    $interval: $interval,
    $filter: $filter,
    $window: $window,
    $parse: $parse,
    $resource: $resource,
    $state: $state,
    auth: {
      user: $authenticator.user()
    },
    interval: {
      add: function(execute, interval, name) {
        if (name) {
          vulpejs.interval.items[name] = $interval(execute, interval);
          return;
        }
        vulpejs.interval.items.push($interval(execute, interval));
      },
      cancel: function(name) {
        if (name) {
          $interval.cancel(vulpejs.interval.items[name]);
          return;
        }
        vulpejs.interval.items.forEach(function(item) {
          $interval.cancel(item);
        });
      },
      items: []
    },
    timeout: {
      add: function(execute, timeout, name) {
        if (name) {
          vulpejs.timeout.items[name] = $timeout(execute, timeout);
          return;
        }
        vulpejs.timeout.items.push($timeout(execute, timeout || 100));
      },
      cancel: function(name) {
        if (name) {
          $timeout.cancel(vulpejs.timeout.items[name]);
          return;
        }
        vulpejs.timeout.items.forEach(function(item) {
          $timeout.cancel(item);
        });
      },
      items: []
    },
    broadcast: function(name) {
      $rootScope.$broadcast(name);
    },
    parse: function(name) {
      return $parse(name);
    },
    i18n: function(text) {
      return i18n.__(text);
    },
    now: {
      date: new Date(),
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      day: new Date().getDate(),
      dayOfWeek: new Date().getDay(),
      formatted: {
        date: function(pattern) {
          moment().format(pattern || 'DD/MM/YYYY');
        },
        time: function(pattern) {
          moment().format(pattern || 'HH:MM:SS');
        },
        datetime: function(pattern) {
          moment().format(pattern || 'DD/MM/YYYY HH:MM:SS');
        }
      }
    },
    ever: {},
    store: function(name, value) {
      return typeof value !== 'undefined' ? $store.set(name, value) : $store.get(name);
    },
    watch: function(value, callback, equals) {
      if (angular.isArray(value)) {
        value.forEach(function(property) {
          $rootScope.$watch(property, callback, equals);
        });
      } else if (angular.isObject(value) && value.item && value.properties) {
        value.properties.forEach(function(property) {
          $rootScope.$watch(value.item + '.' + property, callback, equals);
        });
      } else {
        $rootScope.$watch(value, callback, equals);
      }
    },
    filter: {
      date: function(value, pattern) {
        return vulpejs.$filter('date')(value, pattern);
      }
    },
    message: {
      success: function(msg) {
        $messages.success(msg);
      },
      error: function(msg) {
        $messages.error(msg);
      },
      info: function(msg) {
        $messages.info(msg);
      },
      warning: function(msg) {
        $messages.warning(msg);
      },
      clean: function() {
        $messages.clean();
      }
    },
    dialog: {
      confirm: function(options) {
        $dialogs.confirm(vulpejs.i18n('Confirmation'), vulpejs.i18n(options.message)).result.then(function(btn) {
          vulpejs.utils.execute(options.callback.yes ? options.callback.yes : options.callback, btn);
        }, function(btn) {
          vulpejs.utils.execute(options.callback.no, btn);
        });
      }
    },
    resource: {},
    error: {
      handleBefore: result.ok,
      handle: function(response) {
        console.error({
          data: response.data,
          status: response.status,
          header: response.header,
          config: response.config
        });
        vulpejs.error.handleBefore();
        var data = response.data;
        if (angular.isFunction(vulpejs.http.error.handle)) {
          vulpejs.http.error.handle({
            operation: vulpejs.operation,
            data: data,
            status: status,
            header: header,
            config: config,
            vulpejs: vulpejs
          });
        } else if (data.validate && data.validate.exists) {
          if (vulpejs.operation === 'SAVE') {
            vulpejs.message.info(vulpejs.model.messages.validate.save.exists);
          } else if (vulpejs.operation === 'REMOVE') {
            vulpejs.message.info(vulpejs.model.messages.validate.remove.exists);
          }
        } else {
          vulpejs.message.error('An error occurred in the execution.');
        }
        vulpejs.error.handleAfter();
      },
      handleAfter: nothing
    },
    rest: function(value, methods) {
      if (!methods) {
        methods = {};
      }
      methods.query = {
        method: 'GET',
        isArray: false
      };
      methods.update = {
        method: 'PUT',
        params: {
          id: "@id"
        }
      };
      return $resource(vulpejs.url.get(value || ':id'), {
        id: '@id'
      }, methods);
    },
    http: {
      rest: {
        generic: function(options) {
          vulpejs.http[options.method]({
            url: vulpejs.url.get({
              service: options.service,
              uri: options.uri
            }),
            callback: {
              success: function(result) {
                vulpejs.utils.execute(options.callback, result);
              },
              error: vulpejs.error.handle
            }
          });
        },
        get: function(options) {
          options.method = 'get';
          vulpejs.http.rest.generic(options);
        },
        remove: function(options) {
          options.method = 'delete';
          vulpejs.http.rest.generic(options);
        }
      },
      get: function(options) {
        $http({
          url: options.url,
          params: options.params || {}
        }).then(function(response) {
          vulpejs.utils.execute(options.callback.success ? options.callback.success : options.callback, response.data);
        }, function(response) {
          vulpejs.utils.execute(options.callback.error, response);
        });
      },
      'delete': function(options) {
        $http({
          url: options.url,
          method: 'DELETE',
          params: options.params || {}
        }).then(function(response) {
          vulpejs.utils.execute(options.callback.success ? options.callback.success : options.callback, response.data);
        }, function(response) {
          vulpejs.utils.execute(options.callback.error, response);
        });
      },
      post: function(options) {
        $http.post(options.url, options.data).then(function(response) {
          vulpejs.utils.execute(options.callback.success ? options.callback.success : options.callback, response.data);
        }, function(response) {
          vulpejs.utils.execute(options.callback.error, response);
        });
      },
      error: {
        handle: {}
      },
      put: function(options) {
        $http.put(options.url, options.data).then(function(response) {
          vulpejs.utils.execute(options.callback.success ? options.callback.success : options.callback, response.data);
        }, function(data, status, header, config) {
          vulpejs.utils.execute(options.callback.error, {
            data: data,
            status: status,
            header: header,
            config: config
          });
        });
      },
      ajax: function(options) {
        $.ajax({
          url: options.url
        }).done(function(data) {
          vulpejs.utils.execute(options.callback.success ? options.callback.success : options.callback, data);
        }).fail(function(error) {
          vulpejs.utils.execute(options.callback.error, error);
        });
      }
    },
    context: {},
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
        save: {
          success: 'Record successfully saved!'
        },
        remove: {
          success: 'Record successfully deleted!'
        },
        clone: {
          success: 'Record successfully cloned!'
        },
        status: {
          success: 'Status successfully changed!'
        },
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
      cancelBefore: result.ok,
      cancel: function() {
        vulpejs.operation = 'CANCEL';
        var doCancel = function() {
          vulpejs.ui.form.main.submitted = false;
          vulpejs.ui.form.items.submitted = false;
          vulpejs.model.cancelBefore(vulpejs);
          vulpejs.doDebug({
            type: 'CANCEl-BEFORE',
            item: vulpejs.item
          });
          vulpejs.helper.clear.item(false);
          vulpejs.model.cancelAfter(vulpejs);
          vulpejs.doDebug({
            type: 'CANCEl-AFTER',
            item: vulpejs.item
          });
          vulpejs.ui.focus();
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
      cloneBefore: result.ok,
      clone: function(item) {
        vulpejs.operation = 'CLOSE';
        vulpejs.message.clean();
        vulpejs.model.cloneBefore(vulpejs);
        vulpejs.doDebug({
          type: 'CLONE-BEFORE',
          item: vulpejs.item
        });
        vulpejs.itemOld = vulpejs.copy(item);
        delete vulpejs.item._id;
        vulpejs.ui.showing = true;
        vulpejs.helper.clear.history();
        vulpejs.message.success(vulpejs.model.messages.clone.success);
        vulpejs.model.cloneAfter(vulpejs);
        vulpejs.doDebug({
          type: 'CLONE-AFTER',
          item: vulpejs.item
        });
        vulpejs.helper.load.properties();
        vulpejs.ui.focus();
      },
      cloneAfter: nothing,
      closeBefore: result.ok,
      close: function(item) {
        vulpejs.operation = 'CLOSE';
        vulpejs.message.clean();
        vulpejs.model.closeBefore(vulpejs);
        vulpejs.doDebug({
          type: 'CLOSE-BEFORE',
          item: vulpejs.item
        });
        vulpejs.ui.showing = true;
        vulpejs.helper.clear.history();
        vulpejs.model.closeAfter(vulpejs);
        vulpejs.doDebug({
          type: 'CLOSE-AFTER',
          item: vulpejs.item
        });
        vulpejs.helper.load.properties();
        vulpejs.ui.focus();
      },
      closeAfter: nothing,
      createBefore: result.ok,
      create: function() {
        vulpejs.operation = 'CREATE';
        var doCreate = function() {
          vulpejs.ui.form.main.submitted = false;
          vulpejs.ui.form.items.submitted = false;
          vulpejs.model.createBefore(vulpejs);
          vulpejs.doDebug({
            type: 'CREATE-BEFORE',
            item: vulpejs.item
          });
          vulpejs.helper.clear.item(true);
          vulpejs.ui.focus();
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
      findBefore: result.ok,
      find: function(id) {
        vulpejs.operation = 'FIND';
        vulpejs.model.findBefore(vulpejs);
        vulpejs.doDebug({
          type: 'FIND-BEFORE',
          item: vulpejs.item
        });
        $http.get(vulpejs.url.get() + (vulpejs.model.populate ? '/populate' : '') + '/' + id).then(function(response) {
          var data = response.data;
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
          vulpejs.helper.load.properties();
          vulpejs.itemOld = vulpejs.copy(vulpejs.item);
          vulpejs.ui.focus();
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
        list: function(options) {
          vulpejs.helper.clear.history();
          if (!options) {
            options = {
              page: 1
            };
          }
          if (!options.page) {
            options.page = 1;
          }
          $http.get(vulpejs.url.get() + '/history/' + vulpejs.item._id + '/page/' + options.page).then(function(response) {
            var data = response.data;
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
      listBefore: result.ok,
      list: function(options) {
        vulpejs.operation = 'LIST';
        if (!options) {
          options = {
            form: 'items'
          };
        }
        if (!options.form) {
          options.form = 'items';
        }
        if (!vulpejs.ui.form[options.form]) {
          return;
        }
        if (!vulpejs.ui.form[options.form].$valid) {
          vulpejs.ui.form.validate();
          return;
        }
        if (!options.page) {
          options.page = 1;
          vulpejs.currentPage = 0;
        }
        vulpejs.model.listBefore(vulpejs);
        vulpejs.doDebug({
          type: 'LIST-BEFORE',
          items: vulpejs.items
        });
        var filter = vulpejs.model.search.filter(vulpejs);
        if (vulpejs.model.filter.search) {
          filter = '/search/' + vulpejs.model.filter.search;
        }
        filter += '/page/' + options.page;
        $http.get(vulpejs.url.get(vulpejs.url.list) + filter).then(function(response) {
          var data = response.data;
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
      saveBefore: result.ok,
      saveType: '',
      save: function(options) {
        vulpejs.operation = 'SAVE';
        if (!options) {
          options = {
            form: 'main'
          };
        }
        if (!options.form) {
          options.form = 'main';
        }
        vulpejs.model.updated = false;
        if (!vulpejs.ui.form[options.form]) {
          return;
        }
        if (!vulpejs.ui.form[options.form].$valid) {
          vulpejs.ui.form.validate();
          return;
        }
        if (options.type) {
          vulpejs.model.saveType = type;
          return;
        }
        if (vulpejs.item._id) {
          vulpejs.model.updated = true;
        }
        if (!vulpejs.model.saveBefore(vulpejs)) {
          return;
        }
        vulpejs.doDebug({
          type: 'SAVE-BEFORE',
          item: vulpejs.item
        });
        vulpejs.message.clean();
        $http.post(vulpejs.url.get(), vulpejs.item).then(function(response) {
          var data = response.data;
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
          vulpejs.message.success(vulpejs.model.messages.save.success);
          vulpejs.timeout.add(function() {
            vulpejs.model.list({
              page: vulpejs.ui.pagination.current
            });
            vulpejs.ui.focus();
          });
          vulpejs.model.saveAfter(vulpejs);
          vulpejs.doDebug({
            type: 'SAVE-AFTER',
            item: vulpejs.item
          });
          vulpejs.helper.load.properties();
        }, vulpejs.error.handle);
      },
      saveAfter: nothing,
      search: {
        filter: function(vulpejs) {
          return !vulpejs.model.filter.status ? '' : '/status/' + vulpejs.model.filter.status;
        },
        doit: function($event) {
          if (vulpejs.model.filter.search && vulpejs.model.filter.search.length > 0) {
            vulpejs.model.list();
            return;
          }
          vulpejs.ui.focus('search-list');
        },
        cancel: function() {
          vulpejs.model.filter.search = '';
          vulpejs.model.list();
          vulpejs.ui.focus('search-list');
        },
        predicate: '',
        reverse: true
      },
      statusBefore: result.ok,
      status: function(id, status) {
        vulpejs.operation = 'STATUS';
        vulpejs.message.clean();
        vulpejs.model.statusBefore(vulpejs);
        $http.post(vulpejs.url.get() + '/status', {
          id: id,
          status: status
        }).then(function(response) {
          if (vulpejs.item._id) {
            vulpejs.item.status = status;
          }
          vulpejs.message.success(vulpejs.model.messages.status.success);
          vulpejs.model.statusAfter(vulpejs);
          vulpejs.timeout.add(function() {
            vulpejs.model.list({
              page: vulpejs.ui.pagination.current
            });
            vulpejs.ui.focus();
          });
        }, vulpejs.error.handle);
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
              url: vulpejs.url.get(vulpejs.ui.name) + '/' + id
            }).then(function(response) {
              vulpejs.helper.clear.item(false);
              vulpejs.model.list({
                page: vulpejs.ui.pagination.current
              });
              vulpejs.message.success(vulpejs.model.messages.remove.success);
              vulpejs.model.removeAfter(vulpejs);
            }, vulpejs.error.handle);
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
    regex: {
      time: new RegExp(/(\d)(?=(\d{2})+(?!\d))/g),
      weburl: new RegExp(
        "^" +
        // protocol identifier
        "(?:(?:https?|ftp)://)" +
        // user:pass authentication
        "(?:\\S+(?::\\S*)?@)?" +
        "(?:" +
        // IP address exclusion
        // private & local networks
        "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
        "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
        "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
        // IP address dotted notation octets
        // excludes loopback network 0.0.0.0
        // excludes reserved space >= 224.0.0.0
        // excludes network & broacast addresses
        // (first & last IP address of each class)
        "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
        "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
        "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
        "|" +
        // host name
        "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
        // domain name
        "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
        // TLD identifier
        "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
        ")" +
        // port number
        "(?::\\d{2,5})?" +
        // resource path
        "(?:/\\S*)?" +
        "$", "i"
      )
    },
    compare: {
      normal: function(a, b) {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        return 0;
      },
      reverse: function(a, b) {
        if (a > b) {
          return -1;
        }
        if (a < b) {
          return 1;
        }
        return 0;
      }
    },
    utils: {
      rand: function() {
        return Math.random().toString(36).substr(2);
      },
      token: function() {
        return vulpejs.utils.rand() + vulpejs.utils.rand();
      },
      time: {
        toHHMMSS: function(value) {
          var sec_num = parseInt(value, 10);
          var hours = Math.floor(sec_num / 3600);
          var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
          var seconds = sec_num - (hours * 3600) - (minutes * 60);
          if (hours < 10) {
            hours = '0' + hours;
          }
          if (minutes < 10) {
            minutes = '0' + minutes;
          }
          if (seconds < 10) {
            seconds = '0' + seconds;
          }
          var time = hours + ':' + minutes + ':' + seconds;
          return time;
        },
        clock: function(options) {
          if (!options.pattern) {
            options.pattern = 'HH:mm:ss';
          }
          $(options.name).html(options.timezone ? moment.tz(options.timezone).format(options.pattern) : moment().format(options.pattern));
          setTimeout(function() {
            vulpejs.utils.time.clock(options);
          }, 1000);
        }
      },
      date: {
        format: function(date) {
          if (date.indexOf('/') != -1) {
            return date.substring(3, 5) + '/' + date.substring(0, 2) + '/' + date.substring(6, 10);
          }
          return date.substring(2, 4) + '/' + date.substring(0, 2) + '/' + date.substring(4, 8);
        }
      },
      execute: function(command, data) {
        if (typeof(command) === 'function') {
          if (data) {
            command(data);
          } else {
            command();
          }
        }
      },
      protocol: function() {
        return window.location.protocol + '//';
      },
      isEmpty: function(value) {
        var empty = true;
        if (typeof value === 'string' || (typeof value === 'object' && Object.prototype.toString.call(value) === '[object Array]')) {
          empty = value.length === 0;
        }
        return empty;
      }
    },
    helper: {
      set: function(options) {
        if (!options.item) {
          options.item = vulpejs.now;
        }
        options.properties.forEach(function(property) {
          options.item[property] = options.value;
        });
      },
      toggle: function(name) {
        vulpejs.now[name] = !vulpejs.now[name];
      },
      off: function(options) {
        if (angular.isArray(options)) {
          options.forEach(function(property) {
            vulpejs.now[property] = false;
          });
        } else {
          if (!options.item) {
            options.item = vulpejs.now;
          }
          options.properties.forEach(function(property) {
            options.item[property] = false;
          });
        }
      },
      on: function(options) {
        if (angular.isArray(options)) {
          options.forEach(function(property) {
            vulpejs.now[property] = true;
          });
        } else {
          if (!options.item) {
            options.item = vulpejs.now;
          }
          options.properties.forEach(function(property) {
            options.item[property] = true;
          });
        }
      },
      clear: {
        history: function() {
          vulpejs.itemHistory.data = [];
          vulpejs.itemHistory.items = [];
          vulpejs.itemHistory.version = null;
        },
        item: function(show) {
          vulpejs.item = vulpejs.copy(vulpejs.model.item);
          vulpejs.item = vulpejs.eval.properties(vulpejs.item);
          vulpejs.helper.clear.history();
          vulpejs.timeout.add(function() {
            vulpejs.itemOld = vulpejs.copy(vulpejs.item);
          });
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
          if (!from) {
            return;
          }
          if (from.length > 0) {
            $http.get(from).then(function(response) {
              var data = response.data;
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
              vulpejs.helper.load.property(property);
            });
          }
        }
      },
      label: function(array, properties) {
        angular.forEach(array, function(value) {
          properties.forEach(function(property) {
            if (value.label) {
              value.label += ' - ' + value[property];
            } else {
              value.label = value[property];
            }
          });
        });
        return array;
      }
    },
    eval: {
      expression: function(text) {
        var newText = text;
        if (!/^{(.*)\}$/.test(text)) {
          return text;
        }
        var expression = text.match(/\{(.*)\}/);
        var parts = expression[1].split(':');
        newText = newText.replace(expression[0], '');
        var value = '';
        var object = '';
        if (parts.length > 1) {
          if (parts[1].indexOf('.') !== -1) {
            object = parts[1].split('.');
            if (parts[0] === 'store') {
              value = $store.get(object[0]) ? $store.get(object[0])[object[1]] : '';
            } else {
              value = $rootScope.vulpejs[object[0]] ? $rootScope.vulpejs[object[0]][object[1]] : '';
            }
          } else {
            if (parts[0] === 'moment') {
              if (parts[1] === 'current') {
                value = moment().format('DD/MM/YYYY');
              } else {
                value = moment().format(parts[1].replace(/\-/g, ':'));
              }
            } else if (parts[0] === 'store') {
              value = $store.get(parts[1]) ? $store.get(parts[1]) : '';
            } else {
              value = $rootScope.vulpejs[parts[1]] ? $rootScope.vulpejs[parts[1]] : '';
            }
          }
        } else {
          if (parts[0].indexOf('.') !== -1) {
            object = parts[0].split('.');
            value = $rootScope.vulpejs[object[0]][object[1]];
          } else {
            value = $rootScope.vulpejs[parts[0]];
          }
        }
        if (value.length === 0) {
          newText = '';
        } else {
          newText += value;
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
      event: {
        propagation: {
          force: function() {
            vulpejs.now.uiEventPropagationForce = true;
          }
        }
      },
      form: {
        main: {},
        items: {},
        submit: function() {
          if (vulpejs.operation === 'CREATE') {
            vulpejs.model.save();
            return;
          }
          vulpejs.model.list({
            page: 0
          });
        },
        validate: function() {
          for (var property in vulpejs.item) {
            if (vulpejs.item.hasOwnProperty(property)) {
              var value = vulpejs.item[property];
              var id = vulpejs.ui.name.replace(/\-/g, '') + '-' + (vulpejs.operation === 'LIST' ? 'items-' : 'main-') + property.replace(/\./g, '-');
              var element = vulpejs.ui.get(id);
              if (vulpejs.empty(value) && element.length === 1) {
                vulpejs.timeout.add(function() {
                  element.focus();
                });
                break;
              }
            }
          }
        }
      },
      forms: [],
      name: '',
      showing: false,
      time: {
        clock: function(options) {
          if (!options.pattern) {
            options.pattern = 'HH:mm:ss';
          }
          vulpejs.ui.get(options.name).html(options.timezone ? moment.tz(options.timezone).format(options.pattern) : moment().format(options.pattern));
          vulpejs.timeout.add(function() {
            vulpejs.ui.time.clock(options);
          }, 1000);
        }
      },
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
            vulpejs.ui.focus(vulpejs.ui.name.replace(/\-/g, '') + '-' + focus);
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
      focus: function(value, time) {
        if (value) {
          vulpejs.timeout.add(function() {
            vulpejs.ui.get(value).focus();
          }, time);
        }
      },
      get: function(value) {
        if (value.indexOf('#') === 0 || value.indexOf('.') === 0) {
          return $(value);
        }
        var element = $('#' + value);
        if (element.length === 0) {
          element = $('.' + value);
        }
        if (element.length === 0) {
          element = $('input[name="' + value + '"]').filter(function() {
            return this.value === '';
          });
        }
        return element;
      },
      active: function(id, bool) {
        if (typeof bool !== 'undefined' && !bool) {
          vulpejs.ui.get(id).removeClass('active');
          return;
        }
        vulpejs.ui.get(id).addClass('active');
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
            vulpejs.item[options.rootProperty] = options.item[options.itemProperty];
          }
        },
        toggle: {
          'default': function(model, value) {}
        }
      },
      uploader: {
        removeAll: function() {
          angular.forEach($rootScope.queue, function(file) {
            if (file.selected) {
              vulpejs.http['delete']({
                url: file.url,
                params: {},
                callback: function() {
                  for (var i = 0; i < $rootScope.queue.length; i++) {
                    if ($rootScope.queue[i].name === file.name) {
                      $rootScope.queue.splice(i, 1);
                    }
                  }
                }
              });
            }
          });
        },
        on: {
          submit: function() {},
          add: function() {}
        },
        flow: {
          submitBefore: result.ok,
          submitAfter: nothing,
          submit: function($flow, model, params) {
            $flow.status = 'UPLOADING';
            var $model = $parse(model);
            vulpejs.ui.uploader.flow.submitBefore($flow, $model, model, params);
            $flow.upload();
            vulpejs.ui.uploader.flow.submitAfter($flow, $model, model, params);
          },
          successBefore: result.ok,
          successAfter: nothing,
          success: function($flow, $file, model, params) {
            var $model = $parse(model);
            vulpejs.ui.uploader.flow.successBefore($flow, $file, $model, model, params);
            $model.assign($rootScope, window.location.origin + '/flow/download/' + $file.uniqueIdentifier + '?' + Date.now());
            vulpejs.ui.uploader.flow.successAfter($flow, $file, $model, model, params);
            $file.uploaded = true;
            $flow.status = 'NONE';
          },
          cancelBefore: result.ok,
          cancelAfter: nothing,
          cancel: function($flow, model) {
            $flow.status = 'NONE';
            var $model = $parse(model);
            vulpejs.ui.uploader.flow.cancelBefore($flow, $model, model);
            var value = $model($rootScope).split('/').pop();
            var position = value.indexOf('?');
            if (position !== -1) {
              value = value.substring(0, position);
            }
            vulpejs.http['delete']({
              url: '/flow/clean/' + value,
              callback: function() {
                $flow.cancel();
                $model.assign($rootScope, '');
                vulpejs.ui.uploader.flow.cancelAfter($flow, $model, model);
              }
            });
          },
          removeBefore: result.ok,
          removeAfter: nothing,
          remove: function($flow, model) {
            vulpejs.dialog.confirm({
              message: 'Do you really want to delete?',
              callback: function() {
                $flow.status = 'NONE';
                var $model = $parse(model);
                vulpejs.ui.uploader.flow.removeBefore($flow, $model, model);
                var value = $model($rootScope).split('/').pop();
                var position = value.indexOf('?');
                if (position !== -1) {
                  value = value.substring(0, position);
                }
                vulpejs.http['delete']({
                  url: '/flow/clean/' + value,
                  callback: function() {
                    $model.assign($rootScope, '');
                    vulpejs.ui.uploader.flow.removeAfter($flow, $model, model);
                  }
                });
              }
            });
          }
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
            vulpejs.model.history.list({
              page: newPageNumber
            });
            vulpejs.itemHistory.version = null;
          }
        },
        changeHandler: function(newPageNumber) {
          vulpejs.message.clean();
          vulpejs.ui.pagination.current = newPageNumber;
          vulpejs.model.list({
            page: newPageNumber
          });
        }
      }
    },
    equals: function(item, property, value) {
      return item ? item[property] === value : false;
    },
    on: {
      ready: function(execute) {
        $(document).ready(function() {
          vulpejs.utils.execute(execute);
        });
      },
      change: function(type) {},
      broadcast: {
        event: function(name, execute) {
          $rootScope.$on(name, execute);
        }
      }
    },
    hasChanged: function(value, valueOld) {
      if (!value && !valueOld) {
        value = vulpejs.item;
        valueOld = vulpejs.itemOld;
      }
      return angular.toJson(value) !== angular.toJson(valueOld);
    },
    empty: function(value) {
      return vulpejs.utils.isEmpty(value);
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
      if (options.context) {
        vulpejs.url.context = options.context;
      }
      vulpejs.url.list = options.plural || options.name + 's';
      vulpejs.model.search.predicate = options.predicate || '';
      if (options.populate) {
        vulpejs.model.populate = options.populate;
      }
      if (options.focus) {
        vulpejs.ui.focus = function(value, time) {
          vulpejs.timeout.add(function() {
            if (value) {
              vulpejs.ui.get(value).focus();
            } else {
              if (angular.isFunction(options.focus)) {
                options.focus(vulpejs);
              } else {
                var prefix = '#' + options.name.replace(/\-/g, '') + '-';
                if (angular.isObject(options.focus)) {
                  if (vulpejs.operation === 'LIST') {
                    $(options.focus.list ? prefix + options.focus.list : '#search-list').focus();
                  } else {
                    $(prefix + (vulpejs.item._id ? options.focus.edit : options.focus.create)).focus();
                  }
                } else {
                  $(vulpejs.operation === 'LIST' ? '#search-list' : prefix + options.focus).focus();
                }
              }
            }
          }, time);
        };
      }
      if (options.messages) {
        for (var message in options.messages) {
          vulpejs.model.messages[message] = options.messages[message];
        }
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
        for (var action in options.actions) {
          vulpejs.model[action] = options.actions[action];
        }
      }
      if (options.load) {
        vulpejs.load.arrays = options.load.arrays || [];
        vulpejs.load.properties = options.load.properties || [];
      }
      if (options.error) {
        vulpejs.error.handle = options.error.handle || nothing;
      }
      vulpejs.ui.menu = options.menu || {};
      vulpejs.init = options.init || nothing;
    } else {
      vulpejs.debug = false;
    }
  };

  service.prototype.init = function($scope) {
    if ($scope) {
      vulpejs.$scope = $scope;
    }
    return $rootScope.vulpejs;
  };
  service.prototype.store = $store;

  $rootScope.vulpejs = vulpejs;
  $rootScope.$on(
    '$destroy',
    function(event) {
      vulpejs.timeout.cancel();
    }
  );
  $rootScope.$on('$viewContentLoaded',
    function() {
      if ($rootScope.vulpejs) {
        async.waterfall([function(callback) {
            vulpejs.init(vulpejs);
            callback();
          },
          function(callback) {
            vulpejs.utils.execute(application.init, vulpejs);
            callback();
          },
          function(callback) {
            vulpejs.resource = vulpejs.rest();
            if (vulpejs.store('vulpejsEver')) {
              vulpejs.ever = vulpejs.store('vulpejsEver');
            } else {
              vulpejs.store('vulpejsEver', vulpejs.ever);
            }
            vulpejs.watch('vulpejs.ever', function() {
              vulpejs.store('vulpejsEver', vulpejs.ever);
            }, true);
            callback();
          },
          function(callback) {
            if (vulpejs.$scope) {
              $(document).ready(function() {
                for (var form in vulpejs.ui.forms) {
                  vulpejs.ui.form[form] = vulpejs.$scope[form + 'Form'];
                }
                vulpejs.$scope.multiSelectTranslation = {
                  selectAll: vulpejs.i18n('Select all'),
                  selectNone: vulpejs.i18n('Select none'),
                  reset: vulpejs.i18n('Reset'),
                  search: vulpejs.i18n('Search'),
                  nothingSelected: vulpejs.i18n('Nothing is selected')
                };
              });
            }
            callback();
          }
        ], function() {
          if (vulpejs.ui.name) {
            vulpejs.helper.clear.item(false);
            if (vulpejs.load.arrays.length > 0) {
              angular.forEach(vulpejs.load.arrays, function(array) {
                vulpejs.helper.load.array(array);
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
              vulpejs.model.list({
                page: vulpejs.ui.pagination.current
              });
            }
            vulpejs.ui.hotkeys();
            vulpejs.ui.tab.hotkeys();
            vulpejs.ui.focus();
            $('.nav .active').removeClass('active');
            if (vulpejs.ui.menu && vulpejs.ui.menu.active) {
              vulpejs.timeout.add(function() {
                if (angular.isArray(vulpejs.ui.menu.active)) {
                  var index = 0;
                  vulpejs.ui.menu.active.forEach(function(value) {
                    if (index > 0) {
                      vulpejs.ui.get(value).parent().addClass('in');
                    }
                    vulpejs.ui.active(value);
                    ++index;
                  });
                } else {
                  vulpejs.ui.active(vulpejs.ui.menu.active);
                }
              });
            }
          }
        });
      }
    });
  return service;
}]);
