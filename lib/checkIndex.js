const merkleTree = require("./MerkleTree");
const commitments = [
    "0x0649c3809e9018847b76e9f5a2082c0dd8a4917329e3be91f3ae3e7e25d3b59b",
    "0x224be3d338faacbd44eebfcd8a39a47fe22367961d0f4a3e5082a7168cdf7929",
    "0x1c645ffb62bbffb4ebb1bead1660a4badbe85d89d26a0bd6c12d4c9179764c91",
    "0x139d6965af3781dc7596698bfd51a7eac316e6f82900c72a04e1026ea7951471",
    "0x1336f738a66fde42bc363f6f0ae2515c0b2beba01dfa29cc2bf431f199ddfb36",
    "0x18efb012a77053c18c1e40542a89543b3cbf3681c04a5841d03500af824e9950",
    "0x0759d2826f3198c6991caa726cebde911c900539a57a4b72dc825a089ff41b62",
    "0x2b73d8df29eaacc5f3ac00e07295d5f034c9de6e11dd00573bf024441b82a1dd",
    "0x2660b48b3cd2be8baa409f12bdf0e01019d09552c713b354ff638cc650cd0e82",
    "0x29748d98bed985b0201de68745cfde0e6b6be700ecbee85af817aac41401dca1",
    "0x236e2d9d77ea37031069bc650a25f73974193962906348710236c28e1c1d5109",
    "0x14d3d30919aed5a2ebae38379f4f8da0f1ad8118d2e970a90aea875aa09615b2",
    "0x2964f7ab8c25934a3745702e75a55de23362e59c98976806148e8948043a124a",
    "0x1fced47b0ab68fbefe77d91a7d7c0c2d95f41b11838cad1fe855cbbf189d8413",
    "0x17906e60e2b2e2b26de420799fbe6053a861a7e57a607ccf5eeec93c49230929",
    "0x24c624ed5387a76e2cef83ceb8eb0c8ed678ce61da420ac097474f4ba22380d8"
];

async function main() {
    const m = new merkleTree(20, commitments);

    for (let i = 0; i < 2**20; i++) {
        const p = await m.path(i);
        const index = parseInt(p.pathIndices.reverse().join(""), 2);
        if (i != index) {
            throw new Error('i != index');
        }
        console.log(i);
    };
    return "Done!";
}

main().then(console.log);