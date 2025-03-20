import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FAUCET_ABI, NETWORKS, WITHDRAWAL_MESSAGES } from '../constants/contracts';

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

  useEffect(() => {
    if (account) {
      updateInfo();
    }
  }, [account, contract]);

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
      
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
        nonce: nonce
      };

      // Get the signature
      const signature = await signer.signTypedData(domain, types, message);
      
      // Split signature into v, r, s
      const sig = ethers.Signature.from(signature);
      
      // Call withdraw with signature components and message
      const tx = await contractWithSigner.withdraw(sig.v, sig.r, sig.s, expectedMessage);
      await tx.wait();
      
      await updateInfo();
    } catch (err) {
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
            <p className="account-info">Connected Account: {account}</p>
            <p className="balance-info">Faucet Balance: {balance} {networkConfig.nativeCurrency.symbol}</p>
            <p className="cooldown-info">Time until next withdrawal: {cooldown} seconds</p>
            <p className="withdrawal-count">
              Withdrawals completed: <span className="count">{withdrawalCount}</span> / 3
            </p>
          </div>

          {withdrawalCount < 3 && (
            <div className="messages-container">
              <h3>Sign Message to get {networkConfig.nativeCurrency.symbol}</h3>
              <p className="signature-info">A unique signature is required for each withdrawal</p>
              
              <div className="current-message">
                <div className="message-content">
                  <p>{WITHDRAWAL_MESSAGES[withdrawalCount]}</p>
                  <div className="message-highlight">
                    <span>✍️ Sign this message to receive tokens</span>
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
                `Sign & Request ${networkConfig.nativeCurrency.symbol} Tokens`}
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