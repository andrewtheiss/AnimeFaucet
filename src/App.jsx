import { useState, useEffect } from 'react'
import './App.css'
import Faucet from './components/Faucet'

// Contract addresses for different networks
const CONTRACTS = {
  animechain: "0x5bC7B433dEc788dA9973807b3B4F1152a947aF0C", // Deployed Faucet with global cooldown on AnimeChain
  animechain_testnet: "0x0000000000000000000000000000000000000000", // TODO: Deploy faucet to AnimeChain testnet
  sepolia: "0xAc20e615f58812334308D1DAFa27C5Ca1Cc33B53"    // Test Faucet on Sepolia testnet
};

function App() {
  // Initialize network from localStorage or environment variable
  const [network, setNetwork] = useState(() => {
    const savedNetwork = localStorage.getItem('selectedNetwork');
    if (savedNetwork && ['animechain', 'animechain_testnet', 'sepolia'].includes(savedNetwork)) {
      return savedNetwork;
    }
    return import.meta.env.VITE_NETWORK || 'animechain_testnet'; // Default to testnet
  });

  const contractAddress = CONTRACTS[network];

  const handleNetworkChange = (newNetwork) => {
    setNetwork(newNetwork);
    localStorage.setItem('selectedNetwork', newNetwork);
    // Reload the page to ensure clean network switch
    window.location.reload();
  };

  const getNetworkDisplayName = () => {
    switch (network) {
      case 'animechain': return 'AnimeChain';
      case 'animechain_testnet': return 'AnimeChain Testnet';
      case 'sepolia': return 'Sepolia';
      default: return 'AnimeChain';
    }
  };

  const getTokenSymbol = () => {
    switch (network) {
      case 'animechain': return 'ANIME';
      case 'animechain_testnet': return 'tANIME';
      case 'sepolia': return 'SEP';
      default: return 'ANIME';
    }
  };

  return (
    <>
      <div className="network-selector">
        <label htmlFor="network-select">Select Network:</label>
        <select 
          id="network-select"
          value={network} 
          onChange={(e) => handleNetworkChange(e.target.value)}
          className="network-dropdown"
        >
          <option value="animechain">🎬 AnimeChain Mainnet</option>
          <option value="animechain_testnet">🧪 AnimeChain Testnet</option>
          <option value="sepolia">🔧 Sepolia Testnet</option>
        </select>
      </div>
      <h1>{getNetworkDisplayName()} Faucet</h1>
      <Faucet contractAddress={contractAddress} network={network} />
      <p className="read-the-docs">
        Connect your wallet to request {getTokenSymbol()} tokens
      </p>
    </>
  )
}

export default App
