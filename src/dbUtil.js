/** @flow */
import Promise from 'bluebird';
import { MongoClient } from 'mongodb';
import assert from 'assert';

export const getDatabase = (connString, databaseName) => {
  return new Promise((resolve, reject) => {
    MongoClient.connect(connString, async (err: mongodb.MongoError, client: mongodb.MongoClient) => {
        if (err) reject(err);
        else resolve(client.db(databaseName));
    });  
  });
};

export const getAccounts = async (db, coll) => {
  const accounts = await db.collection(coll).find({ type: 'address' }).toArray();
  return accounts.map(elt => (elt.address));
};

export const syncAccounts = async (db, coll, accounts) => {
  // Add accounts into the database
  await db.collection(coll).insertMany(
    accounts.map(a => {
      return {
        type: 'address',
        address: '0x' + a.toString('hex'),
      };
    })
  );
};

export const updateAccount = async (db, coll, address, update) => {
  // Update account with update value
  await db.collection(coll).updateOne({
    address: address
  }, {
    $set: update
  });
};

export const getAccountsCount = async (db, coll) => {
  return await db.collection(coll).find({
    type: 'address',
  }).count();
};
