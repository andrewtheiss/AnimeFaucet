import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FAUCET_ABI, NETWORKS, WITHDRAWAL_MESSAGES } from '../constants/contracts';

// Define constants to match contract
const COOLDOWN_PERIOD = 450; // 7.5 minutes in seconds (match contract)

function Faucet({ contractAddress, isDev = false, onConnectionUpdate }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [cooldown, setCooldown] = useState('0');
  const [lastWithdrawal, setLastWithdrawal] = useState('0');
  const [loading, setLoading] = useState(false);
  const [serverLoading, setServerLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [nonce, setNonce] = useState('0');
  const [showRefill, setShowRefill] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [withdrawalCount, setWithdrawalCount] = useState(0);
  const [expectedMessage, setExpectedMessage] = useState('');
  const [updatingCooldown, setUpdatingCooldown] = useState(false);
  const [lastRecipient, setLastRecipient] = useState('');

  const networkConfig = isDev ? NETWORKS.sepolia : NETWORKS.animechain;

  const formatCooldown = () => {
    const cooldownSeconds = Number(cooldown);
    if (cooldownSeconds <= 0) return 'Available now';
    if (cooldownSeconds < 60) return `${cooldownSeconds} second${cooldownSeconds !== 1 ? 's' : ''}`;
    const minutes = Math.floor(cooldownSeconds / 60);
    const seconds = cooldownSeconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  const calculateCooldown = () => {
    // If no prior withdrawal, cooldown is 0
    if (lastWithdrawal === '0') return '0';
    
    const lastWithdrawalTime = Number(lastWithdrawal);
    const nextAvailableTime = lastWithdrawalTime + COOLDOWN_PERIOD;
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    
    if (currentTime >= nextAvailableTime) return '0';
    return (nextAvailableTime - currentTime).toString();
  };

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
  }, [contractAddress]);

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
      setTimeout(() => updateInfo(accounts[0], contract), 500); // Small delay to ensure account is set
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInfo = async (currentAccount = null, currentContract = null) => {
    // Use parameters if provided, otherwise fall back to state values
    const contractToUse = currentContract || contract;
    const accountToUse = currentAccount || account;
    
    if (!contractToUse) return;
    try {
      console.log("Updating faucet information...");
      const balance = await contractToUse.get_balance();
      setBalance(ethers.formatEther(balance));
      
      // Only update cooldown data if we don't have an active cooldown timer
      // or if the cooldown is already expired
      if (Number(cooldown) <= 0) {
        // Get the last withdrawal timestamp
        const lastWithdrawalTime = await contractToUse.last_global_withdrawal();
        setLastWithdrawal(lastWithdrawalTime.toString());
        
        // Calculate cooldown based on last withdrawal time
        const calculatedCooldown = calculateCooldown();
        setCooldown(calculatedCooldown);
        
        // Get the last recipient if we're checking cooldown
        try {
          const recipient = await contractToUse.last_recipient();
          setLastRecipient(recipient);
        } catch (recipientErr) {
          console.error("Error getting last recipient:", recipientErr);
        }
      }
      
      if (accountToUse) {
        console.log("Fetching data for account:", accountToUse);
        const nonce = await contractToUse.get_nonce(accountToUse);
        setNonce(nonce.toString());
        console.log("Account nonce:", nonce.toString());
        
        const count = await contractToUse.get_withdrawal_count(accountToUse);
        console.log("Account withdrawal count:", Number(count));
        setWithdrawalCount(Number(count));
        
        try {
          const message = await contractToUse.get_expected_message(accountToUse);
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
    const timer = setInterval(() => updateInfo(account, contract), 5000);
    updateInfo(account, contract);
    return () => clearInterval(timer);
  }, [contract]);

  // Update cooldown time every second based on last withdrawal time
  useEffect(() => {
    const updateCooldownTimer = () => {
      if (lastWithdrawal !== '0') {
        const calculatedCooldown = calculateCooldown();
        setCooldown(calculatedCooldown);
      }
    };
    
    const timer = setInterval(updateCooldownTimer, 1000);
    return () => clearInterval(timer);
  }, [lastWithdrawal]);

  // Update user information when account changes
  useEffect(() => {
    if (account && contract) {
      console.log("Account changed, fetching user data...");
      updateInfo(account, contract);
    }
  }, [account]);

  // Update the onConnectionUpdate prop whenever account changes
  useEffect(() => {
    if (onConnectionUpdate) {
      onConnectionUpdate(!!account);
    }
  }, [account, onConnectionUpdate]);

  // Create display messages that hide certain text for UI
  const getDisplayMessage = (index) => {
    // For the first message, hide the "Earth domain is best" part in the UI
    if (index === 0) {
      return "I'll use this ANIME coin to build something on ANIME chain.";
    }
    // For other messages, use the original text
    return WITHDRAWAL_MESSAGES[index];
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
      console.log("Starting withdrawal process...");
      console.log("Expected message:", expectedMessage);
      console.log("Current nonce:", nonce);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      const domain = {
        name: "Faucet",
        version: "1",
        chainId: parseInt(networkConfig.chainId, 16), // Convert hex chainId to decimal
        verifyingContract: contractAddress
      };
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
      
      console.log("Signing data:", { domain, types, message });
      
      // Show a warning if the expected message is empty
      if (!expectedMessage) {
        console.warn("Warning: Expected message from contract is empty, using fallback");
      }
      const signature = await signer.signTypedData(domain, types, message);
      console.log("Signature obtained:", signature);
      const sig = ethers.Signature.from(signature);
      
      // For first withdrawal (withdrawalCount == 0), use server API
      if (withdrawalCount === 0) {
        // Determine server URL based on current network
        const serverUrl = isDev ? 'http://localhost:5000' : 'http://localhost:5000' ; //'http://45.33.62.126:5000';
        console.log(`Using server at ${serverUrl} for first withdrawal`);
        
        try {
          setServerLoading(true);
          const response = await fetch(`${serverUrl}/request-withdrawal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              network: isDev ? 'sepolia' : 'animechain',
              user_address: account,
              v: sig.v,
              r: sig.r,
              s: sig.s,
              message: messageToSign
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
            
            // Special handling for server funds error
            if (errorData.error && errorData.error.includes('Server has insufficient funds')) {
              console.error("Server insufficient funds:", errorData);
              throw new Error('The server does not have enough ETH to pay for gas. Please contact the administrator.');
            }
            
            throw new Error(errorData.error || `Server returned status ${response.status}`);
          }
          
          const result = await response.json();
          if (result.error) {
            throw new Error(result.error);
          }
          console.log("Server response:", result);
          console.log("Transaction hash:", result.tx_hash);
          setSuccessMessage(`Server processed your request! Transaction: ${result.tx_hash.substring(0, 10)}...`);
          
          // Clear success message after 5 seconds
          setTimeout(() => setSuccessMessage(''), 5000);
        } catch (fetchError) {
          if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
            throw new Error(`Could not connect to server at ${serverUrl}. Server may be offline.`);
          }
          throw fetchError;
        } finally {
          setServerLoading(false);
        }
      } else {
        // For subsequent withdrawals, use direct contract interaction
        console.log("Calling withdraw directly with signature and message...");
        const tx = await contractWithSigner.withdraw(sig.v, sig.r, sig.s, messageToSign);
        console.log("Transaction submitted:", tx.hash);
        await tx.wait();
        console.log("Transaction confirmed!");
      }
      
      await updateInfo(account, contract);
    } catch (err) {
      console.error("Withdrawal error:", err);
      setError(err.message || "Failed to withdraw. Check console for details.");
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
      const tx = await contractWithSigner.deposit({ value: amountInWei });
      await tx.wait();
      setRefillAmount('');
      setShowRefill(false);
      await updateInfo(account, contract);
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
        // Get the last withdrawal timestamp
        const lastWithdrawalTime = await contract.last_global_withdrawal();
        setLastWithdrawal(lastWithdrawalTime.toString());
        
        // Calculate cooldown based on last withdrawal time
        const calculatedCooldown = calculateCooldown();
        setCooldown(calculatedCooldown);
        
        // Get the last recipient when refreshing cooldown
        try {
          const recipient = await contract.last_recipient();
          setLastRecipient(recipient);
        } catch (recipientErr) {
          console.error("Error getting last recipient:", recipientErr);
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
        <button onClick={connectWallet} disabled={loading} className="connect-button">
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
            {Number(cooldown) > 0 ? (
              <>
                <div className="cooldown-info-container no-refresh">
                  <p className="cooldown-info">Global cooldown: {formatCooldown()}</p>
                </div>
                <div className="cooldown-progress-container">
                  <div className="cooldown-progress-bar" style={{ width: `${cooldownPercentage()}%` }}></div>
                </div>
                <p className="cooldown-warning">The faucet has a global cooldown - all users must wait until the timer completes.</p>
                {lastRecipient && (
                  <p className="last-recipient">
                    Last recipient: <span className="address">{lastRecipient.substring(0, 6)}...{lastRecipient.substring(lastRecipient.length - 4)}</span>
                  </p>
                )}
                <button 
                  onClick={refreshCooldown}
                  className="update-cooldown-button"
                  disabled={updatingCooldown}
                >
                  {updatingCooldown ? 'Updating...' : 'Update Cooldown Timer'}
                </button>
              </>
            ) : (
              <>
                <div className="cooldown-info-container">
                  <p className="cooldown-info">Global cooldown: {formatCooldown()}</p>
                  <button 
                    onClick={refreshCooldown}
                    className="refresh-cooldown-button"
                    title="Refresh cooldown timer"
                    disabled={updatingCooldown}
                  >
                    {updatingCooldown ? '…' : '⟳'}
                  </button>
                </div>
                {lastRecipient && (
                  <p className="last-recipient">
                    Last recipient: <span className="address">{lastRecipient.substring(0, 6)}...{lastRecipient.substring(lastRecipient.length - 4)}</span>
                  </p>
                )}
              </>
            )}
            <p className="withdrawal-count">
              Withdrawals completed: <span className="count">{withdrawalCount}</span> / 3
            </p>
          </div>
          {withdrawalCount < 3 && (
            <div className="messages-container">
              <h3>Sign Message to get 0.1 {networkConfig.nativeCurrency.symbol}</h3>
              <p className="signature-info">A unique signature is required for each withdrawal (global 7.5 minute cooldown)</p>
              <div className="message-progress">
                <div className={`progress-step ${withdrawalCount >= 1 ? 'completed' : withdrawalCount === 0 ? 'current' : ''}`}>1</div>
                <div className="progress-line"></div>
                <div className={`progress-step ${withdrawalCount >= 2 ? 'completed' : withdrawalCount === 1 ? 'current' : ''}`}>2</div>
                <div className="progress-line"></div>
                <div className={`progress-step ${withdrawalCount >= 3 ? 'completed' : withdrawalCount === 2 ? 'current' : ''}`}>3</div>
              </div>
              {withdrawalCount === 0 && (
                <div className="first-withdrawal-info">
                  <p>Your first withdrawal will be processed through our server to simplify the gas payment process.</p>
                  <p>Subsequent withdrawals will interact with the contract directly.</p>
                </div>
              )}
              <div className="current-message">
                <div className="message-content">
                  <p>{getDisplayMessage(withdrawalCount)}</p>
                  {expectedMessage && expectedMessage !== WITHDRAWAL_MESSAGES[withdrawalCount] && (
                    <div className="expected-message">
                      <p><strong>Contract expects:</strong> {expectedMessage.replace("  Also, Earth domain is best.", "")}</p>
                    </div>
                  )}
                  <div className="message-highlight">
                    <span>✍️ Sign this message to receive 0.1 tokens</span>
                  </div>
                  {withdrawalCount === 0 && (
                    <div className="server-info">
                      <p>📡 First withdrawal will use server API at {isDev ? 'localhost' : '45.33.62.126'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="actions-container">
            <button
              onClick={handleWithdraw}
              disabled={loading || serverLoading || Number(cooldown) > 0 || withdrawalCount >= 3}
              className="action-button"
            >
              {loading ? 'Processing...' :
                serverLoading ? 'Sending to Server...' :
                withdrawalCount >= 3 ? 'Maximum withdrawals reached' :
                Number(cooldown) > 0 ? `Faucet available in ${formatCooldown()}` :
                withdrawalCount === 0 ? `Sign & Request via Server (First Withdrawal)` :
                `Sign & Request 0.1 ${networkConfig.nativeCurrency.symbol} Directly`}
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
          {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
      )}
    </div>
  );
}

export default Faucet;