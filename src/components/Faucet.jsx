import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const FAUCET_ABI = [
  "function withdraw() external",
  "function get_balance() view returns (uint256)",
  "function time_until_next_withdrawal(address) view returns (uint256)",
  "function deposit() external payable"
];

const ANIME_CHAIN = {
  chainId: '0x10D78', // 69000 in hex
  chainName: 'AnimeChain',
  nativeCurrency: {
    name: 'AnimeCoin',
    symbol: 'ANIME',
    decimals: 18
  },
  rpcUrls: ['https://rpc-animechain-39xf6m45e3.t.conduit.xyz/'],
  blockExplorerUrls: ['https://explorer-animechain-39xf6m45e3.t.conduit.xyz/'],
  iconUrls: ['https://animechain.dev/animecoin.png']
};

function Faucet({ contractAddress }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [cooldown, setCooldown] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      }
    };
    init();
  }, [contractAddress]);

  const addAnimeChainToMetaMask = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      setLoading(true);
      setError('');

      // Request to add the chain to MetaMask
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [ANIME_CHAIN],
      });

      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateInfo = async () => {
    if (!contract || !account) return;
    
    try {
      const balance = await contract.get_balance();
      setBalance(ethers.formatEther(balance));
      
      const cooldown = await contract.time_until_next_withdrawal(account);
      setCooldown(cooldown.toString());
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
      
      const tx = await contractWithSigner.withdraw();
      await tx.wait();
      
      await updateInfo();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="faucet-container">
      <button 
        onClick={addAnimeChainToMetaMask}
        className="add-chain-button"
        disabled={loading}
      >
        Add AnimeChain to MetaMask
      </button>

      {!account ? (
        <button onClick={connectWallet} disabled={loading}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected Account: {account}</p>
          <p>Faucet Balance: {balance} ANIME</p>
          <p>Time until next withdrawal: {cooldown} seconds</p>
          <button 
            onClick={handleWithdraw} 
            disabled={loading || Number(cooldown) > 0}
          >
            {loading ? 'Processing...' : 'Request Tokens'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default Faucet; 