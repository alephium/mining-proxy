var net = require('net');
var events = require('events');
var bignum = require('bignum');
var util = require('./util.js');

// var diff1Target = global.diff1Target = bignum.pow(2, 256 - 37).sub(1);
var diff1Target = global.diff1Target = bignum.pow(2, 256 - 24).sub(1);

// mining-pool port and host
var PoolClient = module.exports = function(port, host, minerAddresses){
    var client = net.Socket();
    var _this = this;

    var setup = function(client){
        var buffer = '';
        client.on('data', function(data){
            buffer += data;
            if (buffer.indexOf('\n') !== -1){
                var messages = buffer.split('\n');
                var remain = buffer.slice(-1) === '\n' ? '' : messages.pop();
                messages.forEach(function(message){
                    if (message === '') return;
                    var messageJson;
                    try {
                        messageJson = JSON.parse(message);
                    } catch(e) {
                        console.log("Invalid message, error: " + e);
                        client.destroy();
                        return;
                    }

                    switch(messageJson.method){
                        case "mining.notify":
                            handleMiningJobs(messageJson.params);
                            break;
                        case "mining.set_difficulty":
                            _this.difficulty = messageJson.params[0];
                            _this.target = diff1Target.div(Math.ceil(_this.difficulty)).toBuffer();
                            console.log('Set difficulty to ' + _this.difficulty);
                            break;
                        case "mining.submit_result":
                            handleSubmitResult(messageJson);
                            break;
                        default:
                            console.log("Received unkonw message, ", messageJson);
                            break;
                    }
                });
                buffer = remain;
            }
        });
    }

    this.start = function(){
        if (minerAddresses.length != 4){
            console.log('Expect 4 miner addresses, but have ' + minerAddresses.length);
            process.exit(1);
        }

        for (var idx = 0; idx < 4; idx++){
            var result = util.isValidAddress(minerAddresses[idx], idx);
            if (!result[0]){
                console.log('Invalid miner address, ' + result[1]);
                process.exit(1);
            }
        }

        connectToMiningPool();
    }

    var connectToMiningPool = function(){
        client.removeAllListeners('close');
        client.removeAllListeners('error');
        client.removeAllListeners('data');
        client.removeAllListeners('connect');

        client.setEncoding('utf8');
        client.connect(port, host);
        setup(client);

        client.on('connect', function(){
            console.log('Connected to mining pool');
        });

        client.on('close', function(){
            console.log('Mining pool connection closed, ' + 'trying to reconnect');
            setTimeout(connectToMiningPool, 5000);
        });

        client.on('error', function(error){
            console.log('Mining pool connection error: ' + error);
        });

    }

    this.currentJobs = [];
    var handleMiningJobs = function(jobs){
        jobs.forEach(job => {
            job.headerBlob = Buffer.from(job.headerBlob, 'hex');
            job.txsBlob = Buffer.from(job.txsBlob, 'hex');
            if (_this.target){
                job.targetBlob = _this.target;
            }
            else {
                job.targetBlob = Buffer.from(job.targetBlob, 'hex');
            }
            var chainIndex = job.fromGroup * global.GroupSize + job.toGroup;
            _this.currentJobs[chainIndex] = job;
        });
        _this.emit("jobs", jobs);
    }

    var handleSubmitResult = function(message){
        if (message.result){
            console.log('Submit accepted');
        }
        else {
            console.log('Submit refused, error: ' + message.error);
        }
    }

    this.submit = function(block){
        console.log('Receive solution, hash: ' + block.hash.toString('hex') + ', chanIndex: ' + block.chainIndexStr);
        var chainIndex = block.fromGroup * global.GroupSize + block.toGroup;
        var job = this.currentJobs[chainIndex];
        if (!job) {
            console.log('Job does not exist for chain: ' + block.chainIndexStr);
            return;
        } 
        if (job.headerBlob.equals(block.headerBlob) && 
            job.txsBlob.equals(block.txsBlob)){
            sendJson({
                id: null,
                method: "mining.submit",
                params: {
                    jobId: job.jobId,
                    fromGroup: block.fromGroup,
                    toGroup: block.toGroup,
                    nonce: block.nonce.toString('hex'),
                    worker: minerAddresses[block.toGroup]
                }
            })
        }
    }

    var sendJson = function(json){
        var data = JSON.stringify(json) + '\n';
        client.write(data);
    }
}

PoolClient.prototype.__proto__ = events.EventEmitter.prototype;
