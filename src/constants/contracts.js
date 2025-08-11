// Legacy messages removed; DevFaucet messages are used everywhere

// DevFaucet Messages (8 messages for 8 withdrawals) - Now uses single signature!
export const DEV_FAUCET_MESSAGES = [
  "Ill use this ANIME coin to build something on ANIME chain.  Also, Earth domain is best.",
  "Gonna build more with this ANIME coin and not sell it like a degen.",
  "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me.",
  "I promise to use this ANIME coin for building and not just hodling forever.",
  "Building on ANIME chain with determination and hope for the future.",
  "This ANIME coin will help me create something meaningful and lasting.",
  "Using this ANIME coin to contribute to the ecosystem and community growth.",
  "Final ANIME coin withdrawal - time to build something truly remarkable."
];

// Original Faucet ABI removed; DevFaucet ABI is used for all networks

// DevFaucet ABI - WITH GASLESS WITHDRAWFOR FUNCTION!
export const DEV_FAUCET_ABI = [{"name": "Withdrawal", "inputs": [{"name": "recipient", "type": "address", "indexed": true}, {"name": "amount", "type": "uint256", "indexed": false}, {"name": "withdrawal_index", "type": "uint256", "indexed": false}, {"name": "chosen_block_hash", "type": "bytes32", "indexed": false}, {"name": "pow_nonce", "type": "uint256", "indexed": false}, {"name": "block_time", "type": "uint256", "indexed": false}], "anonymous": false, "type": "event"}, {"name": "Deposit", "inputs": [{"name": "depositor", "type": "address", "indexed": true}, {"name": "amount", "type": "uint256", "indexed": false}], "anonymous": false, "type": "event"}, {"name": "OwnershipTransferred", "inputs": [{"name": "previous_owner", "type": "address", "indexed": true}, {"name": "new_owner", "type": "address", "indexed": true}], "anonymous": false, "type": "event"}, {"stateMutability": "payable", "type": "function", "name": "deposit", "inputs": [], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "withdrawFor", "inputs": [{"name": "_recipient", "type": "address"}, {"name": "_chosen_block_hash", "type": "bytes32"}, {"name": "_withdrawal_index", "type": "uint256"}, {"name": "_ip_address", "type": "bytes32"}, {"name": "_pow_nonce", "type": "uint256"}, {"name": "_message", "type": "string"}, {"name": "_v", "type": "uint256"}, {"name": "_r", "type": "bytes32"}, {"name": "_s", "type": "bytes32"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "withdraw", "inputs": [{"name": "_chosen_block_hash", "type": "bytes32"}, {"name": "_withdrawal_index", "type": "uint256"}, {"name": "_ip_address", "type": "bytes32"}, {"name": "_pow_nonce", "type": "uint256"}, {"name": "_message", "type": "string"}], "outputs": []}, {"stateMutability": "view", "type": "function", "name": "get_difficulty_target", "inputs": [{"name": "_withdrawal_index", "type": "uint256"}], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "get_withdrawal_amount", "inputs": [{"name": "_withdrawal_index", "type": "uint256"}], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "get_expected_message", "inputs": [{"name": "_withdrawal_index", "type": "uint256"}], "outputs": [{"name": "", "type": "string"}]}, {"stateMutability": "nonpayable", "type": "function", "name": "update_withdrawal_amount", "inputs": [{"name": "_index", "type": "uint256"}, {"name": "_amount", "type": "uint256"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "update_pow_difficulty", "inputs": [{"name": "_index", "type": "uint256"}, {"name": "_difficulty", "type": "uint256"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "update_cooldown_period", "inputs": [{"name": "_period", "type": "uint256"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "update_base_amount_multiplier", "inputs": [{"name": "_multiplier", "type": "uint256"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "update_base_difficulty_multiplier", "inputs": [{"name": "_multiplier", "type": "uint256"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "withdraw_balance", "inputs": [{"name": "_amount", "type": "uint256"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "transfer_ownership", "inputs": [{"name": "_new_owner", "type": "address"}], "outputs": []}, {"stateMutability": "view", "type": "function", "name": "owner", "inputs": [], "outputs": [{"name": "", "type": "address"}]}, {"stateMutability": "view", "type": "function", "name": "withdrawal_count", "inputs": [{"name": "arg0", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "first_request_time", "inputs": [{"name": "arg0", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "ip_address_hash", "inputs": [{"name": "arg0", "type": "address"}], "outputs": [{"name": "", "type": "bytes32"}]}, {"stateMutability": "view", "type": "function", "name": "last_successful_block", "inputs": [{"name": "arg0", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "last_global_withdrawal", "inputs": [], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "nonce", "inputs": [{"name": "arg0", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "cooldown_period", "inputs": [], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "pow_base_difficulty", "inputs": [], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "base_amount_multiplier", "inputs": [], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "base_difficulty_multiplier", "inputs": [], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "withdrawal_amounts", "inputs": [{"name": "arg0", "type": "uint256"}], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "view", "type": "function", "name": "pow_difficulty_targets", "inputs": [{"name": "arg0", "type": "uint256"}], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "nonpayable", "type": "constructor", "inputs": [], "outputs": []}];

// Original FaucetServer ABI - Generated by Vyper compiler
// Original FaucetServer ABI removed; DevFaucetServer ABI is used for all networks

// DevFaucetServer ABI - Updated for single signature compatibility
export const DEV_FAUCET_SERVER_ABI = [{"stateMutability": "payable", "type": "function", "name": "deposit", "inputs": [], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "requestWithdrawal", "inputs": [{"name": "_faucet", "type": "address"}, {"name": "_user", "type": "address"}, {"name": "_chosen_block_hash", "type": "bytes32"}, {"name": "_withdrawal_index", "type": "uint256"}, {"name": "_ip_address", "type": "bytes32"}, {"name": "_pow_nonce", "type": "uint256"}, {"name": "_message", "type": "string"}, {"name": "_v", "type": "uint256"}, {"name": "_r", "type": "bytes32"}, {"name": "_s", "type": "bytes32"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "requestWithdrawalDirect", "inputs": [{"name": "_faucet", "type": "address"}, {"name": "_chosen_block_hash", "type": "bytes32"}, {"name": "_withdrawal_index", "type": "uint256"}, {"name": "_ip_address", "type": "bytes32"}, {"name": "_pow_nonce", "type": "uint256"}, {"name": "_message", "type": "string"}], "outputs": []}, {"stateMutability": "view", "type": "function", "name": "get_balance", "inputs": [], "outputs": [{"name": "", "type": "uint256"}]}, {"stateMutability": "nonpayable", "type": "function", "name": "withdraw_native", "inputs": [{"name": "_amount", "type": "uint256"}], "outputs": []}, {"stateMutability": "nonpayable", "type": "function", "name": "transfer_ownership", "inputs": [{"name": "_new_owner", "type": "address"}], "outputs": []}, {"stateMutability": "view", "type": "function", "name": "owner", "inputs": [], "outputs": [{"name": "", "type": "address"}]}, {"stateMutability": "nonpayable", "type": "constructor", "inputs": [], "outputs": []}];

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
    rpcUrls: ['https://testnet-rpc.anime.xyz/'], // Conduit testnet RPC
    blockExplorerUrls: ['https://explorer-animechain-testnet-i8yja6a1a0.t.conduit.xyz/'], // Conduit testnet explorer
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
  testnet: {
    chainId: '0x1AF4', // 6900 in hex
    chainName: 'AnimeChain Testnet',
    nativeCurrency: {
      name: 'Test Anime',
      symbol: 'tANIME',
      decimals: 18
    },
    rpcUrls: ['https://testnet-rpc.anime.xyz/'],
    blockExplorerUrls: ['https://explorer-animechain-testnet-i8yja6a1a0.t.conduit.xyz/'],
    iconUrls: [window.location.origin + '/assets/animecoin.png']
  }
}; 