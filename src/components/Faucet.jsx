import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FAUCET_ABI, NETWORKS, WITHDRAWAL_MESSAGES } from '../constants/contracts';

// Define constants to match contract
const COOLDOWN_PERIOD = 450; // 7.5 minutes in seconds (match contract)

function Faucet({ contractAddress, network = 'animechain' }) {
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

  const networkConfig = NETWORKS[network] || NETWORKS.animechain;

  const formatCooldown = () => {
    const cooldownSeconds = Number(cooldown);
    if (cooldownSeconds <= 0) return 'Available now';
    if (cooldownSeconds < 60) return `${cooldownSeconds} second${cooldownSeconds !== 1 ? 's' : ''}`;
    const minutes = Math.floor(cooldownSeconds / 60);
    const seconds = cooldownSeconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInfo = async () => {
    if (!contract) return;
    try {
      const balance = await contract.get_balance();
      setBalance(ethers.formatEther(balance));
      const cooldown = await contract.time_until_next_withdrawal();
      setCooldown(cooldown.toString());
      if (account) {
        const nonce = await contract.get_nonce(account);
        setNonce(nonce.toString());
        const count = await contract.get_withdrawal_count(account);
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
      console.log("Calling withdraw with signature and message...");
      const tx = await contractWithSigner.withdraw(sig.v, sig.r, sig.s, messageToSign);
      console.log("Transaction submitted:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed!");
      await updateInfo();
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
      await updateInfo();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isTestnet = network === 'sepolia' || network === 'animechain_testnet';
  
  return (
    <div className="faucet-container">
      {isTestnet && <div className="dev-banner">Testnet Mode - Using {networkConfig.chainName}</div>}
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
            <p className="cooldown-info">Global cooldown: {formatCooldown()}</p>
            {Number(cooldown) > 0 && (
              <>
                <div className="cooldown-progress-container">
                  <div className="cooldown-progress-bar" style={{ width: `${cooldownPercentage()}%` }}></div>
                </div>
                <p className="cooldown-warning">The faucet has a global cooldown - all users must wait until the timer completes.</p>
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
              onClick={handleWithdraw}
              disabled={loading || Number(cooldown) > 0 || withdrawalCount >= 3}
              className="action-button"
            >
              {loading ? 'Processing...' :
                withdrawalCount >= 3 ? 'Maximum withdrawals reached' :
                Number(cooldown) > 0 ? `Faucet available in ${formatCooldown()}` :
                `Sign & Request 0.1 ${networkConfig.nativeCurrency.symbol} Tokens`}
            </button>
            <button onClick={() => setShowRefill(!showRefill)} className="refill-toggle-button">
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