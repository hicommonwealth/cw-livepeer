/*
 *  Adapted from: https://github.com/livepeer/merkle-mine/blob/master/client/lib/MerkleMineGenerator.js
 *  Date pulled: 08/24/2018
 */

const Web3 = require("web3")
const BigNumber = require("bignumber.js")
const { addHexPrefix } = require("ethereumjs-util")
const MerkleMineArtifact = require("../../artifacts/MerkleMine.json")
const ERC20Artifact = require("../../artifacts/ERC20.json")

module.exports = class MerkleMiner {
    constructor(provider, merkleTree, merkleMineAddress, multiMerkleMineAddress, callerAddress) {
        this.web3 = new Web3();
        this.web3.setProvider(provider);
        this.merkleTree = merkleTree;
        this.merkleMineAddress = addHexPrefix(merkleMineAddress);
        this.multiMerkleMineAddress = addHexPrefix(multiMerkleMineAddress);
        this.callerAddress = callerAddress;
    }

    async performChecks() {
        const merkleMine = await this.getMerkleMine();

        // Validate len(candidateAccounts) == totalGenesisRecipients
        const numCandidateAccounts = this.merkleTree.getNumLeaves()
        const totalGenesisRecipients = await merkleMine.methods.totalGenesisRecipients().call()

        if (numCandidateAccounts != parseInt(totalGenesisRecipients)) {
            throw new Error(`Number of candidate accounts ${numCandidateAccounts} != totalGenesisRecipients ${totalGenesisRecipients}`)
        }

        // Validate root
        const remoteRoot = await merkleMine.methods.genesisRoot().call()
        const localRoot = this.merkleTree.getHexRoot()

        if (remoteRoot !== localRoot) {
            throw new Error(`Locally generated Merkle root ${localRoot} does not match Merkle root stored in MerkleMine contract ${remoteRoot}!`)
        }

        console.log(`Validated locally generated Merkle root ${localRoot} with Merkle root stored in MerkleMine contract!`)
        
        // Validate that the MerkleMine contract is in a started state
        const started = await merkleMine.methods.started().call()

        if (!started) {
            throw new Error(`Generation period has not started for MerkleMine contract`)
        }

        console.log("Validated Merkle proof locally!")

        // Validate MerkleMine contract balance is sufficient for the token allocation generation
        const tokensPerAllocation = new BigNumber(await merkleMine.methods.tokensPerAllocation().call())
        const token = await this.getToken()
        const merkleMineBalance = new BigNumber(await token.methods.balanceOf(this.merkleMineAddress).call())

        if (merkleMineBalance.comparedTo(tokensPerAllocation) < 0) {
            throw new Error(`Tokens per allocation is ${tokensPerAllocation.toString()} but MerkleMine contract only has balance of ${merkleMineBalance.toString()}`)
        }
    }

    validateLocalProof(recipientAddress) {
        // Validate proof locally
        let proof

        try {
            proof = this.merkleTree.getProof(recipientAddress)
        } catch (err) {
            throw new Error(`The recipient address ${recipientAddress} was not included in the genesis state.`)
        }

        const validProof = this.merkleTree.verifyProof(recipientAddress, proof)

        if (!validProof) {
            throw new Error(`Local verification of Merkle proof failed!`)
        }
    }

    async hasGenerated(recipientAddress) {
        const merkleMine = await this.getMerkleMine();

        // Validate that the recipient's token allocation has not been generated
        return await merkleMine.methods.generated(recipientAddress).call()
    }

    async getMerkleMine() {
        if (this.merkleMine == undefined) {
            this.merkleMine = new this.web3.eth.Contract(MerkleMineArtifact.abi, this.merkleMineAddress)
        }

        return this.merkleMine
    }

    async getMultiMerkleMine() {
        if (this.getMultiMerkleMine == undefined) {
            this.multiMerkleMine = new this.web3.eth.Contract(MultiMerkleMineArtifact.abi, this.multiMerkleMineAddress);
        }

        return this.multiMerkleMine;
    }

    async getToken() {
        if (this.token == undefined) {
            const merkleMine = await this.getMerkleMine()
            const tokenAddr = await merkleMine.methods.token().call()
            this.token = new this.web3.eth.Contract(ERC20Artifact.abi, tokenAddr)
        }

        return this.token
    }

    // TODO: FINISH THIS IT IS NOT COMPLETE
    // TODO: TEST TEST TEST TEST TEST TEST
    async submitBatchProofs(txKeyManager, callerAddress, gasPrice, recipients) {
        const multiMerkleMine = await this.getMultiMerkleMine();
        const generateFn = merkleMine.methods.multiGenerate(
            this.merkleMineAddress,
            recipients,
            this.merkleTree.getHexBatchProofs(recipients)
        );
        const gas = await generateFn.estimateGas({ from: callerAddress });
        const data = generateFn.encodeABI();
        const nonce = await this.web3.eth.getTransactionCount(callerAddress, "pending");
        const networkId = await this.web3.eth.net.getId();

        const signedTx = txKeyManager.signTransaction({
            nonce: nonce,
            gasPrice: gasPrice,
            gasLimit: gas,
            to: this.multiMerkleMineAddress,
            value: 0,
            data: data,
            chainId: networkId
        });

        const receipt = await this.web3.eth.sendSignedTransaction(signedTx).on("transactionHash", txHash => {
            console.log(`Submitted tx ${txHash}`)
        });

        if (receipt.status === "0x0") {
            throw new Error(`Failed to generate allocation in tx ${receipt.transactionHash}`)
        }
    }
}