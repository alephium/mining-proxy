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

exports.isValidAddress = function(addressStr, groupIndex){
    var decoded = null;
    try {
        decoded = bs58.decode(addressStr);
    } catch (error){
        return [false, "invalid P2PKH address format"]
    }
    if (decoded.length != 33){ // prefix(1 byte) + public key hash(32 bytes)
        return [false, 'incorrect P2PKH address size'];
    }

    if (decoded[0] != 0x00){ // prefix for P2PKH
        return [false, "invalid P2PKH address"];
    }

    var hint = djbHash(decoded.slice(1)) | 1;
    var hash = xorByte(hint);
    var group = hash % global.GroupSize;
    if (group == groupIndex){
        return [true, ""];
    }
    else {
        return [false, addressStr + ": expect group " + groupIndex + ", have group " + group];
    }
}
