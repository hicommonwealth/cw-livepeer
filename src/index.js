/** @flow */
import Promise from 'bluebird';
import { MongoClient } from 'mongodb';
import assert from 'assert';
import Web3 from 'web3';

import MerkleMine from './livepeer/MerkleMiner';
import TxKeyManager from './livepeer/TxKeyManager';
import * as livepeerHelpers from './livepeer/helpers';

// Constants
const connectionString = process.env.MONGO_CONNECTION_URL;
const dbName = process.env.DATABASE_NAME;
const stateCollection = process.env.STATE_COLLECTION;
const network = process.env.ETHEREUM_NETWORK;
const caller = process.env.ETHEREUM_ADDRESS;
const password = process.env.ETHEREUM_ADDRESS_PASSWORD;
const acctFile = process.env.ACCOUNT_FILE;
const datadir = process.env.KEYSTORE_DATA_DIR;
let merkleMine = process.env.MERKLE_MINE;


const syncAccountsCollection = async (db) => {
  console.log('Collecting accounts from livepeer IPFS link')
  const accountsBuf = await livepeerHelpers.getAccountsBuf();

  console.log('Creating merkle tree from valid accounts');
  const { accounts, merkleTree } = await livepeerHelpers.makeTree(accountsBuf);
  
  // Add records into the DB
  await db.collection(stateCollection).insertMany(
    accounts.map(a => ({ type: 'address', address: a.toString() }))
  );

  await db.collection(stateCollection).insertMany([{
    type: 'merkleTree',
    elements: merkleTree.elements,
    layers: merkleTree.layers
  }, {
    type: 'status',
    pulledAccounts: true,
    pulledMerkleTree: true,
    updatedAccounts: false,
  }]);
};

const setupWeb3 = async () => {
  console.log('Setting up livepeer merkle mine functionality');
  let provider;

  switch (network) {
    case 'mainnet':
      provider = new Web3.providers.HttpProvider("https://mainnet.infura.io")

      if (merkleMine === undefined) {
          // Default to known MerkleMine contract address on mainnet
          merkleMine = "0x8e306b005773bee6ba6a6e8972bc79d766cc15c8";
      }

      console.log("Using the Ethereum main network")
      break;
    case 'rinkby':
      provider = new Web3.providers.HttpProvider("https://rinkeby.infura.io")

      if (merkleMine === undefined || acctFile === undefined) {
          throw new Error("Must provide both MerkleMine contract address and accounts file when using the Rinkeby Ethereum test network")
      }

      console.log("Using the Ethereum rinkeby network")
      break;
    default:
      provider = new Web3.providers.HttpProvider("http://localhost:8545")
      if (merkleMine === undefined || acctFile === undefined) {
          throw new Error("Must provide both MerkleMine contract address and accounts file when using a custom development network")
      }

      console.log("Using localhost:8545")
      break;
  }

  return provider;
}

MongoClient.connect(connectionString, async (err: mongodb.MongoError, client: mongodb.MongoClient) => {
  assert.equal(null, err);
  console.log('Connected successfully to database');

  const db = client.db(dbName);
  const collections = await db.collections();

  if (!collections.map(c => c.s.name).includes(accountsCollection)) {
    await syncAccountsCollection(db);
  }

  const provider = setupWeb3Provider();
  const MerkleMiner = new MerkleMiner(provider, merkleTree, merkleMine, caller);

  // Perform checks
  await MerkleMiner.performChecks();

  // Unlock caller account
  const txKeyManager = new TxKeyManager(datadir, caller);
  await txKeyManager.unlock(password);

  // TODO: Search for unclaimed accounts
});
