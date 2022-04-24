const circomlib = require('circomlib')
const mimcsponge = circomlib.mimcsponge
const Scalar = require("ffjavascript").Scalar
const ZqField = require("ffjavascript").ZqField;
const F = new ZqField(Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617"));


class MimcSpongeHasher {
    hash(left, right) {
        return mimcsponge.multiHash([F.e(left), F.e(right)]).toString()
    }
}

module.exports = MimcSpongeHasher;