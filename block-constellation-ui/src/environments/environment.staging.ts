export const environment = {
    production: false,
    applicationName: 'Block Constellation',
    network: "testnet", // 'mainnet', 'testnet', 'devnet', 'mocknet'
    // apiUrl: 'http://localhost:3000/api/v1',
    // apiUrl: 'https://boltproto.org/api/v1',
    apiUrl: '/api/v1',
    blockchainAPIUrl: 'https://api.testnet.hiro.so',
    gameContract: {
        contractAddress: 'ST3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02W1N0YJF',
        contractName: 'blockconstellation'
    },
    referralAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    supportedAsset: {
        sBTC: {
            contractAddress: 'ST3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02W1N0YJF',
            contractName: 'sbtc-token',
            contractToken: 'sbtc-token',
            decimals: 8,
            name: 'sBTC',
            symbol: 'sBTC',
            image: 'https://ipfs.io/ipfs/bafkreiffe46h5voimvulxm2s4ddszdm4uli4rwcvx34cgzz3xkfcc2hiwi',
            fee: 20 // sats
        }
    }
};
// SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token