import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FAUCET_ABI, NETWORKS, WITHDRAWAL_MESSAGES } from '../constants/contracts';

// Define constants to match contract
const COOLDOWN_PERIOD = 900; // 15 minutes in seconds

function Faucet({ contractAddress, isDev = false }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [cooldown, setCooldown] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState('0');
  const [showRefill, setShowRefill] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [withdrawalCount, setWithdrawalCount] = useState(0);
  const [expectedMessage, setExpectedMessage] = useState('');

  // Get the appropriate network configuration based on isDev flag
  const networkConfig = isDev ? NETWORKS.sepolia : NETWORKS.animechain;

  // Format cooldown for display
  const formatCooldown = () => {
    const cooldownSeconds = Number(cooldown);
    if (cooldownSeconds <= 0) return 'Available now';
    
    if (cooldownSeconds < 60) {
      return `${cooldownSeconds} second${cooldownSeconds !== 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(cooldownSeconds / 60);
      const seconds = cooldownSeconds % 60;
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  };

  // Calculate cooldown percentage for progress display
  const cooldownPercentage = () => {
    const cooldownSeconds = Number(cooldown);
    if (cooldownSeconds <= 0) return 100;
    return 100 - (cooldownSeconds / COOLDOWN_PERIOD) * 100;
  };

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        
        // Create contract instance
        const contract = new ethers.Contract(contractAddress, FAUCET_ABI, provider);
        setContract(contract);

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0] || null);
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      }
    };
    init();

    // Cleanup listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, [contractAddress]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      setLoading(true);
      setError('');

      // First try to add/switch to the appropriate network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkConfig.chainId }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig],
          });
        } else {
          throw switchError;
        }
      }

      // After ensuring we're on the right chain, connect the wallet
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInfo = async () => {
    if (!contract || !account) return;
    
    try {
      const balance = await contract.get_balance();
      setBalance(ethers.formatEther(balance));
      
      const cooldown = await contract.time_until_next_withdrawal(account);
      setCooldown(cooldown.toString());

      const nonce = await contract.get_nonce(account);
      setNonce(nonce.toString());

      const count = await contract.get_withdrawal_count(account);
      setWithdrawalCount(Number(count));

      const message = await contract.get_expected_message(account);
      setExpectedMessage(message);
    } catch (err) {
      console.error('Error updating info:', err);
    }
  };

  // Add a timer to update the cooldown
  useEffect(() => {
    let timer;
    if (account) {
      // Update info immediately
      updateInfo();
      
      // Set interval to update cooldown and other info every 15 seconds for 15-minute cooldowns
      timer = setInterval(() => {
        updateInfo();
      }, 15000);
    }
    
    // Cleanup timer on unmount or when account changes
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [account, contract]);

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log("Starting withdrawal process...");
      console.log("Expected message:", expectedMessage);
      console.log("Current nonce:", nonce);
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Create the domain separator
      const domain = {
        name: 'Faucet',
        version: '1',
        chainId: networkConfig.chainId,
        verifyingContract: contractAddress
      };

      // Define the types to match the contract's MESSAGE_TYPEHASH
      const types = {
        FaucetRequest: [
          { name: 'recipient', type: 'address' },
          { name: 'message', type: 'string' },
          { name: 'nonce', type: 'uint256' }
        ]
      };

      // Create the message with the expected degen message
      const message = {
        recipient: account,
        message: expectedMessage,
        nonce: parseInt(nonce)
      };

      console.log("Signing data:", { domain, types, message });
      
      // Get the signature
      const signature = await signer.signTypedData(domain, types, message);
      console.log("Signature obtained:", signature);
      
      // Split signature into v, r, s
      const sig = ethers.Signature.from(signature);
      
      // Call withdraw with signature components and message
      console.log("Calling withdraw with signature and message...");
      const tx = await contractWithSigner.withdraw(sig.v, sig.r, sig.s, expectedMessage);
      console.log("Transaction submitted:", tx.hash);
      
      await tx.wait();
      console.log("Transaction confirmed!");
      
      await updateInfo();
    } catch (err) {
      console.error("Withdrawal error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefill = async () => {
    try {
      if (!refillAmount || parseFloat(refillAmount) <= 0) {
        throw new Error('Please enter a valid amount');
      }

      setLoading(true);
      setError('');
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const amountInWei = ethers.parseEther(refillAmount);
      const tx = await contractWithSigner.deposit({ value: amountInWei });
      await tx.wait();
      
      // Clear refill amount and hide the form
      setRefillAmount('');
      setShowRefill(false);
      
      await updateInfo();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="faucet-container">
      {isDev && (
        <div className="dev-banner">
          Development Mode - Using Sepolia Testnet
        </div>
      )}
      {!account ? (
        <button 
          onClick={connectWallet} 
          disabled={loading}
          className="connect-button"
        >
          {loading ? 'Connecting...' : `Connect to ${networkConfig.chainName}`}
        </button>
      ) : (
        <div>
          <div className="info-container">
            <div className="network-info">
              <span className="network-badge">{networkConfig.chainName}</span>
            </div>
            <p className="account-info">Connected Account: {account}</p>
            <p className="balance-info">Faucet Balance: {balance} {networkConfig.nativeCurrency.symbol}</p>
            <p className="cooldown-info">Time until next withdrawal: {formatCooldown()}</p>
            {Number(cooldown) > 0 && (
              <>
                <div className="cooldown-progress-container">
                  <div 
                    className="cooldown-progress-bar" 
                    style={{width: `${cooldownPercentage()}%`}}
                  ></div>
                </div>
                <p className="cooldown-warning">Please wait for the 15-minute cooldown to complete before your next withdrawal.</p>
              </>
            )}
            <p className="withdrawal-count">
              Withdrawals completed: <span className="count">{withdrawalCount}</span> / 3
            </p>
          </div>

          {withdrawalCount < 3 && (
            <div className="messages-container">
              <h3>Sign Message to get 0.1 {networkConfig.nativeCurrency.symbol}</h3>
              <p className="signature-info">A unique signature is required for each withdrawal (15 minute cooldown)</p>
              
              <div className="message-progress">
                <div className={`progress-step ${withdrawalCount >= 1 ? 'completed' : withdrawalCount === 0 ? 'current' : ''}`}>1</div>
                <div className="progress-line"></div>
                <div className={`progress-step ${withdrawalCount >= 2 ? 'completed' : withdrawalCount === 1 ? 'current' : ''}`}>2</div>
                <div className="progress-line"></div>
                <div className={`progress-step ${withdrawalCount >= 3 ? 'completed' : withdrawalCount === 2 ? 'current' : ''}`}>3</div>
              </div>
              
              <div className="current-message">
                <div className="message-content">
                  <p>{WITHDRAWAL_MESSAGES[withdrawalCount]}</p>
                  <div className="message-highlight">
                    <span>✍️ Sign this message to receive 0.1 tokens</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="actions-container">
            <button 
              onClick={handleWithdraw} 
              disabled={loading || Number(cooldown) > 0 || withdrawalCount >= 3}
              className="action-button"
            >
              {loading ? 'Processing...' : 
                withdrawalCount >= 3 ? 'Maximum withdrawals reached' :
                Number(cooldown) > 0 ? `Available in ${formatCooldown()}` :
                `Sign & Request 0.1 ${networkConfig.nativeCurrency.symbol} Tokens`}
            </button>
            
            <button 
              onClick={() => setShowRefill(!showRefill)}
              className="refill-toggle-button"
            >
              {showRefill ? '↑ Hide Refill' : '↓ Show Refill'}
            </button>
          </div>

          {showRefill && (
            <div className="refill-container">
              <input
                type="number"
                value={refillAmount}
                onChange={(e) => setRefillAmount(e.target.value)}
                placeholder={`Amount in ${networkConfig.nativeCurrency.symbol}`}
                className="refill-input"
                min="0"
                step="0.1"
              />
              <button 
                onClick={handleRefill}
                disabled={loading || !refillAmount}
                className="refill-button"
              >
                {loading ? 'Processing...' : 'Refill Faucet'}
              </button>
            </div>
          )}
          
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default Faucet; 