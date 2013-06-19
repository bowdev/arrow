/*jslint forin:true sub:true anon:true, sloppy:true, stupid:true nomen:true, node:true continue:true*/

/*
* Copyright (c) 2012, Yahoo! Inc.  All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

var log4js = require("log4js");
var fs = require("fs");

var ErrorManager = function(context) {
    this.context = context || {};
    this.logger = log4js.getLogger("ErrorManager");
    this.emJson = {};

    if (this.context.config && this.context.config.emConfigPath) {
        this.emJson = JSON.parse(fs.readFileSync(context.config.emConfigPath, "utf-8"));
    }

    ErrorManager.instance = this;
};
ErrorManager.message = require('../../config/error-messages.js');

/**
 * Get instance of Error message templates
 *
 */
ErrorManager.getMessage = function () {
    return ErrorManager.message;
};

var self;
/**
 * Get instance of ErrorManager
 *
 */
ErrorManager.getInstance = function () {
    if (!ErrorManager.instance) {
        ErrorManager.instance = new ErrorManager();
        self = ErrorManager.instance;
    }
    return ErrorManager.instance;
};
ErrorManager.instance = null;

var check = {
    "ArrowSetup" : function() {
        var i, arg;
        self.config = undefined;
        self.argv = undefined;
        self.mock = undefined;
        for (i in arguments) {
            arg = arguments[i];
            if (arg.config) {
                self.config = arg.config;
            }
            if (arg.argv) {
                self.argv = arg.argv;
            }
            if (arg.mock) {
                self.mock = arg.mock;
            }
        }
        check["Dimensions"]();
    },

    "Dimensions" : function() {
        // To Do : should check dimensions file with Json schema
        // self.errorLog("config {0} argv {1}", JSON.stringify(self.config), JSON.stringify(self.argv));
        var dimensions = self.argv.dimensions || self.config.dimensions || "", dimJson, i = 0, proc = self.mock || process,
            errorMessage, remain = JSON.stringify(self.argv.argv.remain) || "",
            dimensionsExist = function () {
                return remain.match(/"[\w\W]*\.json"/) && dimensions.length > 0;
            };

        if (dimensionsExist()) {
            try {
                self.dimensionsFile = dimensions;
                dimJson = JSON.parse(fs.readFileSync(dimensions, "utf-8"));
            } catch (e) {
                errorMessage = e.message;
            }
            if (dimJson && dimJson.length > 0 && dimJson[i].dimensions) {
                self.dimensions = dimJson[i].dimensions;
                // self.errorLog("dimensions {0}", JSON.stringify(self.dimensions));
            } else {
                self.errorLog(1001, dimensions, errorMessage || JSON.stringify(dimJson));
                proc.exit(1);
            }
            check["Environment"]();
        }

    },

    "Environment" : function() {
        if (self.argv.argv.cooked) {
            // self.errorLog("self.argv.argv.cooked {0}", self.argv.argv.cooked);
            var cooked = JSON.stringify(self.argv.argv.cooked), proc = self.mock || process;
            cooked.replace(/"environment:([\w\W]*?)"/, function (match, env) {
                // self.errorLog("env is {0}", env);
                if (self.dimensions[0].environment[env] === undefined) {
                    self.errorLog(1000, match, env, self.dimensionsFile);
                    proc.exit(1);
                } else {
                    self.environment = env;
                }
            });
        }
    },

    "DataProvider" : function(dataProvider, errorMessage) {
        var args = arguments, logger = dataProvider.logger,
            proc = dataProvider.mock || process, match;
        // self.errorLog("arguments {0}", JSON.stringify(arguments));
        if (errorMessage) {
            match = errorMessage.match(/The settings group '(\{"environment":"([\w\W]*?)"\})' has already been added/);
            if (match) {
                logger.error(self.error(1003, match[1], match[2], self.dimensionsFile, dataProvider.testDataPath));
            } else {
                logger.error(self.error(1005, errorMessage));
            }
        }
        proc.exit(1);
    },

    "SeleniumDriver" : function(seleniumDriver, errorMessage) {
        var logger = seleniumDriver.logger, callback = seleniumDriver.callback, match,
            handleArrowIsNotDefined = function (currentUrl) {
                match = errorMessage.match(/ARROW is not defined/) || errorMessage.match(/undefined[\w\W]*?ARROW/) || errorMessage.match(/ARROW[\w\W]*?undefined/);
                if (match) {
                    self.errorCallback(1004, currentUrl, callback);
                }
            },
            handleUnknownError = function (currentUrl) {
                match = errorMessage.match(/([^\n\r]*)[\n|\r]?([\w\W]*)/);
                if (match) {
                    self.errorCallback(1002, match[1], currentUrl, match[2], callback);
                } else {
                    self.errorCallback(1002, undefined, currentUrl, errorMessage, callback);
                }
            },
            matchError = function (callback) {
                return match ? function() {} : callback;
            };

        if (errorMessage) {
            if (errorMessage.match(/ECONNREFUSED/)) {
                handleUnknownError();
            } else {
                seleniumDriver.webdriver.getCurrentUrl()
                    .then(matchError(handleArrowIsNotDefined))
                    .then(matchError(handleUnknownError)); // keep handleUnknownError as last error handler
            }
        }
    }
};

/**
 *
 *
 */
ErrorManager.prototype.errorCheck = function () {
    var args = [], name = "", i = 0;

    if (arguments.length === 0) {
        throw self.errorLog("Please provide an error check function.");
    }

    if (typeof arguments[i] === "string") {
        name = arguments[i];
    } else if (typeof arguments[i] !== "string" && arguments[i].constructor) {
        name = arguments[i].constructor.name;
    }

    if (typeof check[name] === "function") {
        self.logger.trace("Error checking for " + name);
        Array.prototype.push.apply(args, arguments);
        check[name].apply(self, args);
    } else if (name.length > 0) {
        throw self.errorLog("{0} is not an error check function.", name);
    }
};

/**
 * Compose error message for giving string template and arguments.
 *
 * @param template string template.
 * @param value for placeholders.
 */
ErrorManager.prototype.error = function () {
    var i = 0, args = [], arg = "", message = "", errorCodeJson, errorName, key;
    Array.prototype.push.apply(args, arguments);
    if (typeof args[0] === "string") {
        message = args[0];
    } else if (typeof args[0] === "number") {
        errorCodeJson = ErrorManager.message[args[0]];
        if (errorCodeJson) {
            message = errorCodeJson.text || "";
            if (errorCodeJson.name) {
                message = "(" + errorCodeJson.name + ") " + message;
            }
            message = args[0] + " " + message;
        } else {
            message = "Error code " + args[0] + " is not defined.";
            throw new Error(message);
        }
    }
    args.shift();
    message = message.format.apply(message, args);
    if (errorCodeJson) {
        args = [];
        i = 0;
        for (key in errorCodeJson) {
            args.push(errorCodeJson[i]);
            i = i + 1;
        }
        message = message.format.apply(message, args);
    }
    return message;
};

/**
 * Compose error message for giving string template and arguments
 * and pass the error messag into callback function.
 *
 * @param template string template.
 * @param callback the last parameter is the callback function.
 */
ErrorManager.prototype.errorCallback = function () {
    var message, callback = arguments[arguments.length - 1];
    if (typeof callback === "function") {
        message = this.error.apply(this, arguments);
        callback.call(this, message);
    }
};

/**
 * 
 *
 */
ErrorManager.prototype.errorLog = function () {
    var message = this.error.apply(this, arguments), log = this.mock || this.logger;
    log.error(message);
    return message;
};

// format string
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/\{(\d+)\}/g, function(match, number) {
            return typeof args[number] !== 'undefined'
                ? args[number]
                : match;
        });
    };
}


module.exports = ErrorManager;

