var net = require('net');
var events = require('events');
var Block = require('./block');

var Proxy = module.exports = function(port){
    var _this = this;

    this.start = function(){
        var server = net.createServer(function(socket){
            if (_this.miner){
                console.log('Miner is connected, close the connection');
                socket.destroy();
                return;
            }
            _this.miner = socket;
            console.log('Miner connected');

            socket.setKeepAlive(true);
            
            var buffer = Buffer.from([]);
            socket.on('data', function(data){
                buffer = Buffer.concat([buffer, data]);
                var bodyLength = buffer.readUInt32BE();
                var messageLength = bodyLength + 4;
                if (buffer.length >= messageLength){
                    _this.parseMessage(buffer.slice(4, messageLength));
                    buffer = buffer.slice(messageLength);
                }
            });
            socket.on('close', function(){
                console.log('Miner connection closed');
                _this.miner = null;
            });
            socket.on('error', function(error){
                console.log('Miner connection error: ' + error);
                _this.miner = null;
            });
        });

        server.listen(port, function(){
            console.log("Proxy started, address: ", server.address());
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
        if (_this.miner) {
            var body = Buffer.concat(jobs.map(job => jobData(job)));
            var header = Buffer.alloc(9); // msgSize(4 bytes) + messageType(1 byte) + jobSize(4 bytes)
            header.writeUInt32BE(jobs.length, 5);
            header.writeUInt8(0x00, 4);
            header.writeUInt32BE(body.length + 5);
            var data = Buffer.concat([header, body]);
            _this.miner.write(data);
        }
    }

    this.parseMessage = function(buffer){
        var messageType = buffer.readUInt8();
        if (messageType == 0x00){ // submit message
            var block = new Block(buffer.slice(5)); // block size + message type
            _this.emit('solution', block);
        }
        else {
            console.log("Invalid message type: " + messageType);
            _this.miner.destroy();
        }
    }
}

Proxy.prototype.__proto__ = events.EventEmitter.prototype;
