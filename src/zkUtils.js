const crypto = require('crypto');
const circomlib = require('circomlib');
const { Scalar, ZqField, utils: ffjavascriptUtils } = require("ffjavascript");
const { BigNumber } = require('@ethersproject/bignumber');
const { leBuff2int, leInt2Buff } = ffjavascriptUtils;

const F = new ZqField(Scalar.fromString(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
));

function padHexString(bn, len=64) {
    return '0x' + bn.toHexString().slice(2).padStart(len, '0');
}

function toBN(n) {
    return BigNumber.from(n.toString())
};

function toFieldElement(n) { 
    return F.e(toBN(n));
};

function leInt2buff(n, l) {
    return Buffer.from(leInt2Buff(n, 32).slice(0, l))
};

function toProofInput({
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
}) {
    return {
        // Public snark inputs
        root: toFieldElement(root),
        nullifierHash: toFieldElement(nullifierHash),
        recipient: toFieldElement(recipient),
        relayer: toFieldElement(relayer),
        fee: toFieldElement(fee),
        refund: toFieldElement(refund),
        // Private snark inputs
        nullifier: toFieldElement(nullifier),
        secret: toFieldElement(secret),
        pathElements: pathElements.map(toFieldElement),
        pathIndices: pathIndices.map(toFieldElement)
    };
}

function toSolidityInput({proof, publicSignals}) {
    const proofArray = [
        proof.pi_a[0], proof.pi_a[1], proof.pi_b[0][1], proof.pi_b[0][0], 
        proof.pi_b[1][1], proof.pi_b[1][0], proof.pi_c[0], proof.pi_c[1]
    ]
    let [
        root,
        nullifierHash,
        recipient,
        relayer,
        fee,
        refund
    ] = publicSignals.map(toBN);
    return {
        proof: proofArray,
        root: padHexString(root),
        nullifierHash: padHexString(nullifierHash),
        recipient: padHexString(recipient, 40),
        relayer: padHexString(relayer, 40),
        fee: fee.toString(),
        refund: refund.toString()
    };
};

function pedersenHash(data) {
    return circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0];
};

function rbigint(nbytes) {
    return leBuff2int(crypto.randomBytes(nbytes));
};

function toHex(number, length = 32) {
    return number instanceof Buffer ? '0x' + number.toString('hex') : 
        '0x' + toFieldElement(number).toString(16).padStart(length * 2, '0');
};

function createDeposit({currency, denomination, netId, nullifier, secret}) {
    let deposit;
    if (nullifier && secret) {
        deposit = formatDeposit({nullifier, secret});
    } else {
        deposit = formatDeposit({nullifier: rbigint(31), secret: rbigint(31)});
    }

    const note = toHex(deposit.preimage, 62);
    const noteString = `twister-${currency}-${denomination}-${netId}-${note}`;
    return { currency, denomination, ...deposit, netId, note, noteString };
};

function formatDeposit({ secret, nullifier }) {
    const deposit = { nullifier, secret };
    deposit.preimage = Buffer.concat([
        leInt2buff(nullifier, 31),
        leInt2buff(secret, 31)
    ]);
    deposit.commitment = pedersenHash(deposit.preimage);
    deposit.commitmentHex = toBN(deposit.commitment);
    deposit.nullifierHash = pedersenHash(leInt2buff(nullifier, 31));
    deposit.nullifierHex = toBN(deposit.nullifierHash);
    return deposit;
};

function parseNote(noteString) {
    const noteRegex = /twister-(?<currency>\w+)-(?<amount>[\d.]+)-(?<netId>\d+)-0x(?<note>[0-9a-fA-F]{124})/g;
    const match = noteRegex.exec(noteString);
    if (!match) {
        throw new Error('The note has invalid format');
    }
    const buf = Buffer.from(match.groups.note, 'hex');
    const nullifier = leBuff2int(buf.slice(0, 31));
    const secret = leBuff2int(buf.slice(31, 62));
    const deposit = formatDeposit({ nullifier, secret });
    const netId = Number(match.groups.netId);
    return {
        currency: match.groups.currency,
        amount: match.groups.amount,
        netId,
        deposit,
    };
};

function calculateRelayerFee({
    baseFeePerTenThousand,
    denomination,
    refund,
    maxGas,
    gasPrice,
    ethPerFrax,
}) {
    if (baseFeePerTenThousand.eq(0) && refund.eq(0) && maxGas.eq(0)) {
        return {
            totalFee: BigNumber.from('0'),
            percentFee: BigNumber.from('0'),
            gasCostInFrax: BigNumber.from('0'),
            refundInFrax: BigNumber.from('0'),
            fraxOut: denomination,
            ethOut: BigNumber.from('0'),
        };
    }
    const oneEther = BigNumber.from('10').pow(18);
    const percentFee = denomination.mul(baseFeePerTenThousand).div(10000);
    const refundInFrax = refund.mul(oneEther).div(ethPerFrax);
    const gasCostInFrax = gasPrice.mul(4).div(5).mul(maxGas).mul(oneEther).div(ethPerFrax);
    const totalFee = percentFee.add(refundInFrax).add(gasCostInFrax);
    const fraxOut = denomination.sub(totalFee);
    return {
        totalFee,
        refundInFrax,
        gasCostInFrax,
        percentFee,
        fraxOut,
        ethOut: refund
    };
};

module.exports = {
    createDeposit,
    calculateRelayerFee,
    formatDeposit,
    padHexString,
    parseNote,
    toBN,
    toFieldElement,
    toHex,
    toProofInput,
    toSolidityInput,
};