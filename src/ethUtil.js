/** @flow */
import Web3 from 'web3';
import MerkleMiner from './livepeer/MerkleMiner';
import TxKeyManager from './livepeer/TxKeyManager';
import * as livepeerHelpers from './livepeer/helpers';

export const setupWeb3Provider = async (network, merklemine) => {
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
};

export const setupMerkleData = async () => {
  console.log('Collecting accounts from livepeer IPFS link')
  const accountsBuf = await livepeerHelpers.getAccountsBuf();

  console.log('Creating merkle tree from valid accounts');
  return await livepeerHelpers.makeTree(accountsBuf);
}

export const setupMerkleTree = async (accounts) => {
  console.log('Creating merkle tree from stored accounts');
  return await livepeerHelpers.makeTreeFromAccounts(accounts);
}

export const setupMerkleMiner = async (merkleTree, merkleMineAddress, password, caller, datadir) => {
  const provider = setupWeb3Provider();
  const MerkleMiner = new MerkleMiner(provider, merkleTree, merkleMine, caller);

  // Perform checks
  await MerkleMiner.performChecks();

  // Unlock caller account
  const txKeyManager = new TxKeyManager(datadir, caller);
  await txKeyManager.unlock(password);

  return Merkleminer;
};
