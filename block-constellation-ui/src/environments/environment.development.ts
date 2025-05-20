export const environment = {
    production: false,
    applicationName: 'Block Constellation',
    network: "devnet", // 'mainnet', 'testnet', 'devnet', 'mocknet'
    // apiUrl: 'https://api.testnet.hiro.so',
    apiUrl: 'http://localhost:3000/api/v1',
    // apiUrl: 'https://test.boltproto.org/api/v1',
    blockchainAPIUrl: 'http://localhost:3999',
    // blockchainAPIUrl: 'https://api.testnet.hiro.so',
    gameContract: {
        contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        contractName: 'blockconstellation'
    },
    referralAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    supportedAsset: {
        sBTC: {
            contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
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