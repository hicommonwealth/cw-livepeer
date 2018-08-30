/*
 *  Pulled from: https://github.com/livepeer/merkle-mine/blob/master/client/lib/helpers.js
 *  Date pulled: 08/24/2018
 */

const { promisify } = require("util")
const r2 = require("r2")
const fs = require("fs")
const MerkleTree = require("./merkleTree")
const { toBuffer, addHexPrefix } = require("ethereumjs-util")

const makeTree = async accountsBuf => {
    let accounts = []

    for (let i = 0; i < accountsBuf.length; i += 20) {
        const buf = Buffer.from(accountsBuf.slice(i, i + 20), "hex")

        accounts.push(buf)
    }

    return {
        accounts: accounts,
        merkleTree: new MerkleTree(accounts),
    };
}

const getAccountsBuf = async () => {
    const res = await r2.get("https://gateway.ipfs.io/ipfs/QmQbvkaw5j8TFeeR7c5Cs2naDciUVq9cLWnV3iNEzE784r").response
    return res.buffer();
}

module.exports = {
    makeTree,
    getAccountsBuf,
};
