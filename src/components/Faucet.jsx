import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { FAUCET_ABI, DEV_FAUCET_ABI, NETWORKS, WITHDRAWAL_MESSAGES, DEV_FAUCET_MESSAGES } from '../constants/contracts';
import animecoinIcon from '../assets/animecoin.png';
import animeBackground from '../assets/anime.webp';

// Define constants to match contract
const COOLDOWN_PERIOD = 450; // 7.5 minutes in seconds (match contract)

function Faucet({ contractAddress, network = 'animechain', onConnectionUpdate }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [userBalance, setUserBalance] = useState('0');
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
  const [timerInitialized, setTimerInitialized] = useState(false);
  const [lastTxHash, setLastTxHash] = useState('');

  const networkConfig = NETWORKS[network] || NETWORKS.animechain;
  const isDevFaucet = network === 'sepolia'; // Use devFaucet on Sepolia
  const contractABI = isDevFaucet ? DEV_FAUCET_ABI : FAUCET_ABI;
  const explorerUrl = `${networkConfig.blockExplorerUrls[0]}address/${account}`;

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
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
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

  const updateUserBalance = async () => {
    if (!provider || !account) return;
    try {
      const balance = await provider.getBalance(account);
      setUserBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error('Error fetching user balance:', err);
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
      
      // Update user balance
      if (accountToUse && provider) {
        updateUserBalance();
      }
      
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

  // Update user information when account changes
  useEffect(() => {
    if (account && contract) {
      console.log("Account changed, fetching user data...");
      updateInfo(account, contract);
    }
  }, [account]);

  // Separate effect for blockchain data fetching
  useEffect(() => {
    const timer = setInterval(() => {
      if (contract) {
        // Don't update cooldown here to avoid flashing
        updateBalanceAndUserInfo();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [contract, account]);

  // New method to update balance and user info without modifying cooldown
  const updateBalanceAndUserInfo = async () => {
    if (!contract) return;
    
    try {
      //console.log("Updating faucet balance and user info...");
      const balance = await contract.get_balance();
      setBalance(ethers.formatEther(balance));
      
      if (account) {
       // console.log("Fetching data for account:", account);
        const nonce = await contract.get_nonce(account);
        setNonce(nonce.toString());
        
        const count = await contract.get_withdrawal_count(account);
        setWithdrawalCount(Number(count));
        
        try {
          const message = await contract.get_expected_message(account);
          setExpectedMessage(message);
        } catch (msgErr) {
          console.error("Error getting expected message:", msgErr);
          const fallbackMessage = WITHDRAWAL_MESSAGES[withdrawalCount] || "";
          setExpectedMessage(fallbackMessage);
        }
      }
    } catch (err) {
      console.error('Error updating balance and user info:', err);
    }
  };

  // Initialize cooldown timer once
  useEffect(() => {
    const initializeCooldown = async () => {
      if (!contract || timerInitialized) return;
      
      try {
        // Get the last withdrawal timestamp
        const lastWithdrawalTime = await contract.last_global_withdrawal();
        setLastWithdrawal(lastWithdrawalTime.toString());
        
        // Calculate initial cooldown
        const calculatedCooldown = calculateCooldown();
        setCooldown(calculatedCooldown);
        
        // Get the last recipient
        try {
          const recipient = await contract.last_recipient();
          setLastRecipient(recipient);
        } catch (recipientErr) {
          console.error("Error getting last recipient:", recipientErr);
        }
        
        setTimerInitialized(true);
      } catch (err) {
        console.error("Error initializing cooldown:", err);
      }
    };
    
    initializeCooldown();
  }, [contract, timerInitialized]);

  // Update cooldown every second locally without fetching from blockchain
  useEffect(() => {
    if (!timerInitialized) return;
    
    const updateCooldownTimer = () => {
      setCooldown(prevCooldown => {
        const currentCooldown = Number(prevCooldown);
        if (currentCooldown <= 0) return '0';
        return (currentCooldown - 1).toString();
      });
    };
    
    const timer = setInterval(updateCooldownTimer, 1000);
    return () => clearInterval(timer);
  }, [timerInitialized]);

  // After successful withdrawal, reset the cooldown timer
  const resetCooldownAfterWithdrawal = async () => {
    try {
      const lastWithdrawalTime = await contract.last_global_withdrawal();
      setLastWithdrawal(lastWithdrawalTime.toString());
      setCooldown(COOLDOWN_PERIOD.toString());
      
      try {
        const recipient = await contract.last_recipient();
        setLastRecipient(recipient);
      } catch (recipientErr) {
        console.error("Error getting last recipient:", recipientErr);
      }
    } catch (err) {
      console.error("Error resetting cooldown:", err);
    }
  };

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
      
      if (isDevFaucet) {
        // TODO: Implement proof-of-work mining for devFaucet
        throw new Error('DevFaucet proof-of-work mining not yet implemented. Please mine offline and use direct contract interaction.');
      }

      // For first withdrawal (withdrawalCount == 0), use server API (original faucet only)
      if (withdrawalCount === 0 && !isDevFaucet) {
        // Determine server URL based on current network
        const serverUrl = network === 'sepolia' ? 'http://localhost:5000' : 'https://faucet.animechain.dev';
        console.log(`Using server at ${serverUrl} for first withdrawal`);
        
        try {
          setServerLoading(true);
          const response = await fetch(`${serverUrl}/request-withdrawal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              network: network,
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
          setLastTxHash(result.tx_hash);
          setSuccessMessage(`Server processed your request! Transaction: ${result.tx_hash.substring(0, 10)}...`);
          
          // Reset cooldown after successful withdrawal
          await resetCooldownAfterWithdrawal();
          
          // Update user balance
          await updateUserBalance();
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
        setLastTxHash(tx.hash);
        await tx.wait();
        console.log("Transaction confirmed!");
        
        // Reset cooldown after successful withdrawal
        await resetCooldownAfterWithdrawal();
        
        // Update user balance
        await updateUserBalance();
      }
      
      await updateBalanceAndUserInfo();
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
        
        // Get the last recipient when refreshing cooldown (only for original faucet)
        if (!isDevFaucet) {
          try {
            const recipient = await contract.last_recipient();
            setLastRecipient(recipient);
          } catch (recipientErr) {
            console.error("Error getting last recipient:", recipientErr);
          }
        }
      }
    } catch (err) {
      console.error("Error updating cooldown:", err);
    } finally {
      setUpdatingCooldown(false);
    }
  };

  const isTestnet = network === 'sepolia' || network === 'animechain_testnet';
  
  return (
    <div className="faucet-container dark-theme">
      {isTestnet && <div className="dev-banner">Testnet Mode - Using {networkConfig.chainName}</div>}
      <div className="logo-container">
        <img src={animecoinIcon} alt="Animecoin Logo" className="animecoin-logo" />
      </div>
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
            <p className="user-balance">Your Balance: {userBalance} {networkConfig.nativeCurrency.symbol}</p>
            <p className="balance-info">Faucet Balance: {balance} {networkConfig.nativeCurrency.symbol}</p>
            
            {/* Always show the cooldown container regardless of cooldown value */}
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
            
            {/* Only show progress bar if cooldown > 0 */}
            {Number(cooldown) > 0 && (
              <>
                <div className="cooldown-progress-container">
                  <div className="cooldown-progress-bar" style={{ width: `${cooldownPercentage()}%` }}></div>
                </div>
                <p className="cooldown-warning">The faucet has a global cooldown - all users must wait until the timer completes.</p>
              </>
            )}
            
            {lastRecipient && (
              <p className="last-recipient">
                Last recipient: <span className="address">{lastRecipient.substring(0, 6)}...{lastRecipient.substring(lastRecipient.length - 4)}</span>
              </p>
            )}
            
            <p className="withdrawal-count">
              Withdrawals completed: <span className="count">{withdrawalCount}</span> / {isDevFaucet ? 8 : 3}
            </p>
            
            <div className="explorer-link-container">
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-button">
                View on {networkConfig.chainName} Explorer
              </a>
            </div>
          </div>
          {(isDevFaucet ? withdrawalCount < 8 : withdrawalCount < 3) && (
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
                  <div className="message-highlight"><p><b>{getDisplayMessage(withdrawalCount)}</b></p></div>
                  {expectedMessage && expectedMessage !== WITHDRAWAL_MESSAGES[withdrawalCount] && (
                    <div className="expected-message">
                      <p><strong>Contract expects:</strong> {expectedMessage.replace("  Also, Earth domain is best.", "")}</p>
                    </div>
                  )}
                  <div>
                    <p className="message-message">Sign the above message to receive 0.1 Anime Coin:</p>
                  </div>
                  {withdrawalCount === 0 && !isDevFaucet && (
                    <div className="server-info">
                      <p>📡 First withdrawal will use server API at {network === 'sepolia' ? 'localhost' : 'faucet.animechain.dev'} to pay for gas</p>
                    </div>
                  )}
                  {isDevFaucet && (
                    <div className="dev-faucet-info">
                      <p>⚡ DevFaucet: Proof-of-work mining required for withdrawal</p>
                      <p>💎 Progressive amounts: 5, 5, 10, 15, 25, 50, 75, 100 tokens</p>
                      <p>🔄 Daily reset: Up to 8 withdrawals per 24-hour period</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="actions-container">
            <button
              onClick={handleWithdraw}
              disabled={loading || serverLoading || Number(cooldown) > 0 || (isDevFaucet ? withdrawalCount >= 8 : withdrawalCount >= 3)}
              className="action-button"
            >
              {loading ? 'Processing...' :
                serverLoading ? 'Sending to Server...' :
                isDevFaucet && withdrawalCount >= 8 ? 'Daily limit reached (8/8)' :
                !isDevFaucet && withdrawalCount >= 3 ? 'Maximum withdrawals reached (3/3)' :
                Number(cooldown) > 0 ? `Faucet available in ${formatCooldown()}` :
                isDevFaucet ? 'Mine Proof-of-Work & Request Tokens' :
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

      <style jsx>{`
        .faucet-container {
          background-color: #121212;
          color: #ffffff;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        
        .dev-banner {
          background-color: #ff9800;
          color: #000;
          padding: 10px;
          text-align: center;
          font-weight: bold;
          border-radius: 8px 8px 0 0;
          margin: -20px -20px 20px -20px;
        }
        
        .faucet-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: transparent;
          border-radius: 10px;
          z-index: -1;
        }
        
        .logo-container {
          text-align: center;
          margin-bottom: 25px;
        }
        
        .animecoin-logo {
          width: 100px;
          height: auto;
        }
        
        .connect-button {
          background-color: #6c5ce7;
          color: white;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          width: 100%;
          font-weight: bold;
          transition: background-color 0.3s;
        }
        
        .connect-button:hover {
          background-color: #5549c0;
        }
        
        .connect-button:disabled {
          background-color: #45397a;
          cursor: not-allowed;
        }
        
        .info-container {
          background-color: #1e1e1e;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #333;
        }
        
        .network-info {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 10px;
        }
        
        .network-badge {
          background-color: #6c5ce7;
          padding: 5px 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: bold;
        }
        
        .account-info, .balance-info, .cooldown-info, .last-recipient, .withdrawal-count, .user-balance {
          margin: 8px 0;
          font-size: 14px;
        }
        
        .user-balance {
          color: #4cd137;
          font-weight: bold;
        }
        
        .address, .count {
          color: #6c5ce7;
          font-weight: bold;
        }
        
        .explorer-link-container {
          margin-top: 15px;
        }
        
        .explorer-button {
          display: inline-block;
          padding: 6px 12px;
          background-color: #2d2d2d;
          color: #6c5ce7;
          text-decoration: none;
          border-radius: 4px;
          font-size: 14px;
          transition: all 0.3s;
        }
        
        .explorer-button:hover {
          background-color: #3d3d3d;
          text-decoration: underline;
        }
        
        .cooldown-info-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .refresh-cooldown-button {
          background-color: transparent;
          color: #6c5ce7;
          border: 1px solid #6c5ce7;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .refresh-cooldown-button:hover {
          background-color: #6c5ce7;
          color: white;
        }
        
        .refresh-cooldown-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .cooldown-progress-container {
          width: 100%;
          height: 8px;
          background-color: #333;
          border-radius: 4px;
          overflow: hidden;
          margin: 10px 0;
        }
        
        .cooldown-progress-bar {
          height: 100%;
          background-color: #6c5ce7;
          border-radius: 4px;
          transition: width 1s linear;
        }
        
        .cooldown-warning {
          font-size: 12px;
          color: #ff9800;
          margin-top: 5px;
        }
        
        .messages-container {
          background-color: #1e1e1e;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #333;
        }
        
        .messages-container h3 {
          margin-top: 0;
          color: #6c5ce7;
          font-size: 18px;
        }
        
        .signature-info {
          font-size: 14px;
          color: #aaa;
          margin-bottom: 15px;
        }
        
        .message-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 0;
        }
        
        .progress-step {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        }
        
        .progress-step.current {
          background-color: #6c5ce7;
        }
        
        .progress-step.completed {
          background-color: #4cd137;
        }
        
        .progress-line {
          height: 3px;
          width: 60px;
          background-color: #333;
        }
        
        .first-withdrawal-info {
          background-color: #2d2d2d;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 0;
          border-left: 3px solid #6c5ce7;
        }
        
        .first-withdrawal-info p {
          margin: 5px 0;
          font-size: 13px;
          color: #ddd;
        }
        
        .current-message {
          background-color: #2d2d2d;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        
        .message-content p {
          font-size: 15px;
          line-height: 1.5;
        }
        
        .expected-message {
          background-color: #3d3d3d;
          padding: 10px;
          border-radius: 6px;
          margin-top: 10px;
        }
        
        .expected-message p {
          margin: 0;
          font-size: 14px;
        }
        
        .message-highlight {
          padding: 10px;
          border-radius: 6px;
          margin-top: 15px;
          text-align: center;
        }
        
        .message-message {
          text-align: center;
          margin: 0px auto;
        }
          
        .message-highlight span {
          font-weight: bold;
        }
        
        .server-info {
          margin-top: 10px;
          font-size: 13px;
          color: #aaa;
        }
        
        .dev-faucet-info {
          background-color: #2d2d2d;
          padding: 10px;
          border-radius: 6px;
          margin-top: 10px;
          border-left: 3px solid #ff9800;
        }
        
        .dev-faucet-info p {
          margin: 5px 0;
          font-size: 13px;
          color: #ddd;
        }
        
        .actions-container {
          margin-bottom: 15px;
        }
        
        .action-button {
          background-color: #6c5ce7;
          color: white;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          width: 100%;
          font-weight: bold;
          transition: background-color 0.3s;
        }
        
        .action-button:hover {
          background-color: #5549c0;
        }
        
        .action-button:disabled {
          background-color: #45397a;
          cursor: not-allowed;
        }
        
        .refill-toggle-button {
          background-color: transparent;
          color: #6c5ce7;
          border: none;
          cursor: pointer;
          margin-top: 10px;
          width: 100%;
          text-align: center;
        }
        
        .refill-container {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .refill-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #333;
          border-radius: 6px;
          background-color: #2d2d2d;
          color: white;
        }
        
        .refill-button {
          background-color: #6c5ce7;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
        }
        
        .error {
          color: #ff5252;
          margin-top: 15px;
          padding: 10px;
          background-color: rgba(255, 82, 82, 0.1);
          border-radius: 6px;
          border-left: 3px solid #ff5252;
        }
        
        .success-message {
          color: #4cd137;
          margin-top: 15px;
          padding: 10px;
          background-color: rgba(76, 209, 55, 0.1);
          border-radius: 6px;
          border-left: 3px solid #4cd137;
        }
      `}</style>
    </div>
  );
}

export default Faucet;