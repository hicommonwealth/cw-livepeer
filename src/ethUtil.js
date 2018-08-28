/** @flow */
import Web3 from 'web3';
import MerkleMiner from './livepeer/MerkleMiner';
import TxKeyManager from './livepeer/TxKeyManager';
import * as livepeerHelpers from './livepeer/helpers';

export const getContractAddress = async (network) => {
  let contractAddresses;
  switch (network) {
    case 'mainnet':
      contractAddresses = {
        merkleMine: '0x8e306b005773bee6ba6a6e8972bc79d766cc15c8',
        multiMerkleMine: '0x182ebf4c80b28efc45ad992ecbb9f730e31e8c7f',
        token: '0x58b6a8a3302369daec383334672404ee733ab239',
      };
    case 'rinkeby':
      contractAddresses = {
        merkleMine: '0x3bb5c927b9dcf20c1dca97b93397d22fda4f5451',
        multiMerkleMine: '0x2ec3202aaeff2d3f7dd8571fe4a0bfc195ef6a17',
        token: '0x750809dbdb422e09dabb7429ffaa94e42021ea04',
      };
    default:
      break;
  }

  return contractAddresses;
};

export const setupWeb3Provider = async (merkleMine, network) => {
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

export const setupMerkleMiner = async (props) => {
  const cAddresses = getContractAddress(props.network);
  const provider = setupWeb3Provider(cAddresses.merkleMineAddress, props.network);
  const merkelMiner = new MerkleMiner(
    provider,
    props.merkleTree,
    cAddresses.merkleMineAddress,
    cAddresses.multiMerkleMineAddress,
    props.caller
  );

  // Perform checks
  await merkelMiner.performChecks();

  // Unlock caller account
  const txKeyManager = new TxKeyManager(props.datadir, props.caller);
  await txKeyManager.unlock(props.password);

  return merkelMiner;
};
