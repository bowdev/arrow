/*jslint forin:true sub:true, sloppy:true, stupid:true nomen:true, node:true continue:true*/
/*jslint undef: true*/

/*
* Copyright (c) 2012, Yahoo! Inc.  All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/
var isCommonJS = typeof window === 'undefined' && typeof exports === 'object';
var runner = isCommonJS ? require('../interface/engine-runner').engineRunner : window.engineRunner;

var report = {
    'passed': 0,
    'failed': 0,
    'ignored': 0,
    'total': 0,
    'type': 'report',
    'name': 'Cucumber Test Results',
    'default': {
        'passed': 0,
        'failed': 0,
        'ignored': 0,
        'duration': 0,
        'total': 0,
        'type': 'testcase',
        'name': 'default'
    }
}, supportCodeLibrary;

/**
 * @constructor
 * @param config Cucumber engine config.
 */
function CucumberRunner(config) {
    this.config = config || {};
    runner.call(this, config);
}

CucumberRunner.prototype = Object.create(runner.prototype);

CucumberRunner.prototype.setClientSideReporter = function (callback) {
    //console.log("ARROW.testSteps is \n" + ARROW.testSteps);
    var supportCode = ARROW.testSteps;
    supportCodeLibrary = window.Cucumber.SupportCode.Library(function () {
        // console.log("window.Cucumber.SupportCode.Library()");
        var index, nextID, count = 0, retry, tries = 1+9*supportCode.length, tried = 1, start, duration;
        this.done = function (msg) {
            count = count + 1;
            if (msg) {
                console.log(msg);
            }
        };
        for (index in supportCode) {
            supportCode[index].call(this, arguments);
        }
        start = new Date().getTime();
        retry = function (callback) {
            if (count < supportCode.length) {
                // console.log("[" + tries + "] supportCode is not loaded completely.");
                tries = tries - 1;
                tried += 1;
                if (tries <= 0) {
                    duration = new Date().getTime() - start;
                    console.log("Loading step definitions timeout " + (duration / 1000) + " seconds.");
                    callback();
                } else {
                    nextID = setInterval(function () {
                        clearInterval(nextID);
                        retry(callback);
                    }, 10);
                }
            } else {
                nextID = setInterval(function () {
                    clearInterval(nextID);
                    duration = new Date().getTime() - start;
                    console.log("Loaded step definitions for " + (duration / 1000) + " seconds.");
                    callback();
                }, 1);
            }
        };
        retry(callback);
    });
    // console.log("end of setClientSideReporter()");
};

/**
 * call Cucumber to collect report
 * @param cb
 */
CucumberRunner.prototype.collectReport = function (cb) {
    if (report.name === 'Cucumber Test Results') {
        //console.log('collectReort');
        report.name = 'Test Name is changed';
        var options, runtime, iID, pretty, summary, ArrowFormatter,
            cuke, path, curTestDir, configuration, oldlog, tags, tagArray, index;
        if (isCommonJS) {
            //console.log("Server ARROW is \n" + JSON.stringify(ARROW));
            cuke = require('cucumber');
            path = require('path');
            curTestDir = path.dirname(ARROW.testfile);
            options = [
                '', '', '--format', 'pretty',
                '--require', curTestDir + '/step_definitions',
                '--tag', '@nodejs', ARROW.testfile
            ];
            console.log("Cucumber options are " + JSON.stringify(options));
            configuration = cuke.Cli.Configuration(options);
            runtime = cuke.Runtime(configuration);
            pretty = configuration.getFormatter();
        } else {
            //console.log("Client ARROW is \n" + JSON.stringify(ARROW));
            cuke = window.Cucumber;
            tags = ['~@nodejs'];
            if (typeof ARROW.testParams.tags === 'string') {
                tagArray = ARROW.testParams.tags.split(";");
                for (index in tagArray) {
                    if (tagArray[index].length > 0) {
                        tags.push(tagArray[index]);
                    }
                }
            }
            options = {'tags': tags};
            console.log("Cucumber options are " + JSON.stringify(options));
            configuration = cuke.VolatileConfiguration(ARROW.featureFiles, function () {}, options);
            configuration.setSupportCodeLibrary(supportCodeLibrary);
            runtime = cuke.Runtime(configuration);
            pretty = cuke.Listener.PrettyFormatter({logToConsole: false});
        }

        ArrowFormatter = cuke.Listener();
        ArrowFormatter.hear = function hear(event, callback) {
            var prefix;
            YUI().use('cucumber-lib', function (Y) {
                prefix = '[' + Y.Cucumber.Test.TestLib.now() + '] [Cucumber] ';
            });
            function hearBeforeFeature(feature) {
                report.name = feature.getName();
            }
            function hearBeforeScenario(scenario) {
                trace = '';
                startScenario = new Date().getTime();
                //console.log(prefix);
                var desc = scenario.getDescription() || '';
                testsuite = scenario.getName();
                if (desc !== '') {
                    desc = '\n' + desc;
                }
                trace += '\n' + prefix + scenario.getKeyword() + ': ' + testsuite;
                report[testsuite] = {
                    'passed': 0,
                    'failed': 0,
                    'ignored': 0,
                    'total': 0,
                    'duration': 0,
                    'result': 'pass',
                    'type': 'testcase',
                    'name': testsuite
                };
                report[testsuite].test = { result: 'pass', type: 'test', name: 'Scenario', message: '' };
            }
            function hearAfterScenario(scenario) {
                report[testsuite].duration = new Date().getTime() - startScenario;
                startScenario = 0;
                report.total += 1;
                if (testsuite.length > 0) {
                    report[testsuite].total += 1;
                }
                switch (report[testsuite].test.result) {
                case 'pass':
                    report[testsuite].passed += 1;
                    report.passed += 1;
                    break;
                case 'skip':
                    report[testsuite].ignored += 1;
                    report.ignored += 1;
                    break;
                default:
                    report[testsuite].failed += 1;
                    report.failed += 1;
                    report[testsuite].test.message = trace;
                    break;
                }
            }
            function handleStepResult(event) {
                var stepResult = event.getPayloadItem('stepResult'),
                    step = stepResult.getStep(),
                    stepOutput = {},
                    resultStatus = 'fail',
                    failureMessage,
                    messages;

                trace += '\n' + prefix + step.getKeyword() + step.getName();
                if (stepResult.isSuccessful()) {
                    resultStatus = 'pass';
                } else if (stepResult.isPending()) {
                    resultStatus = 'skip';
                    stepOutput.error_message = undefined;
                } else if (stepResult.isSkipped()) {
                    resultStatus = 'skip';
                } else if (stepResult.isUndefined()) {
                    resultStatus = 'skip';
                } else {
                    failureMessage = stepResult.getFailureException() || '';
                    if (failureMessage) {
                        if (failureMessage.stack.indexOf(failureMessage) === -1) {
                            stepOutput.error_message = failureMessage.toString();
                            messages = failureMessage.stack.split('\n', 1);
                        } else {
                            messages = failureMessage.stack.split('\n', 2);
                        }
                        for (index in messages) {
                              stepOutput.error_message += (messages[index] + '\n');
                        }
                    }
                    trace += '\n' + stepOutput.error_message;
                    report[testsuite].test = { result: resultStatus, type: 'test', name: 'Scenario - ' + testsuite, message: trace};
                }
                if (report[testsuite].test.result !== 'fail') {
                    report[testsuite].test.result = resultStatus;
                }
                //console.log(JSON.stringify(report));
            }

            //console.log("event is "+event.getName());
            switch (event.getName()) {
            case 'BeforeFeature':
                hearBeforeFeature(event.getPayloadItem('feature'));
                break;
            case 'BeforeScenario':
                hearBeforeScenario(event.getPayloadItem('scenario'));
                break;
            case 'AfterScenario':
                hearAfterScenario(event.getPayloadItem('scenario'));
                break;
            case 'StepResult':
                handleStepResult(event);
                break;
            default:
                break;
            }
            callback();
        };

        summary = cuke.Listener.SummaryFormatter({logToConsole: false});
        summary.logFailedStepResult = function logFailedStepResult(stepResult) {
            var failureMessage = stepResult.getFailureException(),
                self = summary,
                messages = failureMessage.stack.split('\n', 2),
                index;
            if (failureMessage.stack.indexOf(failureMessage) === -1) {
                self.log(failureMessage + '\n');
            }
            for (index in messages) {
                self.log(messages[index] + '\n');
            }
            self.log('\n');
        };

        if (console) {
            pretty.log = function (line) {
                YUI().use('cucumber-lib', function (Y) {
                    console.log('[' + Y.Cucumber.Test.TestLib.now() + '] [Cucumber] ' + line.replace(/(\w\W*)\n/, '$1'));
                });
            };
        }
        parentHear = pretty.hear;
        pretty.hear = function hear(event, callback) {
            ArrowFormatter.hear(event, function () {
                summary.hear(event, function () {
                    parentHear(event, callback);
                });
            });
        };
        pretty.handleStepResultEvent = function handleStepResultEvent(event, callback) {
            var stepResult = event.getPayloadItem('stepResult'),
                step = stepResult.getStep(),
                source = step.getKeyword() + step.getName() + '\n',
                self = pretty,
                dataTable,
                docString,
                failure,
                failureDescription;
            self.logIndented(source, 2);

            if (step.hasDataTable()) {
                dataTable = step.getDataTable();
                self.logDataTable(dataTable);
            }

            if (step.hasDocString()) {
                docString = step.getDocString();
                self.logDocString(docString);
            }

            stepResult.isFailed();
            if (stepResult.isFailed()) {
                failure = stepResult.getFailureException();
                if (failure.stack.indexOf(failure) !== -1) {
                    failureDescription = failure.stack.split('\n', 2) || failure;
                } else {
                    failureDescription = failure + '\n' + failure.stack.split('\n', 2) || failure;
                }
                self.logIndented(failureDescription + '\n', 3);
            }
            callback();
        };
        pretty.handleAfterFeaturesEvent = function handleAfterFeaturesEvent(event, callback) {
            var summaryLogs = summary.getLogs(),
                self = pretty;
            self.log('\n');
            self.log(summaryLogs);
            callback();
        };
        runtime.attachListener(pretty);
        runtime.start(function (succeeded) {
            cb(report);
        });
    }
};

new CucumberRunner(ARROW.engineConfig).run();

