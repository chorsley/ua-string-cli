#!/usr/bin/env node

"use strict";

const winston = require('winston');
const { createLogger, format, transports } = require('winston');

const log_level = process.env.UA_STRING_CLI_LOGLEVEL || 'info';

const logger = winston.createLogger({
  level: log_level,
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.simple()
  ),
  prettyPrint: JSON.stringify,
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log` 
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.Console(),
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// 
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const updateNotifier = require('update-notifier');
const pkg = require('./package.json');

updateNotifier({ pkg }).notify();

const UserAgent = require('user-agents');

var defs = {
    'mobile': {'aliases': ['mob'], cat: 'deviceCategory'},
    'desktop': {'aliases': ['desk'], cat: 'deviceCategory'},
    'tablet': {'aliases': ['tab'], cat: 'deviceCategory'},
    'Netscape': {'aliases': ['Firefox', 'firefox', 'ff'], regex: 'Firefox/\\d'},
    'MSIE': {'aliases': ['ie', 'IE', 'msie'], regex: 'MSIE \\d'},
    'Opera': {'aliases': ['opera'], cat: 'appName'},
    // Chrome, which we have to define more specifically since everyone has in agent
    'Google Inc.': {'aliases': ['Chrome', 'chrome'], cat: 'vendor', regex: 'Chrome'},
    'Win32': {'aliases': ['win', 'Win', 'windows'], cat: 'platform'},
    'MacIntel': {'aliases': ['osx', 'Mac', 'MacOS'], cat: 'platform'},
    'Linux x86_64': {'aliases': ['linux'], cat: 'platform'},
}
var regex = null;

var argv_defs = {};

for (var def of Object.keys(defs)){
    var desc = '';

    if (defs[def].cat === 'deviceCategory'){
        desc = "Use a ${def} device type"
    }
    else if (defs[def].cat === 'appName'){
        desc = "Use a ${def} browser type"
    }

    argv_defs[def] = {
        alias: defs[def].aliases,
        describe: desc,
        demandOption: false
    }
}

argv_defs['regex'] = {
    alias: 're',
    describe: 'A regex that UA must match; note may override other filters',
    demandOption: false
}

var filters = {};
var argv = require('yargs')
  .usage('./$0 - get a random user string')
  .options(argv_defs)
  .conflicts('mobile', ['desktop'])
  .help('help')
  .argv;

logger.debug(argv);

for (var arg of Object.keys(argv)){
    if (defs[arg]){
        logger.log('debug', "Setting arg for %o", arg)
        if (defs[arg]['cat']){
            filters[defs[arg]['cat']] = arg
        }

        if (defs[arg]['regex']){
            logger.log('debug', "Setting regex %s", defs[arg]['regex'])
            regex = defs[arg]['regex'];
        }
    }
}

if (argv['regex']){
    regex = argv['regex'];
}

// logger.debug(argv)
logger.log("debug", "Using filters: %o", filters)
var userAgent;
try {
    if (regex){
        logger.log('debug', "Also looking for regex %o", regex)
        let re = new RegExp(regex);
        userAgent = new UserAgent(re, filters);
    }
    else{
        userAgent = new UserAgent(filters);
    }
}
catch(e){
    console.error("Couldn't find a UA meeting all of your filters, try adjusting them")
    process.exit(1); 
}
logger.debug("Got useragent obj: %o", userAgent.data)
console.log(userAgent.toString());
