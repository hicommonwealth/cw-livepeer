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

export const getStatus = async (db, coll) => {
  const status = await db.collection(coll).find({ type: 'status' }).toArray();
  return (status.length > 0) ? status[0] : {};
};

export const getAccounts = async (db, coll) => {
  const accounts = await db.collection(coll).find({ type: 'address' }).toArray();
  return accounts.map(elt => (elt.address));
};

export const syncAccounts = async (db, coll, accounts) => {
  // Add accounts into the database
  await db.collection(coll).insertMany(
    accounts.map(a => ({type: 'address', address: a.toString() }))
  );

  // Update status of workflow
  await db.collection(coll).update({ type: 'status' }, {
    $set: {
      addedAccounts: true,
      updatedAccounts: false,
    }
  });
};