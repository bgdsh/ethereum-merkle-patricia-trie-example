import {ok} from 'assert';

ok(processe.env.CHAINDATA_PATH, 'CHAINDATA_PATH not specified');
ok(process.env.BLOCK_STATE_ROOT, 'BLOCK_STATE_ROOT not specified');
ok(process.env.CONTRACT_ADDRESS, 'CONTRACT_ADDRESS not specified')

var Trie = require('merkle-patricia-tree');
var rlp = require('rlp');
var levelup = require('levelup');
var leveldown = require('leveldown');
var db = levelup(leveldown(process.env.CHAINDATA_PATH));
var keccak256 = require('js-sha3').keccak256;

// the block state root, rinkeby, block number 1775804
// the block state root can be obtained by invoking web3.eth.getBlock(<blockNumber>) in `stateRoot` field
var root = process.env.BLOCK_STATE_ROOT;
var trie = new Trie(db, root);

trie.checkRoot(root, function (err, val) {
  console.log('Root exists:', val);
});

var address = process.env.CONTRACT_ADDRESS;
var addressHash = keccak256(Buffer.from(address, 'hex'));

trie.get('0x' + addressHash, function (err, val) {
  var decodedVal = rlp.decode(val);
  console.log('Account data:', address, decodedVal);

  if (!decodedVal || decodedVal.length < 4) {
    console.log('The value for the address must be an array of 4 elements');
    return;
  }

  // 3rd element in the array is storage root, 1st - nonce, 2nd - balance, 4th - codeHash
  var storageRoot = decodedVal[2];
  console.log('Storage root:', storageRoot);

  trie.root = storageRoot;

  trie.checkRoot(storageRoot, function (err, val) {
    console.log('Storage root exists:', val);
  });

  // Read storage slot with index 0

  var slotZeroHash = keccak256(
    Buffer.from(
      process.env.SLOT, 
      'hex'
    )
  );
  trie.get('0x' + slotZeroHash, function (err, val) {
    var decodedVal = rlp.decode(val);
    console.log('Value at slot 0 - key:', slotZeroHash);
    console.log(decodedVal);
  });

  // Read all entries from contract storage

  var stream = trie.createReadStream();

  stream.on('data', function (data) {
    console.log('key:', data.key.toString('hex'));

    // values are rlp encoded
    var decodedVal = rlp.decode(data.value);
    console.log(decodedVal);
  });

  stream.on('end', function (val) {
    console.log('done reading!');
  });
});



