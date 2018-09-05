/** @flow */
require('dotenv').config()
import Promise from 'bluebird';
import program from 'commander';
import * as ethUtil from './ethUtil';
import * as dbUtil from './dbUtil';
import * as fileUtil from './fileUtil';

program
  .option('-g', '--generated')
  .option('-m', '--mine')
  .parse(process.argv);

// Constants
let connectionString = process.env.MONGO_CONNECTION_URL || 'mongodb://127.0.0.1:27017/';
let dbName = process.env.DATABASE_NAME || 'livepeer';
let network = process.env.ETHEREUM_NETWORK || 'rinkeby';
let stateCollection = `${network}-${process.env.STATE_COLLECTION}` || `${network}-state`;
let caller = process.env.ETHEREUM_ADDRESS;
let password = process.env.ETHEREUM_ADDRESS_PASSWORD;
let acctFile = process.env.ACCOUNT_FILE;
let datadir = process.env.KEYSTORE_DATA_DIR || '~/.lpData';
let accountsPath = process.env.ACCOUNTS_FILE_PATH || '/data/accounts.txt';

let maxGasPrice = process.env.MAX_GAS_PRICE;
let minGasPrice = process.env.MIN_GAS_PRICE;

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


async function mine(proofQty=20) {
  console.log('MINE');
  const price = await ethUtil.getSafeGasPrice(maxGasPrice, minGasPrice);
  const db = await setupDatabase();

  const data = await ethUtil.setupMerkleData();
  await dbUtil.syncAccounts(db, stateCollection, data.accounts);

  const merkleMiner = await getMerkleMiner(data.merkleTree);
  const txKeyManager = await ethUtil.unlockAddress({
    datadir: datadir,
    caller: caller,
    password: password,
  });

  let cursor = db.collection(stateCollection).find({
    type: 'address',
    hasGenerated: { $exists: false },
    hasNotGenerated: { $exists: false },
  });

  let qty = proofQty;
  let recipients = []
  while (await cursor.hasNext()) {
    let doc = await cursor.next();
    let hasGenerated = await merkleMiner.hasGenerated(doc.address);

    console.log(`${recipients.length + 1}, ${hasGenerated}, ${doc.address}`);

    if (!hasGenerated) {
      if (recipients.length < proofQty - 1) {
        recipients.push(doc.address);
      } else {
        recipients.push(doc.address);

        console.log(`Submitting batch proofs on behalf of ${caller}`);
        try {
          await merkleMiner.submitBatchProofs(
            txKeyManager,
            caller,
            price,
            recipients,
          );
        } catch (e) {
          console.log(e);
        }

        recipients = [];
      }
    }
  }
}

async function main() {
  console.log('MAIN');
  const db = await setupDatabase();

  const data = await ethUtil.setupMerkleData();
  await dbUtil.syncAccounts(db, stateCollection, data.accounts);

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

console.log(`Running on network: ${network}`);
// console.log(``);
// console.log(``);

if (program.M) {
  mine();
} else if (program.G) {
  generated();
} else {
  main();
}
