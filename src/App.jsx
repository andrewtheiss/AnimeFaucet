import { useState } from 'react'
import './App.css'
import Faucet from './components/Faucet'

// Contract address for AnimeChain
const CONTRACT_ADDRESS = "0x81AC57b126940a1F946Aed67e5C0F0351d607eAb";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  
  // Function for the Faucet component to call when wallet connection status changes
  const updateConnectionStatus = (connected) => {
    setIsConnected(connected);
  };

  return (
    <>
      <h1>AnimeChain Faucet</h1>
      <Faucet 
        contractAddress={CONTRACT_ADDRESS} 
        isDev={false} 
        onConnectionUpdate={updateConnectionStatus}
      />
      {!isConnected ? (
        <p className="read-the-docs">
          Connect your wallet to request ANIME tokens
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
