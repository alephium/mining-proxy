var net = require('net');
var events = require('events');

var LastNJobs = function LastNJobs(jobSize){
    var chainIndexedJobs = [];
    for (var i = 0; i < 16; i++){
        chainIndexedJobs.push([]);
    }

    this.addJob = function(chainIndex, job){
        var jobs = chainIndexedJobs[chainIndex];
        if (jobs.length >= jobSize){
            jobs.shift();
        }
        jobs.push(job);
    }

    // return null if job does not exist
    this.getJob = function(chainIndex, header){
        var jobs = chainIndexedJobs[chainIndex];
        for (var idx = jobs.length - 1; idx >=0; idx--){
            if (jobs[idx].headerBlob.equals(header)){
                return jobs[idx];
            }
        }
        return null;
    }
}

// mining-pool port and host
var PoolClient = module.exports = function(config, logger){
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
                        logger.error("Invalid message, error: " + e);
                        client.destroy();
                        return;
                    }

                    switch(messageJson.method){
                        case "mining.notify":
                            handleMiningJobs(messageJson.params);
                            break;
                        case "mining.set_difficulty":
                            _this.difficulty = messageJson.params[0];
                            let str = global.diff1Target.multipliedBy(256).div(Math.ceil(_this.difficulty * 256)).toString(16);
                            _this.target = Buffer.from(str.length % 2 === 0 ? str : "0"+str, 'hex');
                            logger.info('Set difficulty to ' + _this.difficulty);
                            break;
                        case "mining.submit_result":
                            handleSubmitResult(messageJson);
                            break;
                        default:
                            logger.error("Received unknown message: ", messageJson);
                            client.destroy();
                            break;
                    }
                });
                buffer = remain;
            }
        });
    }

    this.start = function(){
        connectToMiningPool();
    }

    var connectToMiningPool = function(){
        client.removeAllListeners('close');
        client.removeAllListeners('error');
        client.removeAllListeners('data');
        client.removeAllListeners('connect');

        client.setEncoding('utf8');
        client.setNoDelay(true);
        client.connect(config.serverPort, config.serverHost);
        setup(client);

        client.on('connect', function(){
            logger.info('Connected to mining pool');
        });

        client.on('close', function(){
            logger.info('Mining pool connection closed, ' + 'trying to reconnect');
            setTimeout(connectToMiningPool, 5000);
        });

        client.on('error', function(error){
            logger.error('Mining pool connection error: ' + error);
        });

    }

    this.currentJobs = [];
    this.lastNJobs = new LastNJobs(config.jobSize);
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
            _this.lastNJobs.addJob(chainIndex, job);
        });
        _this.emit("jobs", jobs);
    }

    var handleSubmitResult = function(message){
        if (message.result){
            logger.info('Submit accepted');
        }
        else {
            logger.error('Submit refused, error: ' + message.error);
        }
    }

    this.submit = function(block){
        logger.info('Receive solution, hash: ' + block.hash.toString('hex') + ', chanIndex: ' + block.chainIndexStr);
        var chainIndex = block.fromGroup * global.GroupSize + block.toGroup;
        var job = this.lastNJobs.getJob(chainIndex, block.headerBlob);
        if (!job) {
            logger.error('Ignore solution for stale job, chainIndex: ' + block.chainIndexStr);
            return;
        } 
        sendJson({
            id: null,
            method: "mining.submit",
            params: {
                jobId: job.jobId,
                fromGroup: block.fromGroup,
                toGroup: block.toGroup,
                nonce: block.nonce.toString('hex'),
                worker: config.addresses[block.toGroup]
            }
        });
    }

    var sendJson = function(json){
        var data = JSON.stringify(json) + '\n';
        client.write(data);
    }
}

PoolClient.prototype.__proto__ = events.EventEmitter.prototype;
