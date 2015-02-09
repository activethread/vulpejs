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
  $rootScope.userDetails = {};
  return {
    userDetails: function() {
      $rootScope.userDetails = JSON.parse($store.get('userDetails'));
      return $rootScope.userDetails;
    },
    loginSuccessfully: function(user) {
      $rootScope.userDetails = user;
      $store.set('userDetails', JSON.stringify($rootScope.userDetails));
    },
    updateUserDetails: function() {
      $store.set('userDetails', JSON.stringify($rootScope.userDetails));
    },
    logoutSuccessfully: function() {
      this.userIsAuthenticated = false;
      $store.remove('userDetails');
      $store.remove('userIsAuthenticated');
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
    cleanAllMessages: function(msg) {
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
 * APP Manager Service to implement CRUD.
 * @param   {Object}         $rootScope     Root Scope
 * @param   {Object}         $http          HTTP
 * @param   {Object}         $authenticator Authenticator
 * @param   {Object}         $messages      Messages
 * @param   {Object}         $dialogs       Dialogs
 * @param   {Object}         $timeout       Timeout
 * @param   {Object}         i18n           I18N
 * @returns {String|Boolean}
 */
app.factory('AppManager', ['$rootScope', '$http', '$authenticator', '$messages', '$dialogs', '$timeout', 'i18n', function($rootScope, $http, $authenticator, $messages, $dialogs, $timeout, i18n) {

  $rootScope.onlyNumbers = /^\d+$/;
  $rootScope.showing = false;
  $rootScope.form = {};
  $rootScope.name = '';
  $rootScope.listUrl = '';
  $rootScope.predicate = '';
  $rootScope.reverse = true;
  $rootScope.item = {};
  $rootScope.items = [];
  $rootScope.history = [];
  $rootScope.historyItems = [];
  $rootScope.historyVersion = null;
  $rootScope.saveType = '';
  $rootScope.selectedTab = 0;
  // ACTIONS
  var nothing = function() {};
  var empty = function() {
    return '';
  };
  $rootScope.newItem = nothing;
  $rootScope.focus = nothing;
  $rootScope.hotkeys = nothing;
  $rootScope.listFilter = function(options) {
    return !options.filter.status ? '' : '/status/' + options.filter.status;
  };
  $rootScope.listBefore = nothing;
  $rootScope.listAfter = nothing;
  $rootScope.validate = nothing;
  $rootScope.createBefore = nothing;
  $rootScope.createAfter = nothing;
  $rootScope.findBefore = nothing;
  $rootScope.findAfter = nothing;
  $rootScope.saveBefore = nothing;
  $rootScope.saveAfter = nothing;
  $rootScope.cancelBefore = nothing;
  $rootScope.cancelAfter = nothing;
  $rootScope.removeBefore = function(id, callback) {
    callback();
  };
  $rootScope.removeAfter = nothing;

  $rootScope.loadArrays = [];

  $rootScope.errorHandler = {};

  $rootScope.filter = {
    status: ''
  };

  var service = function(options) {
    $rootScope.name = options.name;
    if (options.listUrl) {
      $rootScope.listUrl = options.listUrl;
    } else {
      $rootScope.listUrl = '/' + options.name + 's';
    }
    if (options.predicate) {
      $rootScope.predicate = options.predicate;
    }
    if (options.focus) {
      $rootScope.focus = function() {
        $('#' + options.name + '-' + options.focus).focus();
      };
    }
    if (angular.isFunction(options.hotkeys)) {
      $rootScope.hotkeys = options.hotkeys;
    }
    if (options.list) {
      if (angular.isFunction(options.list.filter)) {
        $rootScope.listFilter = options.list.filter;
      }
      if (angular.isFunction(options.list.before)) {
        $rootScope.listBefore = options.list.before;
      }
      if (angular.isFunction(options.list.after)) {
        $rootScope.listAfter = options.list.after;
      }
    }
    if (options.actions) {
      if (angular.isFunction(options.actions.newItem)) {
        $rootScope.newItem = options.actions.newItem;
      }
      if (angular.isFunction(options.actions.focus)) {
        $rootScope.focus = options.actions.focus;
      }
      if (angular.isFunction(options.actions.validate)) {
        $rootScope.validate = options.actions.validate;
      }
      if (angular.isFunction(options.actions.createBefore)) {
        $rootScope.createBefore = options.actions.createBefore;
      }
      if (angular.isFunction(options.actions.createAfter)) {
        $rootScope.createAfter = options.actions.createAfter;
      }
      if (angular.isFunction(options.actions.findBefore)) {
        $rootScope.findBefore = options.actions.findBefore;
      }
      if (angular.isFunction(options.actions.findAfter)) {
        $rootScope.findAfter = options.actions.findAfter;
      }
      if (angular.isFunction(options.actions.saveBefore)) {
        $rootScope.saveBefore = options.actions.saveBefore;
      }
      if (angular.isFunction(options.actions.saveAfter)) {
        $rootScope.saveAfter = options.actions.saveAfter;
      }
      if (angular.isFunction(options.actions.removeBefore)) {
        $rootScope.removeBefore = options.actions.removeBefore;
      }
      if (angular.isFunction(options.actions.removeAfter)) {
        $rootScope.removeAfter = options.actions.removeAfter;
      }
      if (angular.isFunction(options.actions.cancelBefore)) {
        $rootScope.cancelBefore = options.actions.cancelBefore;
      }
      if (angular.isFunction(options.actions.cancelAfter)) {
        $rootScope.cancelAfter = options.actions.cancelAfter;
      }
    }
    if (options.load && options.load.arrays) {
      $rootScope.loadArrays = options.load.arrays;
    }
    if (options.error) {
      if (angular.isFunction(options.error.handle)) {
        $rootScope.errorHandler = options.error.handle;
      }
    }
  };

  var options = {
    $rootScope: $rootScope
  };

  // PAGINATION CONFIG
  $rootScope.currentPage = 0;
  $rootScope.pageSize = 1;
  $rootScope.historyCurrentPage = 0;
  $rootScope.historyPageSize = 1;

  $rootScope.prevPage = function(history) {
    $messages.cleanAllMessages();
    if (history) {
      if ($rootScope.historyCurrentPage > 0) {
        $rootScope.historyCurrentPage--;
        $rootScope.historyList($rootScope.historyCurrentPage);
        $rootScope.historyVersion = null;
      }
    } else {
      if ($rootScope.currentPage > 0) {
        $rootScope.currentPage--;
        $rootScope.list($rootScope.currentPage);
      }
    }
  };

  $rootScope.nextPage = function(history) {
    $messages.cleanAllMessages();
    if (history) {
      if ($rootScope.historyCurrentPage < $rootScope.historyPageSize - 1) {
        $rootScope.historyCurrentPage++;
        $rootScope.historyList($rootScope.historyCurrentPage + 1);
        $rootScope.historyVersion = null;
      }
    } else {
      if ($rootScope.currentPage < $rootScope.pageSize - 1) {
        $rootScope.currentPage++;
        $rootScope.list($rootScope.currentPage + 1);
      }
    }
  };

  $rootScope.setPage = function(history) {
    if (history) {
      $messages.cleanAllMessages();
      $rootScope.historyCurrentPage = this.n;
      $rootScope.historyList($rootScope.historyCurrentPage + 1);
      $rootScope.historyVersion = null;
    } else {
      $messages.cleanAllMessages();
      $rootScope.currentPage = this.n;
      $rootScope.list($rootScope.currentPage + 1);
    }
  };

  $rootScope.range = function(start, end) {
    var ret = [];
    if (!end) {
      end = start;
      start = 0;
    }
    for (var i = start; i < end; i++) {
      ret.push(i);
    }
    return ret;
  };

  var errorHandler = function(operation, data, status, header, config) {
    if (angular.isFunction($rootScope.errorHandler)) {
      $rootScope.errorHandler({
        operation: operation,
        data: data,
        status: status,
        header: header,
        config: config,
        messages: $messages
      });
    } else {
      $messages.addErrorMessage('An error occurred in the execution.');
    }
  }

  //
  $rootScope.create = function() {
    $rootScope.createBefore(options);
    $rootScope.item = $rootScope.newItem(options);
    $rootScope.showing = true;
    clearHistory();
    $timeout(function() {
      $rootScope.focus();
    }, 100);
    $rootScope.createAfter(options);
  };

  var clearHistory = function() {
    $rootScope.history = [];
    $rootScope.historyItems = [];
    $rootScope.historyVersion = null;
  };

  $rootScope.cancel = function() {
    $rootScope.cancelBefore(options);
    $rootScope.item = $rootScope.newItem(options);
    $rootScope.showing = false;
    clearHistory();
    $rootScope.cancelAfter(options);
  };

  $rootScope.historyCopy = function() {
    var valid = angular.isObject($rootScope.historyVersion);
    $rootScope.form.historySelected.$setValidity('historyNotSelected', valid);
    if (valid) {
      var version = $rootScope.item.version;
      $rootScope.item = $rootScope.historyVersion;
      if (version) {
        $rootScope.item.version = version;
      }
    }
  };

  $rootScope.list = function(page) {
    if (!page) {
      page = 1;
      $rootScope.currentPage = 0;
    }
    $rootScope.listBefore(options);
    var filter = $rootScope.listFilter({
      filter: $rootScope.filter
    });
    filter += '/page/' + page;
    $http.get(base.ng.rootContext + $rootScope.listUrl + filter).success(function(data) {
      $rootScope.items = data.items;
      $rootScope.pageSize = data.pageCount;
      $rootScope.listAfter(options);
    });
  };

  $rootScope.historyList = function(page) {
    clearHistory();
    if (!page) {
      page = 1;
    }
    $http.get(base.ng.rootContext + $rootScope.name + '/history/' + $rootScope.item._id + '/page/' + page).success(function(data) {
      $rootScope.history = data.items;
      if ($rootScope.history.length !== 0) {
        $rootScope.historyPageSize = data.pageCount;
        angular.forEach($rootScope.history, function(value, key) {
          $rootScope.historyItems.push(JSON.parse(value.content));
        });
      }
    });
  };

  $rootScope.find = function(id) {
    $rootScope.findBefore(options);
    $http.get(base.ng.rootContext + '/' + $rootScope.name + '/' + id).success(function(data) {
      $rootScope.item = data.item;
      $rootScope.showing = !$rootScope.showing;
      $rootScope.history = data.history.items;
      if ($rootScope.history.length !== 0) {
        $rootScope.historyPageSize = data.history.pageCount;
        angular.forEach($rootScope.history, function(value, key) {
          $rootScope.historyItems.push(JSON.parse(value.content));
        });
      }
      $rootScope.findAfter(options);
      $timeout(function() {
        $rootScope.focus();
      }, 100);
    });
  };

  $rootScope.remove = function(id) {
    var remove = function() {
      $messages.cleanAllMessages();
      $rootScope.removeBefore(id, function() {
        $http({
          method: 'DELETE',
          url: '/' + $rootScope.name + '/' + id
        }).success(function() {
          $rootScope.list();
          $messages.addSuccessMessage('Operation successfully executed!');
          $rootScope.removeAfter(options);
        }).error(function(data, status, header, config) {
          errorHandler('REMOVE', data, status, header, config);
        });
      });
    };
    $dialogs.confirm(i18n.__('Confirmation'), i18n.__('Do you really want to delete?')).result.then(function(btn) {
      remove();
    }, function(btn) {

    });
  };

  $rootScope.removeFromArray = function(name, property, index) {
    var array = $rootScope.$eval('item.' + name);
    var remove = function() {
      $messages.cleanAllMessages();
      array.splice(index, 1);
    };
    var propertyValue = $rootScope.$eval('item.' + name + '[' + index + '].' + property);
    if (propertyValue) {
      $dialogs.confirm(i18n.__('Confirmation'), i18n.__('Do you really want to delete?')).result.then(function(btn) {
        remove();
      }, function(btn) {

      });
    } else {
      remove();
    }
  };

  $rootScope.addToArray = function(name, object) {
    $messages.cleanAllMessages();
    var array = $rootScope.$eval('item.' + name);
    array.push(object);
  };

  var addJSONValue = function(item, key, value) {
    var json = JSON.stringify(item);
    json = json.substring(0, json.length - 1) + ", \"" + key + "\":\"" + value + "\"}";
    return JSON.parse(item);
  };

  $rootScope.save = function(type) {
    if ($rootScope.form.$valid) {
      if (type) {
        $rootScope.saveType = type;
      } else {
        $rootScope.saveBefore(options);
        $messages.cleanAllMessages();
        var user = $authenticator.userDetails();
        $rootScope.item.user = user.id;
        $http.post(base.ng.rootContext + '/' + $rootScope.name, $rootScope.item).success(function(data) {
          $rootScope.item = data.item;
          if ($rootScope.saveType.length > 0) {
            if ($rootScope.saveType === 'NEW') {
              $rootScope.create();
            } else if ($rootScope.saveType === 'CLOSE') {
              $rootScope.create();
              $rootScope.showing = false;
            }
            $rootScope.saveType = '';
          }
          $messages.addSuccessMessage('Operation successfully executed!');
          $timeout(function() {
            $rootScope.list();
            $rootScope.focus();
          }, 100);
          $rootScope.saveAfter(options);
        }).error(function(data, status, header, config) {
          errorHandler('SAVE', data, status, header, config);
        });
      }
    }
  };

  $rootScope.status = function(id, status) {
    $messages.cleanAllMessages();
    $http.post(base.ng.rootContext + '/' + $rootScope.name + '/status', {
      id: id,
      status: status
    }).success(function() {
      $messages.addSuccessMessage('Status successfully changed!');
      $timeout(function() {
        $rootScope.list($rootScope.currentPage + 1);
        $rootScope.focus();
      }, 100);
    }).error(function(data, status, header, config) {
      errorHandler('STATUS', data, status, header, config);
    });
  };

  $rootScope.datepicker = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $rootScope.datepickerOpened = !$rootScope.datepickerOpened;
  };

  $rootScope.inputFocus = function(name) {
    var token = "input[name='" + name + "']";
    var inputs = $(token).filter(function() {
      return this.value == "";
    });
    if (inputs.length > 0) {
      $(inputs.get(0)).focus();
    } else {
      $(token).focus();
    }
  };

  $rootScope.nextTab = function() {
    if ($rootScope.showing) {
      $($("li.ng-isolate-scope").get($rootScope.selectedTab + 1)).find("a").trigger("click");
    }
  };

  $rootScope.previousTab = function() {
    if ($rootScope.showing) {
      $($("li.ng-isolate-scope").get($rootScope.selectedTab - 1)).find("a").trigger("click");
    }
  };

  $rootScope.tabsHotkeys = function() {
    $(document).bind("keydown.left", function(evt) {
      $rootScope.previousTab();
      return false;
    }).bind("keydown.right", function(evt) {
      $rootScope.nextTab();
      return false;
    });
  };

  $rootScope.focusTo = function(id) {
    $(id.indexOf('#') !== 0 ? '#' + id : id).focus();
  };

  $rootScope.checkUncheckAll = function(items) {
    $rootScope.selectAll = !$rootScope.selectAll;
    angular.forEach($rootScope[items], function(item) {
      item.selected = $rootScope.selectAll;
    });
  };

  $rootScope.hasRoles = function(roles) {
    var user = $authenticator.userDetails();
    for (var i = 0; i < roles.length; i++) {
      var role = roles[i];
      if (user.managerType === role) {
        return true;
      }
    }
    return false;
  };

  $rootScope.equals = function(item, property, value) {
    return item ? item[property] === value : false;
  };

  $rootScope.load = function(from, name, label) {
    $rootScope[name] = [];
    $http.get(from).success(function(data) {
      $rootScope[name] = data.items;
      if (label) {
        angular.forEach($rootScope[name], function(item) {
          item.label = '';
          label.forEach(function(value) {
            if (item.label.length > 0) {
              item.label += ' - ';
            }
            item.label += item[value];
          });
        });
      }
    });
  };

  service.prototype.init = function() {
    $authenticator.userDetails();
    $rootScope.item = $rootScope.newItem(options);
    $rootScope.validate();
    $rootScope.list();
    angular.forEach($rootScope.loadArrays, function(array) {
      $rootScope.load(array.from, array.name, array.label || false);
    });
    $rootScope.hotkeys();
    $rootScope.tabsHotkeys();
    $rootScope.focus();
  };

  return service;
}]);