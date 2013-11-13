/*
 * Copyright (c) 2012-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

YUI.add('arrow-tests', function (Y, NAME) {
    
    var path = require('path'),
        mockery = require('mockery'),
        curDir,
        arrowRoot = path.join(__dirname, '../../../..'),
        Arrow = require(arrowRoot + '/lib/interface/arrow'),
        StubDriver = require(arrowRoot + '/tests/unit/stub/driver.js');
        controllerName = 'tests/unit/stub/controller.js';
        controllerNameAbsolute = path.join(arrowRoot, controllerName);
        suite = new Y.Test.Suite(NAME),
        A = Y.Assert;
   
    suite.add(new Y.Test.Case({        
        'setUp': function () {
           curDir = process.cwd();
           process.chdir(arrowRoot); 
        },
        'tearDown': function () {
           process.chdir(curDir); 
        },

        'test controller': function () {
            var driver = new StubDriver(),
                arrow,
                executed = false;

            arrow = new Arrow();
            arrow.runController(controllerName, {}, {param: "value"}, driver, function (errMsg, data, controller) {
                executed = true;
                A.isTrue(!errMsg, 'Should have successfully executed controller');
                A.areEqual(controller.testParams.param, "value", "Controller should get the parameter");
            });

            A.isTrue(executed, 'Should have executed controller');
            
            executed = false;
            arrow.runController(controllerNameAbsolute, {}, {param: "value"}, driver, function (errMsg, data, controller) {
                executed = true;
                A.isTrue(!errMsg, 'Should have successfully executed controller');
                A.areEqual(controller.testParams.param, "value", "Controller should get the parameter");
            });

            A.isTrue(executed, 'Should have executed controller');
        },

        'test error controller': function () {
            var driver = new StubDriver(),
                arrow,
                executed = false;

            arrow = new Arrow();
            arrow.runController(controllerName, {}, {error: "error"}, driver, function (errMsg) {
                executed = true;
                A.isString(errMsg, 'Should have failed to execute controller');
            });
            A.isTrue(executed, 'Should have executed controller');

            executed = false;
            arrow = new Arrow();
            arrow.runController(controllerName, {}, {testName: "error", error: "error"}, driver, function (errMsg) {
                executed = true;
                A.isString(errMsg, 'Should have failed to execute controller');
            });
            A.isTrue(executed, 'Should have executed controller with testName');

        }
    }));

    suite.add(new Y.Test.Case({        
        'setUp': function () {
            var self = this;
            self.executed = false;
            curDir = process.cwd();
            process.chdir(arrowRoot); 
            mockery.enable();
            mockery.registerMock(controllerNameAbsolute, function (testConfig, testParams, driver) {
                this.execute = function(callback) {
                    self.executed = true;
                    // callback should timeout
                    setTimeout(function () { callback("mock error message"); }, 3);                   
                };
            });
        },
        'tearDown': function () {
            process.chdir(curDir); 
            mockery.deregisterAll();
            mockery.disable();
            global.setTimeout = self.origSetTimeout;
        },
        'test controller execution timeout error with test parameter': function () {
            var driver = new StubDriver(),
                self = this,
                arrow;

            arrow = new Arrow();
            arrow.runController(controllerName, {}, {param: "value", testWaitingTimeout: 1}, driver, function (errMsg, data, controller) {
                self.resume( function () {
                    A.areSame("Waiting controller execution timeout (1 ms).", errMsg, "Error message should be timeout error");
                });
            });

            A.isTrue(self.executed, 'Should have executed controller');
            self.wait();
        },
        'test controller execution timeout error with config': function () {
            var driver = new StubDriver(),
                self = this,
                arrow;
            
            arrow = new Arrow();
            arrow.runController(controllerNameAbsolute, {testWaitingTimeout: 2}, {param: "value"}, driver, function (errMsg, data, controller) {
                self.resume( function () {
                    A.areSame("Waiting controller execution timeout (2 ms).", errMsg);
                });
            });

            A.isTrue(self.executed, 'Should have executed controller');
            self.wait();
        }
    }));
    
    Y.Test.Runner.add(suite);    
}, '0.0.1' ,{requires:['test']});

