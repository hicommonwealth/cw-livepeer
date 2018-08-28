/** @flow */
import Promise from 'bluebird';

import * as ethUtil from './ethUtil';
import * as dbUtil from './dbUtil';

// Constants
let connectionString = process.env.MONGO_CONNECTION_URL || 'mongodb://127.0.0.1:27017/';
let dbName = process.env.DATABASE_NAME || 'livepeer';
let stateCollection = process.env.STATE_COLLECTION || 'state';
let network = process.env.ETHEREUM_NETWORK || 'mainnet';
let caller = process.env.ETHEREUM_ADDRESS;
let password = process.env.ETHEREUM_ADDRESS_PASSWORD;
let acctFile = process.env.ACCOUNT_FILE;
let datadir = process.env.KEYSTORE_DATA_DIR || '~/lpData/keystore';


async function main() {
  // Get database and status of last run
  const db = await dbUtil.getDatabase(connectionString, dbName);
  const status = await dbUtil.getStatus(db, stateCollection);

  let merkleTree;
  if (!status.addedAccounts) {
    const data = await ethUtil.setupMerkleData();
    merkleTree = data.merkleTree;
    await dbUtil.syncAccounts(db, stateCollection, data.accounts);
  } else {
    const accounts = await dbUtil.getAccounts();
    merkleTree = await ethUtil.setupMerkleTree(accounts);
  }

  const merkleMiner = await ethUtil.setupMerkleMiner({
    merkleTree: merkleTree,
    caller: caller,
    network: network,
    password: password,
    datadir: datadir,
  });

  console.log(merkleMiner);
}

main();