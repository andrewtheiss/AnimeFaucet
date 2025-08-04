import { useState } from 'react'
import './App.css'
import Faucet from './components/Faucet'

// Contract addresses for different networks - updated for devFaucet
const CONTRACTS = {
  animechain: "0x81AC57b126940a1F946Aed67e5C0F0351d607eAb", // Production Faucet on AnimeChain mainnet (from animechain.dev)
  animechain_testnet: "0x0000000000000000000000000000000000000000", // TODO: Deploy devFaucet to AnimeChain testnet
  sepolia: "0xAc20e615f58812334308D1DAFa27C5Ca1Cc33B53"    // devFaucet on Sepolia testnet
};

function App() {
  // Initialize network from localStorage or environment variable
  const [network, setNetwork] = useState(() => {
    const savedNetwork = localStorage.getItem('selectedNetwork');
    if (savedNetwork && ['animechain', 'animechain_testnet', 'sepolia'].includes(savedNetwork)) {
      return savedNetwork;
    }
    return import.meta.env.VITE_NETWORK || 'sepolia'; // Default to sepolia for devFaucet testing
  });
  
  const [isConnected, setIsConnected] = useState(false);

  const contractAddress = CONTRACTS[network];

  const handleNetworkChange = (newNetwork) => {
    setNetwork(newNetwork);
    localStorage.setItem('selectedNetwork', newNetwork);
    // Reload the page to ensure clean network switch
    window.location.reload();
  };
  
  // Function for the Faucet component to call when wallet connection status changes
  const updateConnectionStatus = (connected) => {
    setIsConnected(connected);
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
      <Faucet 
        contractAddress={contractAddress} 
        network={network}
        onConnectionUpdate={updateConnectionStatus}
      />
      {!isConnected ? (
        <p className="read-the-docs">
          Connect your wallet to request {getTokenSymbol()} tokens
        </p>
      ) : (
        <div className="refill-footer">
          <button 
            onClick={() => document.querySelector('.refill-toggle-button')?.click()} 
            className="footer-refill-button"
          >
            🔄 Refill Faucet
          </button>
        </div>
      )}
    </>
  )
}

export default App
