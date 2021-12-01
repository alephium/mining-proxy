var client = require('./client.js');
var proxy = require('./proxy.js');
var fs = require('fs');

if (!fs.existsSync('config.json')){
    console.log('config.json does not exist.');
    process.exit(1);
}

var config = JSON.parse(fs.readFileSync("config.json", {encoding: 'utf8'}));
var minerProxy = new proxy(config.proxyPort);
var poolClient = new client(config.serverPort, config.serverHost, config.addresses);

minerProxy.start();
poolClient.start();

minerProxy.on('solution', function(block){
    poolClient.submit(block);
});

poolClient.on('jobs', function(jobs){
    minerProxy.sendMiningJobs(jobs);
});
