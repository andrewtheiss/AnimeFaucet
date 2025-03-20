import { useState } from 'react'
import './App.css'
import Faucet from './components/Faucet'

function App() {
  // Replace this with your deployed contract address
  const contractAddress = "0xYourContractAddress";

  return (
    <>
      <h1>ETH Faucet</h1>
      <Faucet contractAddress={contractAddress} />
      <p className="read-the-docs">
        Connect your wallet to request test ETH
      </p>
    </>
  )
}

export default App
