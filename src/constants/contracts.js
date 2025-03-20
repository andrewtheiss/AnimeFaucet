export const WITHDRAWAL_MESSAGES = [
  "Ill use this ANIME coin to build something, maybe, or just hodl it til I can flex on normies, idk.",
  "Gonna build with this ANIME coin, not yeet it into a pool and cry wen moon like a pleb.",
  "Gonna use this ANIME coin to slap some code together or just diamond-hand it til I can rug my mom, lfg."
];

export const FAUCET_ABI = [{"type":"event","name":"Withdrawal","inputs":[{"name":"recipient","type":"address","components":null,"internalType":null,"indexed":true},{"name":"amount","type":"uint256","components":null,"internalType":null,"indexed":false},{"name":"timestamp","type":"uint256","components":null,"internalType":null,"indexed":false},{"name":"withdrawal_count","type":"uint256","components":null,"internalType":null,"indexed":false}],"anonymous":false},{"type":"event","name":"Deposit","inputs":[{"name":"sender","type":"address","components":null,"internalType":null,"indexed":true},{"name":"amount","type":"uint256","components":null,"internalType":null,"indexed":false},{"name":"timestamp","type":"uint256","components":null,"internalType":null,"indexed":false}],"anonymous":false},{"type":"fallback","stateMutability":"payable"},{"type":"function","name":"deposit","stateMutability":"payable","inputs":[],"outputs":[]},{"type":"function","name":"withdraw","stateMutability":"nonpayable","inputs":[{"name":"_v","type":"uint8","components":null,"internalType":null},{"name":"_r","type":"bytes32","components":null,"internalType":null},{"name":"_s","type":"bytes32","components":null,"internalType":null},{"name":"_message","type":"string","components":null,"internalType":null}],"outputs":[]},{"type":"function","name":"get_balance","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"time_until_next_withdrawal","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"get_nonce","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"get_withdrawal_count","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"get_expected_message","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"string","components":null,"internalType":null}]},{"type":"function","name":"last_withdrawal","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"nonce","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]},{"type":"function","name":"withdrawal_count","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":null,"internalType":null}],"outputs":[{"name":"","type":"uint256","components":null,"internalType":null}]}];

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