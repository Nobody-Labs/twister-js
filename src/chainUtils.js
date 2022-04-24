const { Contract } = require('@ethersproject/contracts');
const {
    getDefaultProvider,
    JsonRpcProvider
} = require('@ethersproject/providers');
const {
    setMulticallAddress,
    Contract: MulticallContract,
    Provider: MulticallProvider
} = require('ethers-multicall');

const Erc20 = require('../abi/ERC20Token.json');
const Twister = require('../abi/TwisterZero.json');

const multicallers = {
    421611: '0x041270c15aA67271054E6A8dF804E6aC4d9A8038',
    421612: '0xC9bfD08c980817c94679F73E29A25A0378483E0b',
};

function erc20Contract(erc20Address) {
    return new Contract(erc20Address, Erc20.abi);
};

function fraxEthPriceFeed(providerUrl) {
    const priceFeedAbi = [
        "function decimals() public view returns (uint8)",
        "function latestAnswer() public view returns (int256)",
        "function description() public view returns (string memory)",
        "function latestTimestamp() public view returns (uint256)",
        "function latestRoundData() public view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
    ];
    const provider = providerUrl ? new JsonRpcProvider(providerUrl)
        : getDefaultProvider();
    return new Contract('frax-eth.data.eth', priceFeedAbi, provider);    
};

const twisterConfig = {
    42161: {
        addresses: {},
        denominations: {},
        chainId: 42161,
        explorer: 'https://arbiscan.io/',
        network: 'ArbOne',
        tokens: [],
    },
    421611: {
        addresses: {
            'FRAX': '0x0A26b6E96679269b0A3516ce863Ee7d869854D3F',
            'FRAX-10000': '0x642BE3Fe8C4C10CC59DA5CB0616C198260Aeffbc',
        },
        chainId: 421611,
        denominations: {
            'FRAX': [10000],
        },
        explorer: 'https://testnet.arbiscan.io/',
        merkleTreeLibrary: '0x45Df2242fAEc822D7744458Bd874315E61b66deD',
        network: 'Rinkarby',
        tokens: ['FRAX'],
    },
    421612: {
        addresses: {
            'FRAX': '0x2660A51376D78D723B082cc527f7d24b8F6AF74F',
            'FRAX-10000': '0x799AEF47F5e91656e8b5B0952E4E44a52c208A47',
        },
        chainId: 421612,
        denominations: {
            'FRAX': [10000],
        },
        explorer: 'https://nitro-devnet-explorer.arbitrum.io/',
        merkleTreeLibrary: '0x3753d208CC95234bF9014F4154b56807CCB5B71A',
        network: 'NitroDevnet',
        tokens: ['FRAX'],
    },
    chainIds: [421611, 421612],
};

function twisterContract(twisterAddress) {
    return new Contract(twisterAddress, Twister.abi);
};

async function twisterMulticall({
    providerUrl,
    twisterAddress,
    root,
    nullifierHash,
    relayer
}) {
    const twister = new MulticallContract(twisterAddress, Twister.abi);
    const isKnownRootCall = twister.isKnownRoot(root);
    const nullifierHashIsSpentCall = twister.nullifierHashIsSpent(nullifierHash);
    const denominationCall = twister.denomination();
    const tokenCall = twister.token();
    const provider = new JsonRpcProvider(providerUrl);
    const { chainId } = await provider.getNetwork();
    if (typeof multicallers[chainId] !== 'undefined') {
        setMulticallAddress(chainId, multicallers[chainId]); 
    };
    const multicallProvider = new MulticallProvider(provider, chainId);
    if (relayer) {
        const relayerEthBalanceCall = multicallProvider.getEthBalance(relayer);
        const [ isKnownRoot, nullifierHashIsSpent, denomination, token, relayerEthBalance ] = await multicallProvider.all([
            isKnownRootCall, nullifierHashIsSpentCall, denominationCall, tokenCall, relayerEthBalanceCall
        ]);
        return { isKnownRoot, nullifierHashIsSpent, denomination, token, relayerEthBalance };
    } else {
        const [ isKnownRoot, nullifierHashIsSpent, denomination, token ] = await multicallProvider.all([
            isKnownRootCall, nullifierHashIsSpentCall, denominationCall, tokenCall
        ]);
        return { isKnownRoot, nullifierHashIsSpent, denomination, token };
    };
};

module.exports = {
    erc20Contract,
    fraxEthPriceFeed,
    twisterConfig,
    twisterContract,
    twisterMulticall,
};