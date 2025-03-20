import { useState, useEffect } from 'react'
import './App.css'
import Faucet from './components/Faucet'

// Contract addresses for different networks
const CONTRACTS = {
  animechain: "0x5bC7B433dEc788dA9973807b3B4F1152a947aF0C", // Deployed Faucet with global cooldown on AnimeChain
  sepolia: "0x5D5bFeD132CA71A6BC050c9753Cc3280711bb0c9"    // Test Faucet on Sepolia testnet
};

function App() {
  // Initialize isDev from localStorage or environment variable
  const [isDev, setIsDev] = useState(() => {
    const savedMode = localStorage.getItem('networkMode');
    if (savedMode !== null) {
      return savedMode === 'sepolia';
    }
    return import.meta.env.VITE_NETWORK === 'sepolia';
  });
  
  const [isConnected, setIsConnected] = useState(false);

  const contractAddress = isDev ? CONTRACTS.sepolia : CONTRACTS.animechain;

  const toggleNetwork = () => {
    const newMode = !isDev;
    setIsDev(newMode);
    localStorage.setItem('networkMode', newMode ? 'sepolia' : 'animechain');
    // Reload the page to ensure clean network switch
    window.location.reload();
  };
  
  // Function for the Faucet component to call when wallet connection status changes
  const updateConnectionStatus = (connected) => {
    setIsConnected(connected);
  };

  return (
    <>
      <div className="network-toggle">
        <button 
          onClick={toggleNetwork}
          className={`toggle-button ${isDev ? 'dev-mode' : ''}`}
        >
          {isDev ? '🔧 Switch to AnimeChain' : '🧪 Switch to Testnet'}
        </button>
      </div>
      <h1>{isDev ? 'Sepolia' : 'AnimeChain'} Faucet</h1>
      <Faucet 
        contractAddress={contractAddress} 
        isDev={isDev} 
        onConnectionUpdate={updateConnectionStatus}
      />
      {!isConnected ? (
        <p className="read-the-docs">
          Connect your wallet to request {isDev ? 'Sepolia' : 'ANIME'} tokens
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
