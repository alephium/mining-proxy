var net = require('net');
var events = require('events');
var Block = require('./block');

var Proxy = module.exports = function(port, logger){
    var _this = this;

    var id = 0
    function nextId(){
        id += 1;
        if (id === Number.MAX_VALUE){
            id = 0;
        }
        return id;
    }

    var miners = {};

    this.start = function(){
        var server = net.createServer(function(socket){
            var minerId = nextId();
            miners[minerId] = socket;
            logger.info('Miner connected, id: ' + minerId);

            socket.setKeepAlive(true);
            socket.setNoDelay(true);
            
            var buffer = Buffer.from([]);
            socket.on('data', function(data){
                buffer = Buffer.concat([buffer, data]);
                var bodyLength = buffer.readUInt32BE();
                var messageLength = bodyLength + 4;
                if (buffer.length >= messageLength){
                    _this.parseMessage(buffer.slice(4, messageLength), function(error){
                        if (error) {
                            logger.error('Parse message error: ' + error);
                            socket.destroy();
                        }
                    });
                    buffer = buffer.slice(messageLength);
                }
            });
            socket.on('close', function(){
                logger.info('Miner connection closed, id: ' + minerId);
                _this.emit('connectionClosed', minerId);
            });
            socket.on('error', function(error){
                logger.error('Miner connection error: ' + error + ', id: ' + minerId);
                _this.emit('connectionClosed', minerId);
            });
        });

        server.listen(port, function(){
            logger.info("Proxy started, address: ", server.address());
            _this.on('connectionClosed', function(minerId){
                delete miners[minerId];
            });
        });
    }

    var sizeData = function(size){
        var buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(size);
        return buffer;
    }

    var jobData = function(job){
        return Buffer.concat([
            sizeData(job.fromGroup),
            sizeData(job.toGroup),
            sizeData(job.headerBlob.length),
            job.headerBlob,
            sizeData(job.txsBlob.length),
            job.txsBlob,
            sizeData(job.targetBlob.length),
            job.targetBlob
        ]);
    }

    this.sendMiningJobs = function(jobs){
        if (Object.keys(miners).length == 0){
            return;
        }

        var body = Buffer.concat(jobs.map(job => jobData(job)));
        var header = Buffer.alloc(9); // msgSize(4 bytes) + messageType(1 byte) + jobSize(4 bytes)
        header.writeUInt32BE(jobs.length, 5);
        header.writeUInt8(0x00, 4);
        header.writeUInt32BE(body.length + 5);
        var data = Buffer.concat([header, body]);
        for (var idx in miners){
            miners[idx].write(data);
        }
    }

    this.parseMessage = function(buffer, callback){
        var messageType = buffer.readUInt8();
        if (messageType == 0x00){ // submit message
            var block = new Block(buffer.slice(5)); // block size + message type
            _this.emit('solution', block);
            callback(null);
        }
        else {
            callback('Invalid message type: ' + messageType);
        }
    }
}

Proxy.prototype.__proto__ = events.EventEmitter.prototype;
