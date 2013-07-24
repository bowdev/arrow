/*jslint forin:true sub:true anon:true, sloppy:true, stupid:true, nomen:true, node:true continue:true*/

/*
 * Copyright (c) 2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
YUI.add('errormanager-tests', function(Y) {

    var path = require('path'),
        mockery = require('mockery'),
        arrowRoot = path.join(__dirname, '../../../..'),
        config,
        context,
        errorMgr,
        em,
        msg,
        suite = new Y.Test.Suite("Error Manager test suite"),
        origDim = 
        [
            {
                "dimensions": [
                    {
                        "environment": {
                            "development": {
                                "dev": null,
                                "test": null
                            },
                            "productions": {
                                "int": null,
                                "stage": null,
                                "prod": null
                            }
                        }
                    }
                ]
            }
        ],
        dimensions = JSON.parse(JSON.stringify(origDim)),
        fsMock = {
            readFileSync: function (filename) {
                if (filename === undefined || filename.length === 0) {
                    throw new Error("filename is empty or not defined.");
                }
                return filename !== "error" ? JSON.stringify(dimensions) : 'error';
            }
        },
        mocks = {
            invokeCount : 0,
            message : undefined,
            error: function (message) {
                mocks.message = message;
            },
            exit: function (code) {
                mocks.invokeCount = mocks.invokeCount + 1;
                throw new Error("exit code is "+code);
            }
        },
        origArgv = {
            dimensions : undefined,
            argv : {
                remain : ["test-descriptor.json"],
                cooked : ["--context", "environment:qa1"]
            }
        },
        seleniumDriver;

    suite.setUp = function() {
        mockery.enable();
        //replace fs with our fsMock
        mockery.registerMock('fs', fsMock);
        //explicitly telling mockery using the actual fsclient is OK
        //without registerAllowable, you will see WARNING in test output
        mockery.registerAllowable('../fsclient');

        global.appRoot = arrowRoot;
        config = require(arrowRoot+'/config/config.js');
        context = {};

        errorMgr = require(arrowRoot+'/lib/util/errormanager.js');
        em = errorMgr.getInstance();
        msg = errorMgr.getMessage();
    };

    suite.tearDown = function() {
        mockery.deregisterAll();
        mockery.disable();
    };

    suite.add(new Y.Test.Case({
        "should take empty context": function(){
            Y.Assert.isNotNull(new errorMgr(context), "Make sure Error Manager is not null");
        }
    }));

    suite.add(new Y.Test.Case({
        "should get instance": function(){
            Y.Assert.isNotNull(em, "Make sure instance of Error Manager is not null");
        }
    }));

    suite.add(new Y.Test.Case({
        "should have error function": function(){
            Y.Assert.areSame("function", typeof em.error, "Make sure error function exist");
        }
    }));

    suite.add(new Y.Test.Case({
        "should have error message template": function(){
            Y.Assert.isNotNull(msg, "Make sure error message template exist");
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should throw exception if error code is not defined": function(){
            var code = -111;
            try {
                em.error(code);
                Y.Assert.isTrue(false);
            } catch (e) {
                Y.Assert.areSame("Error code "+code+" is not defined.", e.message);
            }
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should return empty string if no argument": function(){
            Y.Assert.areSame("",
                em.error());
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should return error message template if no additional arguments": function(){
            msg.unknown = "Unknown error : {0}";
            Y.Assert.areSame("Unknown error : {0}",
                em.error(msg.unknown));
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should keep placeholder if argument is not defined": function(){
            msg.unknown = "Unknown error : {0}";
            Y.Assert.areSame("Unknown error : {0}",
                em.error(msg.unknown, undefined));
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should return error message with one string parameter": function(){
            msg.unknown = "Unknown error : {0}";
            Y.Assert.areSame("Unknown error : first message",
                em.error(msg.unknown, "first message"));
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should return error message with two string parameters": function(){
            msg.unknown2 = "Unknown error : {0} {1}";
            Y.Assert.areSame("Unknown error : first message additional message",
                em.error(msg.unknown2, "first message", "additional message"));
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should support error code": function(){
            var code = 999;
            msg[code] = {name:"ERRNAME",text:"This is an error message."};
            Y.Assert.areSame(
                '999 (ERRNAME) This is an error message.',
                em.error(code)
            );
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should support error code with default values": function(){
            var code = 999;
            msg[code] = {name:"ERRNAME",text:"This is an error message and value {0} {1} {2}",0:"zero",1:"one",2:"two"};
            Y.Assert.areSame(
                '999 (ERRNAME) This is an error message and value zero one two',
                em.error(code)
            );
        }
    }));

    suite.add(new Y.Test.Case({
        "error() should support error code but error name is optional": function(){
            var code = 999;
            msg[code] = {text:"This is an error message."};
            Y.Assert.areSame(
                '999 This is an error message.',
                em.error(code)
            );
        }
    }));

    suite.add(new Y.Test.Case({
        "errorCallback() should do nothing if no argument": function(){
            em.errorCallback();
        }
    }));

    suite.add(new Y.Test.Case({
        "errorCallback() should callback if callback function is provided": function(){
            var count = 0;
            em.errorCallback(function() { count = count + 1; });
            Y.Assert.areSame(1,count);
        }
    }));

    suite.add(new Y.Test.Case({
        "errorCallback() should callback with error message": function(){
            var error = "";
            em.errorCallback("error", function(message) { error = message; });
            Y.Assert.areSame("error", error);
        }
    }));

    suite.add(new Y.Test.Case({
        "errorCallback() should callback with error message replaced by one parameter": function(){
            var error = "";
            em.errorCallback("error callback is {0}", function(message) { error = message; });
            Y.Assert.areSame("error callback is function (message) { error = message; }", error);
        }
    }));

    suite.add(new Y.Test.Case({
        "errorCallback() should callback with error message replaced by additional string parameter": function(){
            var error = "";
            em.errorCallback("error message is {0}", "first message", function(message) { error = message; });
            Y.Assert.areSame("error message is first message", error);
        }
    }));

    suite.add(new Y.Test.Case({
        "errorCheck() should throw exception if there is no arguments": function(){
            try {
                em.errorCheck();
            }
            catch (e) {
                Y.Assert.areSame("Please provide an error check function.", e);
            }
        }
    }));

    suite.add(new Y.Test.Case({
        "errorCheck() should throw exception if error check function is not defined": function(){
            try {
                em.errorCheck("this_error_check_function_should_be_not_defined");
            }
            catch (e) {
                Y.Assert.areSame("this_error_check_function_should_be_not_defined is not an error check function.", e);
            }
        }
    }));

    suite.add(new Y.Test.Case({
        "errorCheck() should exit if enviroment is missing in dimensions file": function(){
            mocks.invokeCount = 0;
            mocks.message = undefined;
            dimensions = JSON.parse(JSON.stringify(origDim));
            args = JSON.parse(JSON.stringify(origArgv));
            args.dimensions = "./config/dimensions.json";
            msg[1000] = {
                name: "EDIMENVTEST",
                text : 'The environment "{0}" is missing.\n' +
                    'Please add environment "{0}" to dimensions file "{1}".'
            };
            try {
                em.errorCheck("ArrowSetup", {
                    mock : mocks,
                    config : {},
                    argv : args
                });
                Y.Assert.isTrue(false, "errorCheck() should exit with code 1");
            }
            catch (e) {
                Y.Assert.areSame("exit code is 1", e.message);
            }
            finally {
                Y.Assert.areSame(
                    '1000 (EDIMENVTEST) The environment "qa1" is missing.\nPlease add environment "qa1" to dimensions file "./config/dimensions.json".',
                    mocks.message
                );                
                Y.Assert.areSame(1, mocks.invokeCount);
            }
        }
    }));

    suite.add(new Y.Test.Case({
        'errorCheck() should handle error "The settings group has already been added"': function() {
            var dataProvider = {
                constructor : {
                    name : "DataProvider"
                },
                testDataPath : "test-descriptor.json",
                mock : mocks,
                logger : {
                    error : function (message) {
                        mocks.message = message;
                    }
                }
            };
            mocks.invokeCount = 0;
            mocks.message = undefined;
            em.dimensionsFile = "./config/dimensions.json";
            msg[1003] = {
                name: "EDSCENVTEST",
                text: 'The settings group {0} is missing.\n' +
                    'Please add environment "{1}" to dimensions file "{2}"\n' +
                    'or remove it from test descriptor file "{3}".'
            };
            try {
                em.errorCheck( dataProvider, "The settings group '{\"environment\":\"sss\"}' has already been added" );
            }
            catch (e) {
                Y.Assert.areSame("exit code is 1", e.message);
            }
            finally {
                Y.Assert.areSame(
                    '1003 (EDSCENVTEST) The settings group {"environment":"sss"} is missing.\n'+
                    'Please add environment "sss" to dimensions file "./config/dimensions.json"\n'+
                    'or remove it from test descriptor file "test-descriptor.json".',
                    mocks.message
                );                
                Y.Assert.areSame(1, mocks.invokeCount);
            }
        }
    }));

    suite.add(new Y.Test.Case({
        'errorCheck() should handle unknown dimensions error': function() {
            var dataProvider = {
                constructor : {
                    name : "DataProvider"
                },
                testDataPath : "test-descriptor.json",
                mock : mocks,
                logger : {
                    error : function (message) {
                        mocks.message = message;
                    }
                }
            };
            mocks.invokeCount = 0;
            mocks.message = undefined;
            em.dimensionsFile = "./config/dimensions.json";
            msg[1005] = {
                name : 'EDSCYCBTEST',
                text : 'YCB Variable Replacement Failed, Please check you descriptor file.\n{0}',
            };
            try {
                em.errorCheck( dataProvider, "The erroe message is unknown by error manager." );
            }
            catch (e) {
                Y.Assert.areSame("exit code is 1", e.message);
            }
            finally {
                Y.Assert.areSame(
                    '1005 (EDSCYCBTEST) YCB Variable Replacement Failed, Please check you descriptor file.\n'+
                    'The erroe message is unknown by error manager.',
                    mocks.message
                );                
                Y.Assert.areSame(1, mocks.invokeCount);
            }
        }
    }));

    suite.add(new Y.Test.Case({
        setUp : function () {
            seleniumDriver = {
                constructor : {
                    name : "SeleniumDriver"
                },
                mock : mocks,
                logger : {
                    error : function (message) {}
                },
                callback : function (message) {
                    mocks.invokeCount = mocks.invokeCount + 1;
                    mocks.message = message;
                },
                webdriver : {
                    promise : {
                        then : function (callback, errorCallBack) {
                            if (callback) {
                                callback("http://test.yahoo.com");
                            }
                            return seleniumDriver.webdriver.promise;
                        }
                    },
                    getCurrentUrl : function () {
                        return seleniumDriver.webdriver.promise;
                    }
                }
            };
            mocks.invokeCount = 0;
            mocks.message = undefined;
            em.dimensionsFile = "./config/dimensions.json";
            msg[1004] = {
                name: "EUNDEFTEST",
                text : 'ARROW is not defined on testing page {0}\n' + 
                    'Please check following:\n' + 
                    '1. page is not reloaded.\n' +
                    '2. page is not switched to other page.\n' +
                    '3. page is loaded and not blank.\n' +
                    'For Arrow Usage, please refer to https://github.com/yahoo/arrow/blob/master/docs/arrow_cookbook/README.rst',
                0 : ""
            };            
        },
        'errorCheck() should handle error "Arrow is not defined"': function() {

            em.errorCheck( seleniumDriver, "UnknownError: TypeError: ARROW is undefined" );

            Y.Assert.areSame(
                '1004 (EUNDEFTEST) ARROW is not defined on testing page http://test.yahoo.com\n' +
                'Please check following:\n' +
                '1. page is not reloaded.\n' +
                '2. page is not switched to other page.\n' +
                '3. page is loaded and not blank.\n' +
                'For Arrow Usage, please refer to https://github.com/yahoo/arrow/blob/master/docs/arrow_cookbook/README.rst',
                mocks.message
            );                
            Y.Assert.areSame(1, mocks.invokeCount);
        }
    }));

    Y.Test.Runner.add(suite);

}, '0.0.1' ,{requires:['test']});
