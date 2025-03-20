import { useState, useEffect } from 'react'
import './App.css'
import Faucet from './components/Faucet'

// Contract addresses for different networks
const CONTRACTS = {
  animechain: "0xf5E5D9Db76df3E097E4fc6a6b432E39557Ce81DD", // New gasless faucet contract
  sepolia: "0xf5E5D9Db76df3E097E4fc6a6b432E39557Ce81DD"     // Using same contract for both networks for now
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
