/*jslint forin:true sub:true anon:true, sloppy:true, stupid:true nomen:true, node:true continue:true*/
/*jslint undef: true*/

/*
 * Copyright (c) 2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var isCommonJS = typeof window === 'undefined' && typeof exports === 'object';
var seed = isCommonJS ? require('../interface/engine-seed').engineSeed : window.engineSeed;

/**
 * @constructor
 * @param config Cucumber engine config.
 */
function CucumberSeed(config) {
    this.config = config || {};
    seed.call(this, config);
}

CucumberSeed.prototype = Object.create(seed.prototype);

CucumberSeed.prototype.detectSeedFileInLibs = function() {
    if (isCommonJS && ARROW.testLibs.length === 0) {
        var args = process.argv,
            testSpecStr = decodeURI(args[2]),
            testSpec = JSON.parse(testSpecStr);
        if (-1 !== JSON.stringify(testSpec.libs).indexOf('cucumber-seed.js')) {
            console.log('libs include cucumber-seed.js');
            return true;
        }
    }
    return false;
};

addLib = function() {
    YUI.add('cucumber-lib', function(Y) {

        var self = Y.namespace('Cucumber.Test').TestLib = {

            now: function(fmtStr) {
                var d = new Date(), f = {},
	                pad = function(number, length) {
	                    var str = number.toString();
	                    while (str.length < length) {
	                        str = '0' + str;
	                    }
	                    return str;
	                };
	            if (typeof fmtStr === 'undefined') {
	                fmtStr = '%Y-%m-%d %T.' + pad(d.getMilliseconds(), 3);
	            }
	            f.format = fmtStr;
	            return Y.DataType.Date.format(d, f);
	        }

	    };

	}, '0.1', {
	    requires: ['datatype-date-format']
	});
};

loadCucumberScript = function(next) {
    var self = this, reID, nextID;
    tries = 10;
    tried = 1;
    ARROW.CucumberJS();
    retry = function(next) {
        if (window.Cucumber === undefined) {
            console.log("[" + tries + "] Cucumber is not found.");
            tries = tries - 1;
            tried += 1;
            if (tries <= 0) {
                next();
            } else {
                //setTimeout(function() { retry(next); }, 50);
                reID = setInterval(function() {
                    clearInterval(reID);
                    retry(next);
                }, 50);
            }
        } else {
            //console.log("[Tried " + tried + " times.] Cucumber is found.");
            console.log('Cucumber version is ' + window.Cucumber.VERSION);
            //setTimeout(next, 50);
            nextID = setInterval(function() {
                clearInterval(nextID);
                next();
            }, 50);
        }
    };
    retry(next);
};

CucumberSeed.prototype.generateServerSideSeed = function(cb) {
    addLib();
    cb();
};

CucumberSeed.prototype.generateClientSideSeed = function(cb) {
    addLib();
    loadCucumberScript(function () {
        cb();
    });
};

new CucumberSeed(ARROW.engineConfig).run();
