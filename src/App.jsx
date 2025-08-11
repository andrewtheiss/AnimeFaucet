import { useState } from 'react'
import './App.css'
import Faucet from './components/Faucet'
import RefillFooter from './components/RefillFooter'
import { NETWORKS } from './constants/contracts'

// Contract addresses for different networks - updated for devFaucet
const CONTRACTS = {
  animechain: "0xa335F64c4d45da5DdF5931405E79E4Cc17644177", // Production Faucet on AnimeChain mainnet (from animechain.dev)
  animechain_testnet: "0xC960563D5aF77EBB142F25504960723cCD3D4598", // DevFaucet on AnimeChain testnet (proof-of-work) - CORRECT ADDRESS
};

function App() {
  // Initialize network from localStorage or environment variable
  const [network, setNetwork] = useState(() => {
    const savedNetwork = localStorage.getItem('selectedNetwork');
    if (savedNetwork && ['animechain', 'animechain_testnet'].includes(savedNetwork)) {
      return savedNetwork;
    }
    return import.meta.env.VITE_NETWORK || 'animechain'; // Default to mainnet
  });
  
  const [isConnected, setIsConnected] = useState(false);

  const contractAddress = CONTRACTS[network];

  const handleNetworkChange = async (newNetwork) => {
    try {
      // Update React state first
      setNetwork(newNetwork);
      localStorage.setItem('selectedNetwork', newNetwork);
      
      // If user has MetaMask and is connected, switch the network
      if (window.ethereum && isConnected) {
        const networkConfig = NETWORKS[newNetwork];
        if (networkConfig) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: networkConfig.chainId }],
            });
          } catch (switchError) {
            // If network doesn't exist in MetaMask, add it
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [networkConfig],
              });
            } else {
              // For other errors, still reload the page
              console.error('Network switch error:', switchError);
              window.location.reload();
              return;
            }
          }
        }
      }
      
      // Reload the page to ensure clean network switch
      window.location.reload();
    } catch (error) {
      console.error('Error switching network:', error);
      // If anything fails, just reload the page
      window.location.reload();
    }
  };
  
  // Function for the Faucet component to call when wallet connection status changes
  const updateConnectionStatus = (connected) => {
    setIsConnected(connected);
  };

  const getNetworkDisplayName = () => {
    switch (network) {
      case 'animechain': return 'AnimeChain';
      case 'animechain_testnet': return 'AnimeChain Testnet';
      default: return 'AnimeChain';
    }
  };

  const getTokenSymbol = () => {
    switch (network) {
      case 'animechain': return 'ANIME';
      case 'animechain_testnet': return 'tANIME';
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
          <option value="animechain_testnet">🧪 AnimeChain Testnet (Proof of Work)</option>
        </select>
      </div>
      <h1>{getNetworkDisplayName()} Faucet</h1>
      <Faucet 
        contractAddress={contractAddress} 
        network={network}
        onConnectionUpdate={updateConnectionStatus}
      />
      {!isConnected ? (
        <p className="read-the-docs">Connect your wallet to request {getTokenSymbol()} tokens</p>
      ) : (
        <RefillFooter contractAddress={contractAddress} network={network} />
      )}
    </>
  )
}

export default App