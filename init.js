var client = require('./client.js');
var proxy = require('./proxy.js');
var util = require('./util.js');
var fs = require('fs');
var path = require('path');
var big = require('bignumber.js');
var winston = require('winston');
require('winston-daily-rotate-file');

if (!fs.existsSync('config.json')){
    console.log('config.json does not exist.');
    process.exit(1);
}

var config = JSON.parse(fs.readFileSync("config.json", {encoding: 'utf8'}));
global.diff1Target = new big(2).pow(256 - config.diff1TargetNumZero).minus(1);

var logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(i => `${i.timestamp} | ${i.level} | ${i.message}`)
    ),
    transports: [
        new winston.transports.DailyRotateFile({
            filename: path.resolve(config.logPath, 'proxy-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '100m',
            maxFiles: '1d',
            level: 'debug'
        }),
        new winston.transports.Console({
            level: 'info'
        })
    ]
});

if (config.addresses.length != 4){
    logger.error('Expect 4 miner addresses, but have ' + config.addresses.length);
    return;
}

for (var idx = 0; idx < 4; idx++){
    var result = util.isValidAddress(config.addresses[idx], idx);
    if (!result[0]){
        logger.error('Invalid miner address, ' + result[1]);
        return;
    }
}

var minerProxy = new proxy(config.proxyPort, logger);
var poolClient = new client(config, logger);

minerProxy.start();
poolClient.start();

minerProxy.on('solution', function(block){
    poolClient.submit(block);
});

poolClient.on('jobs', function(jobs){
    minerProxy.sendMiningJobs(jobs);
});
