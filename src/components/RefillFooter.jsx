import { useState } from 'react';
import { ethers } from 'ethers';
import { DEV_FAUCET_ABI, NETWORKS } from '../constants/contracts';

function RefillFooter({ contractAddress, network }) {
  const [showRefill, setShowRefill] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRefill = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      // Ensure correct network selected
      const networkConfig = NETWORKS[network];
      if (networkConfig) {
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
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const isDev = network === 'animechain_testnet';
      const abi = DEV_FAUCET_ABI;
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const valueWei = ethers.parseEther(String(amount));
      const tx = await contract.deposit({ value: valueWei });
      await tx.wait();
      setSuccess(`Refill sent: ${tx.hash.substring(0, 10)}...`);
      setAmount('');
    } catch (err) {
      setError(err.message || 'Refill failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="refill-footer">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button 
          onClick={() => setShowRefill(!showRefill)} 
          className="footer-refill-button"
        >
          🔄 Refill Faucet
        </button>
        <button 
          onClick={() => setShowDetails(!showDetails)} 
          className="footer-refill-button"
        >
          {showDetails ? 'Hide Faucet Details' : 'Faucet Details'}
        </button>
      </div>
      {showRefill && (
        <div className="refill-container transparent" style={{ marginTop: 8 }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount in ${NETWORKS[network]?.nativeCurrency?.symbol || 'ANIME'}`}
            className="refill-input"
            min="0"
            step="0.1"
          />
          <button onClick={handleRefill} disabled={loading || !amount} className="refill-button ghost">
            {loading ? 'Processing...' : 'Send refill'}
          </button>
        </div>
      )}
      {showDetails && (
        <div className="refill-container transparent" style={{ marginTop: 8 }}>
          <div className="dev-faucet-info">
            <p>⚡ DevFaucet: Proof-of-work mining required for withdrawal</p>
            <p>💎 Progressive amounts: 5, 5, 10, 15, 25, 50, 75, 100 tokens</p>
            <p>🔄 Daily reset: Up to 8 withdrawals per 24-hour period</p>
            <p>⛏️ Difficulty: ~8k+ hashes (est. 30s avg)</p>
          </div>
        </div>
      )}
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
      {success && <p className="success-message" style={{ marginTop: 8 }}>{success}</p>}
    </div>
  );
}

export default RefillFooter;


