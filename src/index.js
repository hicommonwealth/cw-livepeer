/** @flow */
require('dotenv').config()
import Promise from 'bluebird';
import program from 'commander';
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
let datadir = process.env.KEYSTORE_DATA_DIR || '~/.lpData';


async function main() {

  // Get database and status of last run
  const db = await dbUtil.getDatabase(connectionString, dbName);
  const collections = await db.collections();

  let merkleTree;
  if (stateCollection in collections) {
    const accounts = await dbUtil.getAccounts();
    merkleTree = await ethUtil.setupMerkleTree(accounts);
  } else {
    const data = await ethUtil.setupMerkleData();
    merkleTree = data.merkleTree;
    await dbUtil.syncAccounts(db, stateCollection, data.accounts);
  }

  const merkleMiner = await ethUtil.setupMerkleMiner({
    merkleTree: merkleTree,
    caller: caller,
    network: network,
    password: password,
    datadir: datadir,
  });

  db.collection(stateCollection).find({ type: 'address' })
  .forEach(doc => {
    console.log(doc);
  });
}

main();