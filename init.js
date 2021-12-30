var client = require('./client.js');
var proxy = require('./proxy.js');
var fs = require('fs');
var bignum = require('bignum');
var winston = require('winston');
require('winston-daily-rotate-file');

if (!fs.existsSync('config.json')){
    console.log('config.json does not exist.');
    process.exit(1);
}

var config = JSON.parse(fs.readFileSync("config.json", {encoding: 'utf8'}));
global.diff1Target = bignum.pow(2, 256 - config.diff1TargetNumZero).sub(1);

var logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(i => `${i.timestamp} | ${i.level} | ${i.message}`)
    ),
    transports: [
        new winston.transports.DailyRotateFile({
            filename: config.logPath + 'proxy-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '100m',
            maxFiles: '1d',
            level: 'debug'
        }),
        new winston.transports.Console({
            level: "info"
        })
    ]
});

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
