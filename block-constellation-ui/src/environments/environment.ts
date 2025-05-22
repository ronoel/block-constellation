export const environment = {
    production: true,
    applicationName: 'Block Constellation',
    network: "mainnet", // 'mainnet', 'testnet', 'devnet', 'mocknet'
    // apiUrl: 'https://boltproto.org/api/v1',
    apiUrl: '/api/v1',
    blockchainAPIUrl: 'https://api.hiro.so',
    gameContract: {
        contractAddress: 'SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ',
        contractName: 'blockconstellation-v1',
        rewardClaimFee: 100, // 100 satoshis
    },
    referralAddress: 'SP1E6P0KM6BEWF1CJQGGJXER0WG58JDZ32YYCN95R',
    referralLink: 'https://boltproto.org/games/block-constellation',
    supportedAsset: {
        sBTC: {
            contractAddress: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
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