const { verify } = require('snarkjs').groth16;
const verifier = require('../build/withdraw_0032_verifier.json');

async function verifyProof({proof, publicSignals}) {
    return verify(verifier, publicSignals, proof);
}

module.exports = {
    verifier,
    verifyProof
}