        angular.module("dialogs.controllers", [ "ui.bootstrap.modal" ]).controller("errorDialogCtrl", [ "$scope", "$modalInstance", "msg", "i18n", function(o, a, l, i18n) {
            o.title = i18n.__('Error'), o.closeLabel = i18n.__('Close'), o.msg = angular.isDefined(l) ? l : i18n.__("An unknown error has occurred."), o.close = function() {
                a.close()
            }
        } ]).controller(
                "waitDialogCtrl",
                [
                        "$scope",
                        "$modalInstance",
                        "$timeout",
                        "msg",
                        "progress",
                        function(o, a, l, n, i, i18n) {
                            o.title = i18n.__('Please Wait'), o.completeLabel = i18n.__('Complete'), o.msg = angular.isDefined(n) ? n : i18n
                                    .__("Waiting on operation to complete."), o.progress = angular.isDefined(i) ? i : 100, o.$on("dialogs.wait.complete", function() {
                                l(function() {
                                    a.close()
                                })
                            }), o.$on("dialogs.wait.message", function(a, l) {
                                o.msg = angular.isDefined(l.msg) ? l.msg : o.msg
                            }), o.$on("dialogs.wait.progress", function(a, l) {
                                o.msg = angular.isDefined(l.msg) ? l.msg : o.msg, o.progress = angular.isDefined(l.progress) ? l.progress : o.progress
                            }), o.getProgress = function() {
                                return {
                                    width : o.progress + "%"
                                }
                            }
                        } ]).controller(
                "notifyDialogCtrl",
                [
                        "$scope",
                        "$modalInstance",
                        "header",
                        "msg",
                        "i18n",
                        function(o, a, l, n, i18n) {
                            o.okLabel = i18n.__('OK'), o.header = angular.isDefined(l) ? l : i18n.__("Notification"), o.msg = angular.isDefined(n) ? n : i18n
                                    .__("Unknown application notification."), o.close = function() {
                                a.close()
                            }
                        } ]).controller(
                "confirmDialogCtrl",
                [
                        "$scope",
                        "$modalInstance",
                        "header",
                        "msg",
                        "i18n",
                        function(o, a, l, n, i18n) {
                            o.yesLabel = i18n.__("Yes"), o.noLabel = i18n.__("No"), o.header = angular.isDefined(l) ? l : i18n.__("Confirmation"), o.msg = angular.isDefined(n) ? n
                                    : i18n.__("Confirmation required."), o.no = function() {
                                a.dismiss("no")
                            }, o.yes = function() {
                                a.close("yes")
                            }
                        } ]),
        angular.module("dialogs.services", [ "ui.bootstrap.modal", "dialogs.controllers" ]).factory("$dialogs", [ "$modal", function(o) {
            return {
                error : function(a) {
                    return o.open({
                        templateUrl : "/dialogs/error.html",
                        controller : "errorDialogCtrl",
                        resolve : {
                            msg : function() {
                                return angular.copy(a)
                            }
                        }
                    })
                },
                wait : function(a, l) {
                    return o.open({
                        templateUrl : "/dialogs/wait.html",
                        controller : "waitDialogCtrl",
                        resolve : {
                            msg : function() {
                                return angular.copy(a)
                            },
                            progress : function() {
                                return angular.copy(l)
                            }
                        }
                    })
                },
                notify : function(a, l) {
                    return o.open({
                        templateUrl : "/dialogs/notify.html",
                        controller : "notifyDialogCtrl",
                        resolve : {
                            header : function() {
                                return angular.copy(a)
                            },
                            msg : function() {
                                return angular.copy(l)
                            }
                        }
                    })
                },
                confirm : function(a, l) {
                    return o.open({
                        templateUrl : "/dialogs/confirm.html",
                        controller : "confirmDialogCtrl",
                        resolve : {
                            header : function() {
                                return angular.copy(a)
                            },
                            msg : function() {
                                return angular.copy(l)
                            }
                        }
                    })
                },
                create : function(a, l, n, i, w) {
                    var e = angular.isDefined(i.key) ? i.key : !0, s = angular.isDefined(i.back) ? i.back : !0;
                    return o.open({
                        templateUrl : a,
                        controller : l,
                        keyboard : e,
                        backdrop : s,
                        size : w||'',
                        resolve : {
                            data : function() {
                                return angular.copy(n)
                            }
                        }
                    })
                }
            }
        } ]),
        angular
                .module("dialogs", [ "dialogs.services", "ngSanitize" ])
                .run(
                        [
                                "$templateCache",
                                function(o) {
                                            o
                                                    .put(
                                                            "/dialogs/error.html",
                                                            '<div class="modal-header dialog-header-error"><button type="button" class="close" ng-click="close()">&times;</button><h4 class="modal-title text-danger"><span class="glyphicon glyphicon-warning-sign"></span> {{title}}</h4></div><div class="modal-body text-danger" ng-bind-html="msg"></div><div class="modal-footer"><button type="button" class="btn btn-primary" ng-click="close()">{{closeLabel}}</button></div>'),
                                            o
                                                    .put(
                                                            "/dialogs/wait.html",
                                                            '<div class="modal-header dialog-header-wait"><h4 class="modal-title"><span class="glyphicon glyphicon-time"></span> {{title}}</h4></div><div class="modal-body"><p ng-bind-html="msg"></p><div class="progress progress-striped active"><div class="progress-bar progress-bar-info" ng-style="getProgress()"></div><span class="sr-only">{{progress}}% {{completeLabel}}</span></div></div>'),
                                            o
                                                    .put(
                                                            "/dialogs/notify.html",
                                                            '<div class="modal-header dialog-header-notify"><button type="button" class="close" ng-click="close()" class="pull-right">&times;</button><h4 class="modal-title text-info"><span class="glyphicon glyphicon-info-sign"></span> {{header}}</h4></div><div class="modal-body text-info" ng-bind-html="msg"></div><div class="modal-footer"><button type="button" class="btn btn-primary" ng-click="close()">{{okLabel}}</button></div>'),
                                            o
                                                    .put(
                                                            "/dialogs/confirm.html",
                                                            '<div class="modal-header dialog-header-confirm"><button type="button" class="close" ng-click="no()">&times;</button><h4 class="modal-title"><span class="glyphicon glyphicon-check"></span> {{header}}</h4></div><div class="modal-body" ng-bind-html="msg"></div><div class="modal-footer"><button type="button" class="btn btn-default" ng-click="yes()">{{yesLabel}}</button><button type="button" class="btn btn-primary" ng-click="no()">{{noLabel}}</button></div>')
                                } ]);