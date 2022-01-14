var bs58 = require('bs58');

function djbHash(buffer){
    var hash = 5381;
    for (var idx = 0; idx < buffer.length; idx++){
        hash = (((hash << 5) + hash) + (buffer[idx] & 0xff)) & 0xffffffff;
    }
    return hash;
}

function xorByte(intValue){
    var byte0 = (intValue >> 24) & 0xff;
    var byte1 = (intValue >> 16) & 0xff;
    var byte2 = (intValue >> 8) & 0xff;
    var byte3 = intValue & 0xff;
    return (byte0 ^ byte1 ^ byte2 ^ byte3) & 0xff;
}

function groupOfAddress(addressStr){
    var decoded = null;
    try {
        decoded = bs58.decode(addressStr);
    } catch (error){
        return [null, 'invalid P2PKH address format, error: ' + error];
    }
    if (decoded.length != 33){ // prefix(1 byte) + public key hash(32 bytes)
        return [null, 'incorrect P2PKH address size'];
    }

    if (decoded[0] != 0x00){ // prefix for P2PKH
        return [null, 'invalid P2PKH address'];
    }

    var hint = djbHash(decoded.slice(1)) | 1;
    var hash = xorByte(hint);
    var group = hash % global.GroupSize;
    return [group, null];
}

exports.validateAdddresses = function(addresses){
    if (addresses.length !== 4){
        return 'expect 4 miner addresses';
    }
    for (var idx in addresses){
        var address = addresses[idx];
        var [groupIndex, error] = groupOfAddress(address);
        if (error){
            return address + ': ' + error;
        }

        if (idx != groupIndex){
            return address + ': expect group ' + groupIndex + ', have group ' + idx;
        }
    }
    return null;
}

exports.groupOfAddress = groupOfAddress;
