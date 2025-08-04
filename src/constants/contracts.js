export const WITHDRAWAL_MESSAGES = [
  "Ill use this ANIME coin to build something on ANIME chain.  Also, Earth domain is best.",
  "Gonna build more with this ANIME coin and not sell it like a degen.",
  "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me."
];

// Updated messages for devFaucet (8 messages for 8 withdrawals)
export const DEV_FAUCET_MESSAGES = [
  "Ill use this ANIME coin to build something on ANIME chain and not sell it like a degen.",
  "Gonna build more with this ANIME coin, and not ape into a meme coin.",
  "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me.",
  "This is my second to last ANIME amount today, I promise I'll use it wisely.",
  "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me.",
  "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me.",
  "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me.",
  "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me."
];

export const FAUCET_ABI = [{"type":"event","name":"Withdrawal","inputs":[{"name":"recipient","type":"address","components":null,"internalType":null,"indexed":true},{"name":"amount","type":"uint256","components":null,"internalType":null,"indexed":false},{"name":"timestamp","type":"uint256","components":null,"internalType":null,"indexed":false},{"name":"withdrawal_count","type":"uint256","components":null,"internalType":null,"indexed":false}],"anonymous":false},{"type":"event","name":"Deposit","inputs":[{"name":"sender","type":"address","components":null,"internalType":null,"indexed":true},{"name":"amount","type":"uint256","components":null,"internalType":null,"indexed":false},{"name":"timestamp","type":"uint256","components":null,"internalType":null,"indexed":false}],"anonymous":false},{"type":"fallback","stateMutability":"payable"},{"type":"function","name":"deposit","stateMutability":"payable","inputs":[],"outputs":[]},{"type":"function","name":"withdraw","stateMutability":"nonpayable","inputs":[{"name":"_v","type":"uint8","components":null,"internalType":null},{"name":"_r","type":"bytes32","components":null,"internalType":null},{"name":"_s","type":"bytes32","components":null,"internalType":null},{"name":"_message","type":"string","components":null,"internalType":null}],"outputs":[]},{"type":"function","name":"withdrawFor","stateMutability":"nonpayable","inputs":[{"name":"_user","type":"address","components":null,"internalType":null},{"name":"_v","type":"uint8","components":null,"internalType":null},{"name":"_r","type":"bytes32","components":null,"internalType":null},{"name":"_s","type":"bytes32","components":null,"internalType":null},{"name":"_message","type":"string","components":null,"internalType":null}],"outputs":[]},{"type":"function","name":"addBackend","stateMutability":"nonpayable","inputs":[{"name":"_backend","type":"address","components":null,"internalType":null}],"outputs":[]},{"type":"function","name":"removeBackend","stateMutability":"nonpayable","inputs":[{"name":"_backend","type":"address","components":null,"internalType":null}],"outputs":[]},{"type":"function","name":"transferOwnership","stateMutability":"nonpayable","inputs":[{"name":"_newOwner","type":"address","components":null,"internalType":null}],"outputs":[]},{"type":"function","name":"get_balance","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"time_until_next_withdrawal","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"get_nonce","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"get_withdrawal_count","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"get_expected_message","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"string","components":null,"internalType":null}]},{"type":"function","name":"owner","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"address","components":null,"internalType":null}]},{"type":"function","name":"authorizedBackends","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"bool","components":null,"internalType":null}]},{"type":"function","name":"last_global_withdrawal","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"last_recipient","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"address","components":null,"internalType":null}]},{"type":"function","name":"nonce","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"withdrawal_count","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"constructor","stateMutability":"nonpayable","inputs":[]}];

// DevFaucet ABI - Updated for proof-of-work faucet with 8 daily withdrawals
export const DEV_FAUCET_ABI = [
  {"type":"event","name":"Withdrawal","inputs":[{"name":"recipient","type":"address","indexed":true},{"name":"amount","type":"uint256","indexed":false},{"name":"block_time","type":"uint256","indexed":false},{"name":"withdrawal_count","type":"uint256","indexed":false},{"name":"withdrawal_index","type":"uint256","indexed":false},{"name":"difficulty_target","type":"uint256","indexed":false},{"name":"chosen_block","type":"uint256","indexed":false},{"name":"proof_hash","type":"bytes32","indexed":false}],"anonymous":false},
  {"type":"event","name":"Deposit","inputs":[{"name":"sender","type":"address","indexed":true},{"name":"amount","type":"uint256","indexed":false},{"name":"block_time","type":"uint256","indexed":false}],"anonymous":false},
  {"type":"fallback","stateMutability":"payable"},
  {"type":"function","name":"deposit","stateMutability":"payable","inputs":[],"outputs":[]},
  {"type":"function","name":"withdraw","stateMutability":"nonpayable","inputs":[{"name":"_chosen_block_hash","type":"bytes32"},{"name":"_withdrawal_index","type":"uint256"},{"name":"_ip_address","type":"bytes32"},{"name":"_nonce","type":"uint256"},{"name":"_v","type":"uint8"},{"name":"_r","type":"bytes32"},{"name":"_s","type":"bytes32"}],"outputs":[]},
  {"type":"function","name":"get_balance","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"time_until_next_withdrawal","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"get_nonce","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"get_withdrawal_count","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"get_expected_message","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"string"}]},
  {"type":"function","name":"get_next_withdrawal_index","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"get_next_withdrawal_amount","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"get_difficulty_target","stateMutability":"view","inputs":[{"name":"_withdrawal_index","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"verify_proof_of_work","stateMutability":"view","inputs":[{"name":"_user","type":"address"},{"name":"_chosen_block_hash","type":"bytes32"},{"name":"_withdrawal_index","type":"uint256"},{"name":"_ip_address","type":"bytes32"},{"name":"_nonce","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]},
  {"type":"function","name":"validate_hash","stateMutability":"pure","inputs":[{"name":"_user","type":"address"},{"name":"_chosen_block_hash","type":"bytes32"},{"name":"_withdrawal_index","type":"uint256"},{"name":"_ip_address","type":"bytes32"},{"name":"_nonce","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]},
  {"type":"function","name":"get_ip_address_hash","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"bytes32"}]},
  {"type":"function","name":"get_first_request_time","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"get_last_successful_block","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"time_until_daily_reset","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"get_user_daily_status","stateMutability":"view","inputs":[{"name":"_user","type":"address"}],"outputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"},{"name":"","type":"uint256"}]},
  {"type":"function","name":"last_global_withdrawal","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"nonce","stateMutability":"view","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"withdrawal_count","stateMutability":"view","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"first_request_time","stateMutability":"view","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"type":"function","name":"ip_address_hash","stateMutability":"view","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"bytes32"}]},
  {"type":"function","name":"last_successful_block","stateMutability":"view","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"uint256"}]}
];

export const NETWORKS = {
  animechain: {
    chainId: '0x10D88', // 69000 in hex
    chainName: 'AnimeChain',
    nativeCurrency: {
      name: 'Anime',
      symbol: 'ANIME',
      decimals: 18
    },
    rpcUrls: ['https://rpc-animechain-39xf6m45e3.t.conduit.xyz/'],
    blockExplorerUrls: ['https://explorer-animechain-39xf6m45e3.t.conduit.xyz/'],
    iconUrls: [window.location.origin + '/assets/animecoin.png']
  },
  animechain_testnet: {
    chainId: '0x1AF4', // 6900 in hex
    chainName: 'AnimeChain Testnet',
    nativeCurrency: {
      name: 'Test Anime',
      symbol: 'tANIME',
      decimals: 18
    },
    rpcUrls: ['https://rpc-conduit-orbit-deployer-d4pqjb0rle.t.conduit.xyz/'], // Conduit testnet RPC
    blockExplorerUrls: ['https://explorer-conduit-orbit-deployer-d4pqjb0rle.t.conduit.xyz/'], // Conduit testnet explorer
    iconUrls: [window.location.origin + '/assets/animecoin.png'],
    // Testnet configuration details
    parentChainId: 421614, // Arbitrum Sepolia
    nativeTokenAddress: '0x38208F36E9d6CE86ccE0977fA5690140Ec78A5d4',
    // Core contracts
    coreContracts: {
      rollup: '0xb31ae2dA8AF1227D3533DBE11a5E9B0bCfc738B4',
      inbox: '0x0590A4DEDCE7145e81BF59DB39029a27A6783141',
      outbox: '0xb1C0EbEADFf5f277727ABf8aCdC1031AA119A26d',
      bridge: '0x554105BbC8eB136933B210Eb60b5d7C9c592d6D8',
      sequencerInbox: '0x742FFc80b224C815E8faeE34DC0d612c722d5Bd0'
    },
    // Token bridge contracts
    tokenBridge: {
      l2: {
        router: '0xD9d44147aBefa4a965dfA02792A49A8672e1464F',
        standardGateway: '0xfD99AFa35cFb778cB6d16552CE62874E2838a293',
        customGateway: '0x7aE1625b7284dFcb6CA1431a547c4eA80b0A0490',
        multicall: '0xce1CAd780c529e66e3aa6D952a1ED9A6447791c1'
      },
      l3: {
        router: '0xbEE16d3e349DD7A5aEC190b1C03aA8f65A915360',
        standardGateway: '0x14B739e95cABeEC8C9f550530C5F701CBaAe9D38',
        customGateway: '0xEC44a2AcE1a58f5520Ca716873dF6E3f39c498b0',
        multicall: '0x2217BF4E11F8bd17A10e29F14E7d0E99A287E88F'
      }
    }
  },
  sepolia: {
    chainId: '0xaa36a7', // 11155111 in hex
    chainName: 'Sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  }
}; 