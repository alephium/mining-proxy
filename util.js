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

exports.isValidAddress = function(addressStr){
    var decoded = null;
    try {
        decoded = bs58.decode(addressStr);
    } catch (error){
        return 'invalid P2PKH address format, error: ' + error;
    }
    if (decoded.length != 33){ // prefix(1 byte) + public key hash(32 bytes)
        return 'incorrect P2PKH address size';
    }

    if (decoded[0] != 0x00){ // prefix for P2PKH
        return 'invalid P2PKH address';
    }
    return null;
}
