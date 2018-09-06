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
let stateCollection = `${network}_${process.env.STATE_COLLECTION}` || `${network}_state`;
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

async function storeAccounts (db, accounts) {
  const count = await dbUtil.getAccountsCount(db, stateCollection);

  if (count > 0) {
    return;
  } else {
    await dbUtil.syncAccounts(db, stateCollection, accounts);
  }
}

async function updateGeneratedAccount(db, hasGenerated, address) {
  if (hasGenerated) {
    await db.collection(stateCollection).updateOne({
      address: address
    }, {
      $set: { hasGenerated }
    });
  } else {
    await db.collection(stateCollection).updateOne({
      address: address
    }, {
      $set: { hasNotGenerated: hasGenerated }
    });
  }
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


async function mine(proofQty=40) {
  console.log('MINE');
  const price = await ethUtil.getSafeGasPrice(maxGasPrice, minGasPrice);
  const db = await setupDatabase();

  const data = await ethUtil.setupMerkleData();
  await storeAccounts(db, data.accounts);

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
  let recipients = [];
  let sillyBoolForSafety = true;
  while (await cursor.hasNext()) {
    let doc = await cursor.next();
    let hasGenerated = await merkleMiner.hasGenerated(doc.address);

    console.log(`${recipients.length + 1}, ${hasGenerated}, ${doc.address}`);

    if (!hasGenerated) {
      if (recipients.length < proofQty - 1) {
        recipients.push(doc.address);
      } else {
        recipients.push(doc.address);

        if (sillyBoolForSafety) {
          sillyBoolForSafety = false;
        } else {
          console.log(`Submitting batch proofs on behalf of ${caller}`);
          try {
            await merkleMiner.submitBatchProofs(
              txKeyManager,
              caller,
              price,
              recipients,
            );

            await updateGeneratedAccount(db, hasGenerated, doc.address);
          } catch (e) {
            console.log(e);
          }
        }

        recipients = [];
      }
    } else {
      await updateGeneratedAccount(db, hasGenerated, doc.address);
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

console.log(`Running on network: ${network}\n`);

if (program.M) {
  mine();
} else if (program.G) {
  generated();
} else {
  main();
}
