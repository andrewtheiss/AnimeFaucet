import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FAUCET_ABI, NETWORKS, WITHDRAWAL_MESSAGES } from '../constants/contracts';

// Define constants to match contract
const COOLDOWN_PERIOD = 86400; // 24 hours in seconds (for UI display)

function Faucet({ contractAddress, isDev = false, onConnectionUpdate }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [cooldown, setCooldown] = useState('0');
  const [isInCooldownPeriod, setIsInCooldownPeriod] = useState(false);
  const [lastWithdrawal, setLastWithdrawal] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState('0');
  const [showRefill, setShowRefill] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [withdrawalCount, setWithdrawalCount] = useState(0);
  const [expectedMessage, setExpectedMessage] = useState('');
  const [updatingCooldown, setUpdatingCooldown] = useState(false);
  const [lastWithdrawer, setLastWithdrawer] = useState('');

  const networkConfig = isDev ? NETWORKS.sepolia : NETWORKS.animechain;

  const formatCooldown = () => {
    const cooldownSeconds = Number(cooldown);
    if (cooldownSeconds <= 0) return 'Available now';
    if (cooldownSeconds < 60) return `${cooldownSeconds} second${cooldownSeconds !== 1 ? 's' : ''}`;
    const minutes = Math.floor(cooldownSeconds / 60);
    const seconds = cooldownSeconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  const calculateCooldown = (lastWithdrawalTime) => {
    if (!lastWithdrawalTime || lastWithdrawalTime === '0') return '0';
    
    const nextAvailableTime = Number(lastWithdrawalTime) + COOLDOWN_PERIOD;
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (currentTime >= nextAvailableTime) return '0';
    return (nextAvailableTime - currentTime).toString();
  };

  const cooldownPercentage = () => {
    const cooldownSeconds = Number(cooldown);
    if (cooldownSeconds <= 0) return 100;
    // Using 24 hours (86400 seconds) for the cooldown period
    return 100 - (cooldownSeconds / 86400) * 100;
  };

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        
        console.log("=====================================================");
        console.log("INITIALIZING FAUCET WITH CONTRACT:", contractAddress);
        console.log("NETWORK CONFIG:", networkConfig);
        console.log("CHAIN ID (HEX):", networkConfig.chainId);
        console.log("CHAIN ID (DECIMAL):", parseInt(networkConfig.chainId, 16));
        console.log("=====================================================");
        
        const contract = new ethers.Contract(contractAddress, FAUCET_ABI, provider);
        setContract(contract);
        
        // Check if user is already connected
        try {
          const accounts = await provider.listAccounts();
          if (accounts && accounts.length > 0) {
            console.log("Found existing connected account:", accounts[0].address);
            setAccount(accounts[0].address);
          }
        } catch (error) {
          console.error("Error checking for existing accounts:", error);
        }
        
        window.ethereum.on('accountsChanged', (accounts) => setAccount(accounts[0] || null));
        window.ethereum.on('chainChanged', () => window.location.reload());
      }
    };
    init();
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, [contractAddress, networkConfig]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('Please install MetaMask');
      setLoading(true);
      setError('');
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkConfig.chainId }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig],
          });
        } else {
          throw switchError;
        }
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // After account is connected, immediately update user info
      setTimeout(() => updateInfo(), 500); // Small delay to ensure account is set
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInfo = async () => {
    if (!contract) return;
    try {
      console.log("Updating faucet information...");
      
      // Get contract balance via provider
      try {
        const balanceWei = await provider.getBalance(contractAddress);
        setBalance(ethers.formatEther(balanceWei));
      } catch (balErr) {
        console.error("Error getting contract balance:", balErr);
        setBalance('0');
      }
      
      // Get the last withdrawal timestamp
      const lastWithdrawalTime = await contract.last_global_withdrawal();
      setLastWithdrawal(lastWithdrawalTime.toString());
      
      // Check directly with the contract if there's a cooldown
      const contractCooldown = await contract.time_until_next_withdrawal();
      const isCurrentlyInCooldown = Number(contractCooldown) > 0;
      
      // Update the cooldown state based on contract response
      setIsInCooldownPeriod(isCurrentlyInCooldown);
      
      if (isCurrentlyInCooldown) {
        setCooldown(contractCooldown.toString());
      } else {
        setCooldown('0');
      }
      
      // Get last withdrawer
      try {
        const lastUserAddress = await contract.last_withdrawer();
        setLastWithdrawer(lastUserAddress || '');
      } catch (err) {
        console.error("Error getting last withdrawer:", err);
      }
      
      if (account) {
        console.log("Fetching data for account:", account);
        const nonce = await contract.get_nonce(account);
        setNonce(nonce.toString());
        console.log("Account nonce:", nonce.toString());
        
        const count = await contract.get_withdrawal_count(account);
        console.log("Account withdrawal count:", Number(count));
        setWithdrawalCount(Number(count));
        
        try {
          const message = await contract.get_expected_message(account);
          console.log("Expected message from contract:", message);
          setExpectedMessage(message);
        } catch (msgErr) {
          console.error("Error getting expected message:", msgErr);
          // Fallback to using the withdrawal messages array
          const fallbackMessage = WITHDRAWAL_MESSAGES[withdrawalCount] || "";
          console.log("Using fallback message:", fallbackMessage);
          setExpectedMessage(fallbackMessage);
        }
      } else {
        console.log("No account connected, skipping user-specific data");
      }
    } catch (err) {
      console.error('Error updating info:', err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => updateInfo(), 5000);
    updateInfo();
    return () => clearInterval(timer);
  }, [contract]);

  // Update user information when account changes
  useEffect(() => {
    if (account && contract) {
      console.log("Account changed, fetching user data...");
      updateInfo();
    }
  }, [account]);

  // Update the onConnectionUpdate prop whenever account changes
  useEffect(() => {
    if (onConnectionUpdate) {
      onConnectionUpdate(!!account);
    }
  }, [account, onConnectionUpdate]);

  const handleClaim = async () => {
    try {
      setLoading(true);
      setError('');
      console.log("Starting claim process...");
      console.log("Expected message:", expectedMessage);
      console.log("Current nonce:", nonce);
      
      // Check user balance first
      const userBalance = await provider.getBalance(account);
      console.log("User balance before claim:", ethers.formatEther(userBalance), networkConfig.nativeCurrency.symbol);
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      // Log chain ID conversion for debugging
      const chainIdHex = networkConfig.chainId;
      const chainIdDec = parseInt(networkConfig.chainId, 16);
      console.log("Chain ID (hex):", chainIdHex, "Chain ID (decimal):", chainIdDec);
      
      const domain = {
        name: "ANIMEFaucet",  // Must match exactly what's in the contract
        version: "1",
        chainId: chainIdDec, // Convert hex chainId to decimal
        verifyingContract: contractAddress
      };
      
      console.log("EIP-712 Domain:", domain);
      
      const types = {
        FaucetRequest: [
          { name: "recipient", type: "address" },
          { name: "message", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };
      
      // If expectedMessage is empty, fall back to the array
      const messageToSign = expectedMessage || WITHDRAWAL_MESSAGES[withdrawalCount];
      
      const message = {
        recipient: account,
        message: messageToSign,
        nonce: Number(nonce)
      };
      
      console.log("Signing message data:", message);
      
      // Show a warning if the expected message is empty
      if (!expectedMessage) {
        console.warn("Warning: Expected message from contract is empty, using fallback:", messageToSign);
      }
      
      console.log("Requesting signature from wallet...");
      const signature = await signer.signTypedData(domain, types, message);
      console.log("Signature obtained:", signature);
      
      const sig = ethers.Signature.from(signature);
      console.log("Parsed signature - v:", sig.v, "r:", sig.r, "s:", sig.s);
      
      // Verify signature locally before submitting to contract
      try {
        const recoveredAddress = ethers.verifyTypedData(domain, types, message, signature);
        console.log("Recovered address:", recoveredAddress);
        console.log("Actual address:", account);
        
        if (recoveredAddress.toLowerCase() !== account.toLowerCase()) {
          throw new Error(`Signature verification failed: recovered ${recoveredAddress}, expected ${account}`);
        }
        console.log("✅ Signature verified locally successfully!");
      } catch (verifyError) {
        console.error("Local signature verification failed:", verifyError);
        // Continue anyway, let the contract verify
      }
      
      console.log("Submitting gasless transaction to contract...");
      
      // Note the order of parameters for the claim function
      console.log("Calling claim with parameters:", {
        recipient: account,
        message: messageToSign,
        v: sig.v,
        r: sig.r,
        s: sig.s
      });
      
      const tx = await contractWithSigner.claim(
        account,         // _recipient
        messageToSign,   // _message
        sig.v,           // _v
        sig.r,           // _r
        sig.s            // _s
      );
      
      console.log("Transaction submitted:", tx.hash);
      console.log("Waiting for transaction confirmation...");
      
      const receipt = await tx.wait();
      console.log("Transaction confirmed! Receipt:", receipt);
      
      // Check user balance after claim
      const newBalance = await provider.getBalance(account);
      console.log("User balance after claim:", ethers.formatEther(newBalance), networkConfig.nativeCurrency.symbol);
      console.log("Balance change:", ethers.formatEther(newBalance - userBalance), networkConfig.nativeCurrency.symbol);
      
      // If we get here, the claim was successful
      console.log("✅ Claim successful!");
      
      await updateInfo();
    } catch (err) {
      console.error("Claim error:", err);
      setError(err.message || "Failed to claim tokens. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefill = async () => {
    try {
      if (!refillAmount || parseFloat(refillAmount) <= 0) throw new Error('Please enter a valid amount');
      setLoading(true);
      setError('');
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      const amountInWei = ethers.parseEther(refillAmount);
      const tx = await contractWithSigner.fund({ value: amountInWei });
      await tx.wait();
      setRefillAmount('');
      setShowRefill(false);
      await updateInfo();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshCooldown = async () => {
    try {
      if (contract) {
        setUpdatingCooldown(true);
        
        // Get contract balance via provider
        try {
          const balanceWei = await provider.getBalance(contractAddress);
          setBalance(ethers.formatEther(balanceWei));
          console.log("Contract balance:", ethers.formatEther(balanceWei), networkConfig.nativeCurrency.symbol);
        } catch (balErr) {
          console.error("Error getting contract balance:", balErr);
        }
        
        // Get the cooldown directly from the contract
        const contractCooldown = await contract.time_until_next_withdrawal();
        console.log("Contract reported cooldown on refresh:", contractCooldown.toString());
        
        // Also fetch the last withdrawal time for debugging
        const lastWithdrawalTime = await contract.last_global_withdrawal();
        console.log("Last withdrawal timestamp:", lastWithdrawalTime.toString());
        console.log("Current timestamp:", Math.floor(Date.now() / 1000));
        console.log("Time difference:", Math.floor(Date.now() / 1000) - Number(lastWithdrawalTime), "seconds");
        console.log("Cooldown period:", COOLDOWN_PERIOD, "seconds");
        
        // Update states based on contract response
        const isCurrentlyInCooldown = Number(contractCooldown) > 0;
        setIsInCooldownPeriod(isCurrentlyInCooldown);
        console.log("Is in cooldown period:", isCurrentlyInCooldown);
        
        if (isCurrentlyInCooldown) {
          setCooldown(contractCooldown.toString());
        } else {
          setCooldown('0');
        }
        
        // Also update the last withdrawal time
        setLastWithdrawal(lastWithdrawalTime.toString());
        
        // Get last withdrawer
        try {
          const lastUserAddress = await contract.last_withdrawer();
          setLastWithdrawer(lastUserAddress || '');
          console.log("Last withdrawer:", lastUserAddress || 'None');
        } catch (err) {
          console.error("Error getting last withdrawer:", err);
        }
      }
    } catch (err) {
      console.error("Error updating cooldown:", err);
    } finally {
      setUpdatingCooldown(false);
    }
  };

  return (
    <div className="faucet-container">
      {isDev && <div className="dev-banner">Development Mode - Using Sepolia Testnet</div>}
      
      {!account ? (
        <>
          <div className="disclaimer-box">
            <h3>⚠️ Developer Faucet Disclaimer</h3>
            <p>This faucet is exclusively for ANIME CHAIN L3 developers to quickly obtain funds for deploying dapps and testing applications.</p>
            <p>Funds are intended for development purposes only, not for trading or speculation.</p>
          </div>
          <button onClick={connectWallet} disabled={loading} className="connect-button">
            {loading ? 'Connecting...' : `Connect to ${networkConfig.chainName}`}
          </button>
        </>
      ) : (
        <div>
          <div className="info-container">
            <div className="network-info">
              <span className="network-badge">{networkConfig.chainName}</span>
            </div>
            <p className="account-info">Connected Account: {account}</p>
            <p className="balance-info">Faucet Balance: {balance} {networkConfig.nativeCurrency.symbol}</p>
            
            {/* Cooldown display that only updates on page load or manual refresh */}
            <div className="cooldown-container">
              <div className={`cooldown-info-container ${isInCooldownPeriod ? 'no-refresh' : ''}`}>
                <p className="cooldown-info">
                  {isInCooldownPeriod ? 
                    `Global cooldown: ${formatCooldown()}` : 
                    'Global cooldown: Available now'}
                </p>
                <button 
                  onClick={refreshCooldown}
                  className={`refresh-cooldown-button ${isInCooldownPeriod ? 'hidden' : ''}`}
                  title="Refresh cooldown timer"
                  disabled={updatingCooldown}
                >
                  {updatingCooldown ? '…' : '⟳'}
                </button>
              </div>
              
              <div className={`cooldown-details ${isInCooldownPeriod ? 'visible' : 'hidden'}`}>
                <div className="cooldown-progress-container">
                  <div className="cooldown-progress-bar" style={{ width: `${cooldownPercentage()}%` }}></div>
                </div>
                <p className="cooldown-warning">The faucet has a global cooldown period. Please wait until the timer completes.</p>
                
                <div className="cooldown-metrics">
                  <div className="cooldown-metric">
                    <span className="metric-label">Time remaining:</span>
                    <span className="metric-value">{formatCooldown()}</span>
                  </div>
                  {lastWithdrawer && (
                    <div className="cooldown-metric">
                      <span className="metric-label">Last claimer:</span>
                      <span className="metric-value withdrawer-address">{lastWithdrawer.slice(0, 6)}...{lastWithdrawer.slice(-4)}</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={refreshCooldown}
                  className="update-cooldown-button"
                  disabled={updatingCooldown}
                >
                  {updatingCooldown ? 'Updating...' : 'Update Cooldown Timer'}
                </button>
              </div>
            </div>
            
            <p className="withdrawal-count">
              Claims completed: <span className="count">{withdrawalCount}</span> / 3
            </p>

            <div className="gasless-info">
              <p>
                <span className="gasless-highlight">Gasless Transactions!</span> 
                This faucet uses ANIME Chain's gasless transaction feature - you don't need ANIME tokens to claim ANIME. 
                Just sign the message and the contract will pay the gas fees for you.
              </p>
              <p className="gasless-debug-tip">
                <strong>Debug tip:</strong> Check the console logs (F12) for detailed debugging information about the signature process.
                Your balance should not decrease after a successful claim - confirming the gasless transaction worked!
              </p>
            </div>
          </div>
          {withdrawalCount < 3 && (
            <div className="messages-container">
              <h3>Sign Message to get 0.1 {networkConfig.nativeCurrency.symbol}</h3>
              <p className="signature-info">A unique signature is required for each claim (24-hour global cooldown)</p>
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
                  {expectedMessage && expectedMessage !== WITHDRAWAL_MESSAGES[withdrawalCount] && (
                    <div className="expected-message">
                      <p><strong>Contract expects:</strong> {expectedMessage}</p>
                    </div>
                  )}
                  <div className="message-highlight">
                    <span>✍️ Sign this message to receive 0.1 tokens</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="actions-container">
            <button
              onClick={handleClaim}
              disabled={loading || isInCooldownPeriod || withdrawalCount >= 3}
              className="action-button"
            >
              {loading ? 'Processing...' :
                withdrawalCount >= 3 ? 'Maximum claims reached' :
                isInCooldownPeriod ? `Faucet available in ${formatCooldown()}` :
                `Sign & Claim 0.1 ${networkConfig.nativeCurrency.symbol} Tokens`}
            </button>
            <button onClick={() => setShowRefill(!showRefill)} className="refill-toggle-button" style={{ display: 'none' }}>
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
              <button onClick={handleRefill} disabled={loading || !refillAmount} className="refill-button">
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