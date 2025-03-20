import { useState, useEffect } from 'react'
import './App.css'
import Faucet from './components/Faucet'

// Contract addresses for different networks
const CONTRACTS = {
  animechain: "0x64Db85e180b0D749F000446f4A77e51eA116F62A", // Deployed Faucet contract on AnimeChain
  sepolia: "0xAc20e615f58812334308D1DAFa27C5Ca1Cc33B53"    // Test Faucet on Sepolia testnet
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

  const contractAddress = isDev ? CONTRACTS.sepolia : CONTRACTS.animechain;

  const toggleNetwork = () => {
    const newMode = !isDev;
    setIsDev(newMode);
    localStorage.setItem('networkMode', newMode ? 'sepolia' : 'animechain');
    // Reload the page to ensure clean network switch
    window.location.reload();
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
      <Faucet contractAddress={contractAddress} isDev={isDev} />
      <p className="read-the-docs">
        Connect your wallet to request {isDev ? 'Sepolia' : 'ANIME'} tokens
      </p>
    </>
  )
}

export default App
