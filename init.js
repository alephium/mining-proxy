var client = require('./client.js');
var proxy = require('./proxy.js');
var fs = require('fs');
var BigNumber = require('bignumber.js');

if (!fs.existsSync('config.json')){
    console.log('config.json does not exist.');
    process.exit(1);
}

var config = JSON.parse(fs.readFileSync("config.json", {encoding: 'utf8'}));
global.diff1Target = BigNumber(2).pow(256 - config.diff1TargetNumZero).minus(1);
var minerProxy = new proxy(config.proxyPort);
var poolClient = new client(config);

minerProxy.start();
poolClient.start();

minerProxy.on('solution', function(block){
    poolClient.submit(block);
});

poolClient.on('jobs', function(jobs){
    minerProxy.sendMiningJobs(jobs);
});
