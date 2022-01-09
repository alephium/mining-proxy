const {hash} = require('mini-blake3')

const GroupSize = global.GroupSize = 4;
const EncodedHeaderSize = 326;
const NonceSize = 24;

/*
function encodedHeaderSize(){
    return NonceSize +            // nonce
        1 +                       // version
        1 +                       // deps length(compacted integer)
        (HashSize * DepSize) +    // deps
        32 +                      // depStateHash
        32 +                      // txsHash
        8 +                       // timestamp
        4                         // nBits
}
*/

function chainIndex(hash){
    var beforeLast = hash[hash.length - 2] & 0xff;
    var last = hash[hash.length -1] & 0xff;
    var bigIndex = beforeLast << 8 | last;
    var chainNum = GroupSize * GroupSize;
    var index = bigIndex % chainNum;
    var fromGroup = Math.floor(index / GroupSize);
    var toGroup = index % GroupSize;
    return [fromGroup, toGroup];
}

var Block = module.exports = function(buffer){
    this.nonce = buffer.slice(0, NonceSize)
    this.headerBlob = buffer.slice(NonceSize, EncodedHeaderSize);
    this.header = Buffer.concat([this.nonce, this.headerBlob]);
    this.hash = hash(hash(this.header));
    this.txsBlob = buffer.slice(EncodedHeaderSize);

    var index = chainIndex(this.hash);
    this.fromGroup = index[0];
    this.toGroup = index[1];
    this.chainIndexStr = this.fromGroup + ' -> ' + this.toGroup;
}
