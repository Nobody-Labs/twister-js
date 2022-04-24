const { Interface } = require('@ethersproject/abi');
const MerkleTree = require('../lib/MerkleTree');

// this rekts local tests if you don't set `fromBlock`
const TWISTER_GENESIS_BLOCK = 6714780;

/*
  Build the merkle tree from a list of leaves.
*/
async function generateMerkleProofFromTree({leaves, commitment}) {
    const tree = new MerkleTree(20, leaves);
    let element = commitment;
    if (commitment.length !== 66) 
        element = '0x' + commitment.slice(2).padStart(64, '0');
    const leafIndex = tree.getIndexByElement(element);
    if (leafIndex || leafIndex === 0) {
        return tree.path(leafIndex);
    } else {
        throw new Error('Commitment not found in tree');
    };
};

/*
  Retrieve commitments from on-chain event logs.
*/
async function getCommitmentsFromChain({
    provider,
    fromBlock,
    toBlock,
    twisterAddress,
}) {
    const iface = new Interface([
        'event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)'
    ]);
    const depositTopic = Interface.getEventTopic(iface.fragments[0]);
    const filter = {
        address: twisterAddress,
        fromBlock: typeof fromBlock === 'undefined' ? TWISTER_GENESIS_BLOCK : fromBlock,
        toBlock: toBlock || 'latest',
        topics: [ depositTopic ],
    };
    const logs = await provider.getLogs(filter);
    if (logs) {
        return logs.map(log => iface.parseLog(log).args.commitment);
    } else {
        return;
    };
};

/*
 Build the tree by parsing transaction logs from a blockchain provider.
*/
async function generateMerkleProofFromChain({
    provider,
    fromBlock,
    toBlock,
    twisterAddress,
    commitment,
}) {
    const leaves = await getCommitmentsFromChain({
        provider,
        fromBlock,
        toBlock,
        twisterAddress
    });
    return generateMerkleProofFromTree({ leaves, commitment });
};

/*
 Build the tree by requesting a bootstrap list of commitments from a relayer.
*/
async function generateMerkleProofFromRelayer({
    relayerUrl,
    provider,
    twisterAddress, 
    commitment
}) {
    return import('axios').then(async axios => {
        const { chainId } = await provider.getNetwork();
        const { get } = axios.default;
        const { data } = await get(relayerUrl.concat(`/status?chainId=${chainId}`));
        if (data.status === 'ready') {
            const response = await get(relayerUrl.concat(`/commitments?twisterAddress=${twisterAddress}&chainId=${chainId}`));
            if (response.data.commitments && response.data.syncBlockNumber) {
                const latestLeaves = await getCommitmentsFromChain({
                    provider,
                    fromBlock: Number(response.data.syncBlockNumber)+1,
                    twisterAddress
                });
                if (latestLeaves) {
                    return generateMerkleProofFromTree({
                        leaves: response.data.commitments.concat(latestLeaves),
                        commitment
                    });
                } else {
                    return generateMerkleProofFromTree({
                        leaves: response.data.commitments,
                        commitment
                    });
                };
            } else {
                throw new Error('There was an error retrieving the merkle tree from the relayer.');
            };
        } else {
            throw new Error('Relayer is unavailable.');
        };
    }).catch(err => {
        console.error(err);
        throw new Error('There was an error generating the merkle proof.');
    });
};

module.exports = {
    getCommitmentsFromChain,
    generateMerkleProofFromChain,
    generateMerkleProofFromTree,
    generateMerkleProofFromRelayer,
};