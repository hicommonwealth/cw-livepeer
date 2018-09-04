/** @flow */
require('dotenv').config()
import Promise from 'bluebird';
import program from 'commander';
import * as ethUtil from './ethUtil';
import * as dbUtil from './dbUtil';
import * as fileUtil from './fileUtil';

program
  .option('-g', '--generated')
  .parse(process.argv);

// Constants
let connectionString = process.env.MONGO_CONNECTION_URL || 'mongodb://127.0.0.1:27017/';
let dbName = process.env.DATABASE_NAME || 'livepeer';
let stateCollection = process.env.STATE_COLLECTION || 'state';
let network = process.env.ETHEREUM_NETWORK || 'mainnet';
let caller = process.env.ETHEREUM_ADDRESS;
let password = process.env.ETHEREUM_ADDRESS_PASSWORD;
let acctFile = process.env.ACCOUNT_FILE;
let datadir = process.env.KEYSTORE_DATA_DIR || '~/.lpData';
let accountsPath = process.env.ACCOUNTS_FILE_PATH || '/data/accounts.txt';

async function setupDatabase() {
  // Get database and status of last run
  return await dbUtil.getDatabase(connectionString, dbName);
}

async function syncGeneratedAccounts (db, merkleMiner) {
  let cursor = db.collection(stateCollection).find({
    type: 'address',
    hasGenerated: { $exists: false },
    hasNotGenerated: { $exists: false },
  });

  while (await cursor.hasNext()) {
    let doc = await cursor.next();
    let hasGenerated = await merkleMiner.hasGenerated(doc.address);

    if (hasGenerated) {
      await db.collection(stateCollection).updateOne({
        address: doc.address
      }, {
        $set: { hasGenerated }
      });
    } else {
      await db.collection(stateCollection).updateOne({
        address: doc.address
      }, {
        $set: { hasNotGenerated: hasGenerated }
      });
    }
  }
}

async function getMerkleMiner(merkleTree) {
  const merkleMiner = await ethUtil.setupMerkleMiner({
    merkleTree: merkleTree,
    caller: caller,
    network: network,
    password: password,
    datadir: datadir,
  });

  return merkleMiner;
}

async function getMerkleTreeData(db) {
  const data = await ethUtil.setupMerkleData(accountsPath);
  return data;
}

async function syncAccountsWithDatabase(db, accounts) {
  await dbUtil.syncAccounts(db, stateCollection, accounts);
}

async function main() {
  console.log('MAIN');
  const db = await setupDatabase();

  const data = await getMerkleTreeData(db);
  await syncAccountsWithDatabase(db, data.accounts);

  const merkleMiner = await getMerkleMiner(data.merkleTree);
  await syncGeneratedAccounts(db, merkleMiner);
  process.exit();
}

async function generated() {
  console.log('GENERATED');
  const db = await setupDatabase();
  const merkleMiner = await getMerkleMiner();
  await syncGeneratedAccounts(db, merkleMiner);
  process.exit();
}

if (program.G) {
  generated();
} else {
  main();
}
