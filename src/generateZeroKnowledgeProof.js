const { fullProve } = require("snarkjs").groth16;
const {
    toProofInput,
    toSolidityInput,
} = require('./zkUtils');

async function generateZeroKnowledgeProof({
    merkleProof,
    nullifier,
    secret,
    nullifierHash,
    recipient,
    relayer = 0,
    fee = 0,
    refund = 0,
    withdrawCircuitPath,
    withdrawZkeyPath,
    verbose=false,
}) {
    const { root, pathElements, pathIndices } = merkleProof;
    const input = toProofInput({
        root, 
        nullifierHash, 
        recipient, 
        relayer, 
        fee, 
        refund, 
        nullifier, 
        secret, 
        pathElements, 
        pathIndices
    });

    if (verbose) {
        console.log('Generating SNARK proof');
        console.time('Proof time');
    }
    let { proof, publicSignals } = await fullProve(
        input,
        withdrawCircuitPath || "./node_modules/twister-js/circuits/withdraw.wasm",
        withdrawZkeyPath || "./node_modules/twister-js/build/withdraw_0032_final.zkey",
    );
    if (verbose)
        console.timeEnd('Proof time');

    return { proof, publicSignals, solidityInput: toSolidityInput({proof, publicSignals}) };
}

module.exports = generateZeroKnowledgeProof;