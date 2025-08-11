import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { DEV_FAUCET_ABI, NETWORKS, DEV_FAUCET_MESSAGES } from '../constants/contracts';
import animecoinIcon from '../assets/animecoin.png';
import animeBackground from '../assets/anime.webp';
import AdminPanel from './AdminPanel';
import './styles/Faucet.css';
// EIP-712 Debug Panel removed

// Define constants to match contract
const COOLDOWN_PERIOD = 450; // 7.5 minutes in seconds (match contract)
// Approximate reserve used by DevFaucet to cover gas (must match contract constant)
// If this ever changes on-chain, update this value accordingly
const DEV_GAS_RESERVE_WEI = (() => {
  try { return ethers.parseEther('0.01'); } catch { return 10_000_000_000_000_000n; }
})();

function Faucet({ contractAddress, network = 'animechain', onConnectionUpdate }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [userBalance, setUserBalance] = useState('0');
  const [cooldown, setCooldown] = useState('0');
  const [cooldownPeriodSeconds, setCooldownPeriodSeconds] = useState(COOLDOWN_PERIOD);
  const [lastWithdrawal, setLastWithdrawal] = useState('0');
  // DevFaucet balance sufficiency for PoW mining
  const [hasSufficientFunds, setHasSufficientFunds] = useState(true);
  const [expectedWithdrawalAmount, setExpectedWithdrawalAmount] = useState('0');
  const [expectedWithdrawalAmountWei, setExpectedWithdrawalAmountWei] = useState(0n);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [showFaucetDetails, setShowFaucetDetails] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
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
  const [uiCooldownUntil, setUiCooldownUntil] = useState(0);
  const [uiCooldownTick, setUiCooldownTick] = useState(0); // Force re-renders for UI cooldown
  
  // Admin state variables
  const [isAdmin, setIsAdmin] = useState(false);
  const [contractOwner, setContractOwner] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  
  // PoW mining state variables
  const [powMining, setPowMining] = useState(false);
  const [powComplete, setPowComplete] = useState(false);
  const [powData, setPowData] = useState(null);
  const [powProgress, setPowProgress] = useState(0);
  const [powStartTime, setPowStartTime] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  
  // Server endpoint preference for localhost users
  const [useLocalServer, setUseLocalServer] = useState(true);
  
  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Detect localhost for showing server features
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const networkConfig = NETWORKS[network] || NETWORKS.animechain;
  // Dev faucet is now the only faucet implementation (mainnet and testnet)
  const isDevFaucet = network === 'animechain' || network === 'animechain_testnet';
  
  // Select contract ABI - always DevFaucet
  const contractABI = DEV_FAUCET_ABI;
  const explorerUrl = `${networkConfig.blockExplorerUrls[0]}address/${account}`;
  
  // Dev faucet supports 8 progressive withdrawals
  const maxWithdrawals = 8;
  
  // Server network mapping for localhost server
  const getServerNetwork = (uiNetwork) => {
    if (uiNetwork === 'animechain') return 'animechain'; // mainnet
    if (uiNetwork === 'animechain_testnet') return 'testnet'; // testnet with dev faucet
    return uiNetwork;
  };

  const formatCooldown = () => {
    const cooldownSeconds = Number(cooldown);
    if (cooldownSeconds <= 0) return 'Available now';
    if (cooldownSeconds < 60) return `${cooldownSeconds} second${cooldownSeconds !== 1 ? 's' : ''}`;
    const minutes = Math.floor(cooldownSeconds / 60);
    const seconds = cooldownSeconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  // UI-only 60s cooldown after each withdrawal
  const uiCooldownRemaining = () => {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, uiCooldownUntil - now);
  };
  const formatUiCooldown = () => {
    const s = uiCooldownRemaining();
    if (s <= 0) return '';
    return `${s} second${s !== 1 ? 's' : ''}`;
  };
  useEffect(() => {
    if (!uiCooldownUntil) return;
    const t = setInterval(() => {
      const remain = uiCooldownRemaining();
      if (remain === 0) {
        clearInterval(t);
      }
      // Force component re-render to update button text
      setUiCooldownTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [uiCooldownUntil]);

  const calculateCooldown = () => {
    // If no prior withdrawal, cooldown is 0
    if (lastWithdrawal === '0') return '0';
    
    const lastWithdrawalTime = Number(lastWithdrawal);
    const nextAvailableTime = lastWithdrawalTime + (cooldownPeriodSeconds || COOLDOWN_PERIOD);
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    
    if (currentTime >= nextAvailableTime) return '0';
    return (nextAvailableTime - currentTime).toString();
  };

  const cooldownPercentage = () => {
    const cooldownSeconds = Number(cooldown);
    if (cooldownSeconds <= 0) return 100;
    return 100 - (cooldownSeconds / (cooldownPeriodSeconds || COOLDOWN_PERIOD)) * 100;
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
    init().finally(() => setIsInitializing(false));
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

  const checkAdminStatus = async (currentAccount = null, currentContract = null) => {
    const contractToUse = currentContract || contract;
    const accountToUse = currentAccount || account;
    
    if (!contractToUse || !accountToUse) return;
    
    try {
      const owner = await contractToUse.owner();
      setContractOwner(owner);
      const isOwner = owner.toLowerCase() === accountToUse.toLowerCase();
      setIsAdmin(isOwner);
      console.log('Admin check:', { owner, account: accountToUse, isAdmin: isOwner });
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  };

  const updateInfo = async (currentAccount = null, currentContract = null) => {
    // Use parameters if provided, otherwise fall back to state values
    const contractToUse = currentContract || contract;
    const accountToUse = currentAccount || account;
    
    if (!contractToUse) return;
    try {
      console.log("Updating faucet information...");
      // DevFaucet: Use provider to get contract's native balance
      const balWei = await provider.getBalance(contractAddress);
      setBalance(ethers.formatEther(balWei));
      
      // Update user balance
      if (accountToUse && provider) {
        updateUserBalance();
      }
      
      // Always refresh cooldown sources but avoid flashing the countdown value
      try {
        const lastWithdrawalTime = await contractToUse.last_global_withdrawal();
        setLastWithdrawal(lastWithdrawalTime.toString());
      } catch (e) {
        console.warn('Could not read last_global_withdrawal:', e);
      }
      
      // Fetch on-chain cooldown period so UI matches contract config
      try {
        const onChainCooldown = await contractToUse.cooldown_period();
        setCooldownPeriodSeconds(Number(onChainCooldown));
      } catch (e) {
        // ignore if method unavailable
      }
      
      // Recompute cooldown locally from latest values
      const calculatedCooldown = calculateCooldown();
      setCooldown(calculatedCooldown);
      
      // DevFaucet doesn't have last_recipient
      setLastRecipient("");
      
      if (accountToUse) {
        console.log("Fetching data for account:", accountToUse);
        const nonce = await contractToUse.nonce(accountToUse);
        setNonce(nonce.toString());
        console.log("Account nonce:", nonce.toString());
        const count = await contractToUse.withdrawal_count(accountToUse);
        // Compute effective count based on 24h reset window
        let effectiveCount = Number(count);
        try {
          const firstTime = await contractToUse.first_request_time(accountToUse);
          let chainTs = 0n;
          try {
            const latestBlock = await provider.getBlock('latest');
            chainTs = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
          } catch {
            chainTs = BigInt(Math.floor(Date.now() / 1000));
          }
          if (firstTime && chainTs >= BigInt(firstTime) + 86400n) {
            effectiveCount = 0;
          }
        } catch {}
        console.log("Account withdrawal count (effective):", effectiveCount);
        setWithdrawalCount(effectiveCount);
        try {
          const withdrawalIndex = effectiveCount + 1;
          const message = await contractToUse.get_expected_message(withdrawalIndex);
          console.log("Expected message from contract (DevFaucet):", message);
          setExpectedMessage(message);
        } catch (msgErr) {
          console.error("Error getting expected message (DevFaucet):", msgErr);
          const fallbackMessage = DEV_FAUCET_MESSAGES[effectiveCount] || "";
          setExpectedMessage(fallbackMessage);
        }
        // Check admin status
        await checkAdminStatus(accountToUse, contractToUse);
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
      setIsInitializing(true);
      updateInfo(account, contract).finally(() => setIsInitializing(false));
    }
  }, [account]);

  // Debounced/interval refresh: reduce to 20s and avoid heavy re-renders
  useEffect(() => {
    if (!contract) return;
    const timer = setInterval(() => {
      updateBalanceAndUserInfo();
    }, 20000);
    return () => clearInterval(timer);
  }, [contract]);

  // Immediate fetch once contract is ready
  useEffect(() => {
    if (!contract) return;
    updateBalanceAndUserInfo();
  }, [contract]);

  // Listen to on-chain Deposit/Withdrawal events to refresh balance promptly
  useEffect(() => {
    if (!contract) return;
    const handleEvent = () => {
      // Refresh balance and user info when faucet state changes
      updateBalanceAndUserInfo();
    };
    try {
      contract.on('Deposit', handleEvent);
      contract.on('Withdrawal', handleEvent);
    } catch {}
    return () => {
      try {
        contract.off('Deposit', handleEvent);
        contract.off('Withdrawal', handleEvent);
      } catch {}
    };
  }, [contract]);

  // New method to update balance and user info without modifying cooldown
  const updateBalanceAndUserInfo = async () => {
    if (!contract) return;
    
    try {
      let balanceWei;
      // DevFaucet: Use provider to get contract's native balance
      balanceWei = await provider.getBalance(contractAddress);
      const balance = balanceWei;
      setBalance(ethers.formatEther(balance));
      
      if (account) {
       // console.log("Fetching data for account:", account);
        // DevFaucet path only
        const nonce = await contract.nonce(account);
        setNonce(nonce.toString());
        
        const count = await contract.withdrawal_count(account);
        // Compute effective count based on 24h reset window
        let effectiveCount = Number(count);
        try {
          const firstTime = await contract.first_request_time(account);
          let chainTs = 0n;
          try {
            const latestBlock = await provider.getBlock('latest');
            chainTs = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
          } catch {
            chainTs = BigInt(Math.floor(Date.now() / 1000));
          }
          if (firstTime && chainTs >= BigInt(firstTime) + 86400n) {
            effectiveCount = 0;
          }
        } catch {}
        setWithdrawalCount(effectiveCount);
        
        // Check faucet has enough funds for the upcoming withdrawal before allowing mining
        try {
          const withdrawalIndex = effectiveCount + 1; // 1-based index
          const amountWei = await contract.get_withdrawal_amount(withdrawalIndex);
          setExpectedWithdrawalAmountWei(amountWei);
          setExpectedWithdrawalAmount(ethers.formatEther(amountWei));
          
          const requiredWei = amountWei + DEV_GAS_RESERVE_WEI;
          setHasSufficientFunds(balanceWei >= requiredWei);
        } catch (amountErr) {
          console.warn('Could not fetch expected withdrawal amount:', amountErr);
          // Fallback: if we cannot determine, do not block mining
          setHasSufficientFunds(true);
        }
        
        try {
          // DevFaucet uses withdrawal_index (1-based)
          const withdrawalIndex = Number(count) + 1; // Convert 0-based count to 1-based index
          const message = await contract.get_expected_message(withdrawalIndex);
          setExpectedMessage(message);
        } catch (msgErr) {
          console.error("Error getting expected message:", msgErr);
          const fallbackMessage = DEV_FAUCET_MESSAGES[Number(count)] || "";
          setExpectedMessage(fallbackMessage);
        }
      }
    } catch (err) {
      console.error('Error updating balance and user info:', err);
    }
  };

  // Manual refresh for faucet balance and user info (useful when faucet is empty)
  const refreshFaucetBalance = async () => {
    try {
      setRefreshingBalance(true);
      await updateBalanceAndUserInfo();
    } finally {
      setRefreshingBalance(false);
    }
  };

  // Initialize cooldown timer once
  useEffect(() => {
    const initializeCooldown = async () => {
      if (!contract || timerInitialized) return;
      
      try {
        // Don't show phase UI until initialized
        setIsInitializing(true);
        // Get the last withdrawal timestamp
        const lastWithdrawalTime = await contract.last_global_withdrawal();
        setLastWithdrawal(lastWithdrawalTime.toString());
        
        // Calculate initial cooldown
        const calculatedCooldown = calculateCooldown();
        setCooldown(calculatedCooldown);
        
        // DevFaucet doesn't have last_recipient, set to empty
        setLastRecipient("");
        
        setTimerInitialized(true);
      } catch (err) {
        console.error("Error initializing cooldown:", err);
      }
    };
    
    initializeCooldown().finally(() => setIsInitializing(false));
  }, [contract, timerInitialized]);

  // Update cooldown every second locally (only if needed)
  useEffect(() => {
    if (!timerInitialized) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        const c = Number(prev);
        return c <= 0 ? '0' : String(c - 1);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerInitialized]);

  // After successful withdrawal, reset the cooldown timer
  const resetCooldownAfterWithdrawal = async () => {
    try {
      const lastWithdrawalTime = await contract.last_global_withdrawal();
      setLastWithdrawal(lastWithdrawalTime.toString());
      // Use on-chain cooldown period when available
      let period = COOLDOWN_PERIOD;
      try {
        const onChainCooldown = await contract.cooldown_period();
        period = Number(onChainCooldown);
        setCooldownPeriodSeconds(period);
      } catch (e) {
        // ignore if method unavailable
      }
      setCooldown(String(period));
      
      // DevFaucet doesn't have last_recipient, set to empty
      setLastRecipient("");
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
    return DEV_FAUCET_MESSAGES[index] || "";
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage(''); // Clear any previous success messages
      console.log("Starting withdrawal process...");
      
      // Verify faucet has enough funds right before signing/submitting (DevFaucet only)
      try {
        const faucetBalWei = await provider.getBalance(contractAddress);
        // Determine required amount for next withdrawal
        const nextIndex = withdrawalCount + 1;
        let amountWei = 0n;
        try {
          amountWei = await contract.get_withdrawal_amount(nextIndex);
        } catch {
          amountWei = expectedWithdrawalAmountWei || 0n;
        }
        const requiredWei = amountWei + DEV_GAS_RESERVE_WEI;
        if (faucetBalWei < requiredWei) {
          throw new Error('Faucet has insufficient funds for this withdrawal. Please try again later.');
        }
      } catch (precheckErr) {
        setError(precheckErr.message || 'Faucet balance check failed');
        return;
      }
      
      // If user already has sufficient native balance, skip gasless/server path
      try {
        const userBalWei = await provider.getBalance(account);
        const thresholdWei = ethers.parseEther('0.001');
        if (userBalWei >= thresholdWei && isDevFaucet && withdrawalCount === 0) {
          console.log('User has sufficient native balance, skipping gasless server path');
        }
      } catch {}
      
      // CRITICAL: Fetch fresh anti-replay nonce before signing
      console.log("Fetching current anti-replay nonce before signing...");
      const currentNonce = await contract.nonce(account);
      console.log("🔍 NONCE DEBUG:");
      console.log("  Account:", account);
      console.log("  Contract address:", contractAddress);
      console.log("  Fresh anti-replay nonce from contract:", currentNonce.toString());
      console.log("  Component state nonce:", nonce);
      console.log("  Will sign with nonce:", currentNonce.toString());
      
      console.log("Expected message:", expectedMessage);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      // DevFaucet: Use SINGLE SIGNATURE flow
      let sig = null;
      let messageToSign = null;
      {
        // DevFaucet: For server withdrawals, still need user authorization via signature
        // The user signs to authorize the server to act on their behalf
        messageToSign = expectedMessage || DEV_FAUCET_MESSAGES[withdrawalCount];
        
        if (!messageToSign) {
          throw new Error('No message available for DevFaucet. Please refresh and try again.');
        }
        
        console.log("🚀 DevFaucet - Preparing authorization for:", messageToSign);
        
        // Decide early if we will use the server (to avoid double signature prompts)
        let useServerForSigning = withdrawalCount === 0;
        if (useServerForSigning) {
          try {
            const userBalWei = await provider.getBalance(account);
            const thresholdWei = ethers.parseEther('0.001');
            if (userBalWei >= thresholdWei) {
              useServerForSigning = false; // user will send tx directly, no server signature needed
            }
          } catch {}
        }

        // Only request EIP-712 signature if we truly plan to use the server path
        if (useServerForSigning) {
          // Create EIP-712 signature for server authorization
          const domain = {
            name: 'DevFaucet',
            version: '1',
            chainId: parseInt(networkConfig.chainId, 16),
            verifyingContract: contractAddress
          };
          
          const types = {
            WithdrawalRequest: [
              { name: 'recipient', type: 'address' },
              { name: 'chosenBlockHash', type: 'bytes32' },
              { name: 'withdrawalIndex', type: 'uint256' },
              { name: 'ipAddress', type: 'bytes32' },
              { name: 'nonce', type: 'uint256' },
              { name: 'message', type: 'string' }
            ]
          };
          
          const signerAddress = await signer.getAddress();
          console.log('🔑 Signer address for EIP-712 authorization:', signerAddress, '(state account:', account, ')');

          const value = {
            recipient: signerAddress,
            chosenBlockHash: powData.chosenBlockHash,
            withdrawalIndex: powData.withdrawalIndex,
            ipAddress: powData.ipAddressHash,
            nonce: Number(currentNonce), // DEPLOYED CONTRACT FIX: Use fresh anti-replay nonce
            message: messageToSign
          };
          
          console.log("🔐 EIP-712 SIGNATURE DEBUG:");
          console.log("  Domain:", JSON.stringify(domain, null, 2));
          console.log("  Message values:", JSON.stringify(value, null, 2));
          console.log("  ChainId in domain:", domain.chainId, "(should match network)");
          console.log("  Contract address in domain:", domain.verifyingContract);
          console.log(`  Signing with anti-replay nonce: ${currentNonce}`);
          console.log(`  PoW nonce ${powData.nonce} will be sent separately for mining validation`);
          
          console.log("🚨 CRITICAL DEBUG - RIGHT BEFORE SIGNING:");
          console.log("  currentNonce (should be 0):", currentNonce.toString());
          console.log("  powData.nonce (should be 9000):", powData.nonce);
          console.log("  value.nonce (what we're actually signing with):", value.nonce);
          console.log("  Type of currentNonce:", typeof currentNonce);
          console.log("  Type of powData.nonce:", typeof powData.nonce);
          console.log("  Type of value.nonce:", typeof value.nonce);
          
          console.log("Signing DevFaucet EIP-712 authorization:", { domain, types, value });
          
          const signature = await signer.signTypedData(domain, types, value);
          // Local verification before proceeding
          const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
          console.log('🧪 Recovered signer from typed data:', recoveredAddress);
          if (recoveredAddress.toLowerCase() !== value.recipient.toLowerCase()) {
            console.error('❌ Recovered signer does not match recipient in message. Aborting.');
            throw new Error('Signature not from selected wallet. Please switch to the correct account and try again.');
          }
          console.log("DevFaucet authorization signature obtained:", signature);
          sig = ethers.Signature.from(signature);
          
          // Ensure proper formatting for server compatibility
          console.log("DevFaucet signature components before formatting:", {
            v: sig.v,
            r: sig.r,
            s: sig.s,
            vType: typeof sig.v,
            rType: typeof sig.r,
            sType: typeof sig.s
          });
          
          // Format signature components to ensure server compatibility
          sig = {
            v: sig.v,
            r: sig.r.startsWith('0x') ? sig.r : `0x${sig.r}`,
            s: sig.s.startsWith('0x') ? sig.s : `0x${sig.s}`
          };
          
          console.log("DevFaucet signature components after formatting:", sig);
        }
      }
      
      // Check DevFaucet PoW requirements (for all withdrawals, including first via server)
      if (isDevFaucet && (!powComplete || !powData)) {
        throw new Error('Please complete proof-of-work mining before requesting tokens.');
      }

      // Decide server path: use server only for first withdrawal if user lacks gas
      let useServer = withdrawalCount === 0;
      if (withdrawalCount === 0) {
        try {
          const userBalWei = await provider.getBalance(account);
          const thresholdWei = ethers.parseEther('0.001');
          if (userBalWei >= thresholdWei) {
            useServer = false;
            console.log('Skipping gasless server path: user has sufficient native balance.');
          }
        } catch {}
      }
      if (useServer) {
        // Determine server URL based on user preference (localhost) or default (production)
        const serverUrl = isLocalhost 
          ? (useLocalServer ? 'http://localhost:5000' : 'https://faucet.animechain.dev')
          : 'https://faucet.animechain.dev';
        const serverNetworkPrimary = getServerNetwork(network);
        const serverNetworkFallback = (serverNetworkPrimary === 'testnet' && network === 'animechain_testnet') ? 'animechain_testnet' : null;
        console.log(`Using server at ${serverUrl} for first withdrawal on network ${serverNetworkPrimary}`);
        
        // Log the request data for debugging
        const requestDataBase = {
          user_address: (await provider.getSigner().then(s => s.getAddress())),
          chosen_block_hash: powData?.chosenBlockHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
          withdrawal_index: powData?.withdrawalIndex || 1,
          ip_address: powData?.ipAddressHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
          nonce: Number(currentNonce), // Send fresh anti-replay nonce
          pow_nonce: powData?.nonce || 0, // Send PoW nonce (used for mining validation)
          message: messageToSign,
          // Include signature for server authorization (required for first withdrawal)
          v: sig?.v || (() => { throw new Error('DevFaucet signature is required for server authorization'); })(),
          r: sig?.r || (() => { throw new Error('DevFaucet signature is required for server authorization'); })(),
          s: sig?.s || (() => { throw new Error('DevFaucet signature is required for server authorization'); })()
        };
        const buildRequestData = (net) => ({ network: net, ...requestDataBase });

        console.log("🚨 CRITICAL DEBUG - SERVER REQUEST DATA:");
        console.log("  requestData.nonce (anti-replay, should be 0):", requestDataBase.nonce);
        console.log("  requestData.pow_nonce (PoW mining, should be 9000):", requestDataBase.pow_nonce);
        console.log("  currentNonce variable:", currentNonce.toString());
        console.log("  powData.nonce variable:", powData?.nonce);
        
        console.log("Sending network name to server:", serverNetworkPrimary);
        
        try {
          setServerLoading(true);
          const tryOnce = async (net) => {
            const resp = await fetch(`${serverUrl}/request-withdrawal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(buildRequestData(net))
            });
            return resp;
          };

          let response = await tryOnce(serverNetworkPrimary);

          // If invalid network and we have a fallback alias, retry once
          if (!response.ok && serverNetworkFallback) {
            let errorDataTmp = {};
            try { errorDataTmp = await response.json(); } catch {}
            if (errorDataTmp.error && errorDataTmp.error.toLowerCase().includes('invalid network')) {
              console.warn(`Retrying with fallback network alias: ${serverNetworkFallback}`);
              response = await tryOnce(serverNetworkFallback);
            }
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));

            // Special handling for network not available error
            if (errorData.error && errorData.error.includes('Network') && errorData.error.includes('not available')) {
              console.error("Network not available error:", errorData);
              const attempted = serverNetworkFallback ? `${serverNetworkPrimary}, ${serverNetworkFallback}` : serverNetworkPrimary;
              console.log("Tried network name(s):", attempted);
              console.log("Available networks might be: animechain, testnet, animechain_testnet");
              throw new Error(`Network not available on server. Tried: ${attempted}. Check server logs for available networks.`);
            }

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
          
      // Reset cooldown after successful withdrawal (reflect global cooldown for both faucets)
      await resetCooldownAfterWithdrawal();
      // Force a fresh user info fetch to capture updated withdrawal_count for gasless path
      await updateBalanceAndUserInfo();
          
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
        
        // Reset PoW state after successful server withdrawal
        setPowComplete(false);
        setPowData(null);
        setPowProgress(0);
      } else {
        // For subsequent DevFaucet withdrawals, use direct contract interaction
        console.log("Using PoW data for devFaucet withdrawal:", powData);
        
        // Check if the current PoW block is still valid (after user's last withdrawal)
        // For rollup chains, we need to be more flexible with block validation
        let userLastBlock = 0;
        try {
          userLastBlock = await contract.last_successful_block(account);
          userLastBlock = Number(userLastBlock);
          
          console.log(`Validating PoW: User last block ${userLastBlock}`);
          
          // For rollup chains with delays, skip strict block validation in frontend
          // Let the contract handle the validation since it has the most up-to-date view
          if (userLastBlock > 0) {
            try {
              const currentBlock = await provider.getBlock(powData.chosenBlockHash);
              const currentBlockNum = currentBlock ? currentBlock.number : 'unknown';
              console.log(`PoW block number: ${currentBlockNum}, User last block: ${userLastBlock}`);
              
              // Only warn about potential issues, don't block the transaction
              const latestBlockNum = await provider.getBlockNumber();
              if (userLastBlock > latestBlockNum) {
                console.warn(`Rollup delay detected: User last block ${userLastBlock} > RPC latest ${latestBlockNum}`);
                console.warn('This is expected for rollup chains. Contract will validate the actual block.');
              }
            } catch (blockErr) {
              console.log('Could not get block details (synthetic hash or RPC issue):', blockErr.message);
            }
          }
        } catch (err) {
          console.log('Could not validate block (might be new user):', err.message);
        }
        
        // First try to estimate gas to catch any revert reasons
        // DevFaucet uses message parameter, not signature components
        const messageToSign = expectedMessage || DEV_FAUCET_MESSAGES[withdrawalCount];
        try {
          const liveCountNow = await contract.withdrawal_count(account);
          let nextIndex = Number(liveCountNow) + 1;
          try {
            const firstTime = await contract.first_request_time(account);
            let chainTs = 0n;
            try {
              const latestBlock = await provider.getBlock('latest');
              chainTs = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
            } catch {
              chainTs = BigInt(Math.floor(Date.now() / 1000));
            }
            if (firstTime && chainTs >= BigInt(firstTime) + 86400n) {
              nextIndex = 1; // reset window passed
            }
          } catch {}
          const gasEstimate = await contractWithSigner.withdraw.estimateGas(
            powData.chosenBlockHash,
            nextIndex,
            powData.ipAddressHash,
            powData.nonce,
            messageToSign
          );
          console.log("Gas estimate successful:", gasEstimate.toString());
        } catch (estimateError) {
          console.error("Gas estimation failed - transaction would revert:", estimateError);
          throw new Error(`Transaction would fail: ${estimateError.reason || estimateError.message}`);
        }
        
        // SINGLE SIGNATURE: Call devFaucet withdraw with message parameter (no EIP-712 components)
        console.log('🚀 Using SINGLE SIGNATURE DevFaucet withdrawal:', messageToSign);
        
        // Use effective next index (respects 24h reset)
        const liveCount = await contract.withdrawal_count(account);
        let nextIndex = Number(liveCount) + 1;
        try {
          const firstTime = await contract.first_request_time(account);
          let chainTs = 0n;
          try {
            const latestBlock = await provider.getBlock('latest');
            chainTs = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
          } catch {
            chainTs = BigInt(Math.floor(Date.now() / 1000));
          }
          if (firstTime && chainTs >= BigInt(firstTime) + 86400n) {
            nextIndex = 1; // reset window passed
          }
        } catch {}
        const tx = await contractWithSigner.withdraw(
          powData.chosenBlockHash,
          nextIndex,
          powData.ipAddressHash,
          powData.nonce,  // _pow_nonce: Use the PoW nonce for mining validation
          messageToSign  // Message instead of v,r,s signature components
        );
        
        console.log("DevFaucet transaction submitted:", tx.hash);
        setLastTxHash(tx.hash);
        const receipt = await tx.wait();
        console.log("DevFaucet transaction confirmed!", receipt?.hash || tx.hash);
        // Start UI-only cooldown window (60 seconds)
        setUiCooldownUntil(Math.floor(Date.now() / 1000) + 60);
        // Refresh critical state after confirmation to avoid stale next index
        await updateInfo(account, contract);
        await updateBalanceAndUserInfo();
        
        // Reset PoW state after successful withdrawal
        setPowComplete(false);
        setPowData(null);
        setPowProgress(0);
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
      
      // Check if user has enough balance
      const userBalanceWei = await provider.getBalance(account);
      console.log(`User balance: ${ethers.formatEther(userBalanceWei)} ${networkConfig.nativeCurrency.symbol}`);
      console.log(`Trying to deposit: ${refillAmount} ${networkConfig.nativeCurrency.symbol}`);
      
      if (userBalanceWei < amountInWei) {
        throw new Error(`Insufficient balance. You have ${ethers.formatEther(userBalanceWei)} ${networkConfig.nativeCurrency.symbol} but trying to deposit ${refillAmount} ${networkConfig.nativeCurrency.symbol}`);
      }
      
      // Estimate gas first to catch any contract-level issues
      try {
        const gasEstimate = await contractWithSigner.deposit.estimateGas({ value: amountInWei });
        console.log(`Gas estimate: ${gasEstimate.toString()}`);
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError);
        throw new Error(`Transaction would fail: ${estimateError.message || 'Unknown reason'}. Check that the contract address is correct and you have enough balance.`);
      }
      
      const tx = await contractWithSigner.deposit({ value: amountInWei });
      console.log('Deposit transaction submitted:', tx.hash);
      await tx.wait();
      console.log('Deposit transaction confirmed!');
      
      setRefillAmount('');
      setShowRefill(false);
      setSuccessMessage(`Successfully deposited ${refillAmount} ${networkConfig.nativeCurrency.symbol} to the faucet!`);
      await updateInfo(account, contract);
    } catch (err) {
      console.error('Refill error:', err);
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
      }
    } catch (err) {
      console.error("Error updating cooldown:", err);
    } finally {
      setUpdatingCooldown(false);
    }
  };

  // PoW Mining Utility Functions
  const getIpAddressHash = async () => {
    // For privacy, we'll use a consistent hash of the user's address + a browser fingerprint
    // In a real implementation, you might want to get actual IP from a service
    const fingerprint = navigator.userAgent + navigator.language + screen.width + screen.height;
    const combinedData = account + fingerprint;
    return ethers.keccak256(ethers.toUtf8Bytes(combinedData));
  };

  const getDifficultyTarget = async (withdrawalIndex) => {
    // Get the actual difficulty target from the contract (includes multipliers)
    if (contract && isDevFaucet) {
      try {
        const contractDifficulty = await contract.get_difficulty_target(withdrawalIndex);
        return Number(contractDifficulty);
      } catch (err) {
        console.error('Error getting difficulty target from contract:', err);
        // Fallback to hardcoded values
      }
    }
    
    // Fallback to hardcoded values if contract call fails
    const targets = [8000, 8000, 8000, 8000, 16000, 32000, 64000, 128000];
    return targets[withdrawalIndex - 1] || 8000;
  };

  const calculatePowHash = (userAddress, blockHash, withdrawalIndex, ipAddressHash, nonce) => {
    // Convert inputs to match contract's PoW calculation exactly
    // Contract order: _chosen_block_hash + convert(_user, bytes20) + _ip_address + convert(_nonce, bytes32)
    const blockHashBytes = ethers.getBytes(blockHash);
    const userBytes = ethers.getBytes(userAddress); // This is 20 bytes (address)
    const ipBytes = ethers.getBytes(ipAddressHash);
    const nonceBytes = ethers.zeroPadValue(ethers.toBeHex(nonce), 32);
    
    // Concatenate in contract order: blockHash + user + ip + nonce (NO withdrawal_index!)
    const combinedBytes = ethers.concat([blockHashBytes, userBytes, ipBytes, nonceBytes]);
    
    // Return keccak256 hash
    return ethers.keccak256(combinedBytes);
  };

  // Function to get fresh block hash that handles rollup delays
  const getFreshBlockHash = async () => {
    try {
      // Get user's last successful block from contract
      let userLastBlock = 0;
      try {
        userLastBlock = await contract.last_successful_block(account);
        userLastBlock = Number(userLastBlock);
      } catch (err) {
        console.log('Could not get user last block (new user):', err.message);
      }
      
      // Get the latest block number from RPC
      const rpcLatestBlockNumber = await provider.getBlockNumber();
      console.log(`RPC latest block: ${rpcLatestBlockNumber}, User last block: ${userLastBlock}`);
      
      // For rollup chains, use a block number that's guaranteed to be after user's last block
      // This handles the case where RPC latest block is behind the actual latest block
      let targetBlockNumber;
      
      if (userLastBlock > rpcLatestBlockNumber && userLastBlock > 0) {
        // Rollup delay detected - use user's last block + 1 as minimum
        targetBlockNumber = userLastBlock + 1;
        console.log(`Rollup delay detected. Using calculated block: ${targetBlockNumber}`);
        
        // Try to get this block, if it doesn't exist, create a synthetic hash
        try {
          const targetBlock = await provider.getBlock(targetBlockNumber);
          if (targetBlock) {
            console.log(`Found block ${targetBlockNumber}, hash: ${targetBlock.hash}`);
            return targetBlock.hash;
          }
        } catch (blockErr) {
          console.log(`Block ${targetBlockNumber} not found, creating synthetic hash`);
        }
        
        // Create a deterministic synthetic hash based on user's address and target block
        const synthHash = ethers.keccak256(
          ethers.concat([
            ethers.toUtf8Bytes(`block_${targetBlockNumber}_`),
            ethers.getBytes(account),
            ethers.toBeHex(Date.now(), 4) // Add some entropy
          ])
        );
        console.log(`Using synthetic hash for block ${targetBlockNumber}: ${synthHash}`);
        return synthHash;
      } else {
        // Normal case - use latest available block
        targetBlockNumber = Math.max(rpcLatestBlockNumber, userLastBlock + 1);
        const latestBlock = await provider.getBlock('latest');
        console.log(`Using latest RPC block ${latestBlock.number}, hash: ${latestBlock.hash}`);
        return latestBlock.hash;
      }
    } catch (err) {
      console.error('Error getting fresh block hash:', err);
      // Fallback to latest block
      const latestBlock = await provider.getBlock('latest');
      return latestBlock.hash;
    }
  };

  // PoW Mining Function with Pure Contract Validation 
  const startPowMining = async () => {
    if (!contract || !account) {
      setError('Contract or account not available');
      return;
    }
    // Prevent mining if faucet cannot pay the reward
    if (!hasSufficientFunds) {
      setError('Faucet has insufficient funds for the next withdrawal. Please try again later.');
      return;
    }

    try {
      setPowMining(true);
      setPowComplete(false);
      setPowProgress(0);
      setPowStartTime(Date.now());
      setError('');

      // Get the withdrawal index (1-based)
      // Use live count from chain to avoid stale index
      const liveCount = await contract.withdrawal_count(account);
      const withdrawalIndex = Number(liveCount) + 1;
      
      // Get difficulty target for this withdrawal
      const difficultyTarget = await getDifficultyTarget(withdrawalIndex);
      
      // Get fresh block hash that's guaranteed to be after last withdrawal
      const chosenBlockHash = await getFreshBlockHash();
      
      // Get IP address hash
      const ipAddressHash = await getIpAddressHash();
      
      console.log('Starting PoW mining with pure contract validation...', {
        withdrawalIndex,
        difficultyTarget,
        chosenBlockHash,
        ipAddressHash: ipAddressHash.substring(0, 10) + '...'
      });

      // Store initial mining data for UI display
      setPowData({
        chosenBlockHash,
        withdrawalIndex,
        ipAddressHash,
        difficultyTarget,
        nonce: 0,
        powHash: null,
        miningTime: 0
      });

      // Mining loop using local validation for speed
      let nonce = 0;
      let found = false;
      const startTime = Date.now();
      const batchSize = 1000; // Check more nonces locally before UI update
      
      while (!found) {
        // Local validation is much faster - do this first
        const powHash = calculatePowHash(account, chosenBlockHash, withdrawalIndex, ipAddressHash, nonce);
        const hashValue = BigInt(powHash);
        
        if (hashValue % BigInt(difficultyTarget) === 0n) {
          // Found valid PoW solution
          found = true;
          const miningTime = (Date.now() - startTime) / 1000;
          console.log(`PoW found! Nonce: ${nonce}, Hash: ${powHash}, Time: ${miningTime.toFixed(2)}s`);
          
          // Store the PoW data
          setPowData({
            chosenBlockHash,
            withdrawalIndex,
            ipAddressHash,
            nonce,
            powHash,
            difficultyTarget,
            miningTime
          });
          
          setPowComplete(true);
          setPowProgress(100);
        } else {
          nonce++;
          
          // Update progress every batch
          if (nonce % batchSize === 0) {
            const elapsed = Date.now() - startTime;
            const rate = nonce / (elapsed / 1000);
            const estimatedTotal = difficultyTarget;
            const progressPercent = Math.min((nonce / estimatedTotal) * 100, 99);
            setPowProgress(progressPercent);
            
            // Allow UI to update less frequently
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          // Safety check to prevent infinite loops
          if (nonce > difficultyTarget * 10) {
            throw new Error('Mining took too long, please try again');
          }
        }
      }
    } catch (err) {
      console.error('PoW mining error:', err);
      setError(`Mining failed: ${err.message}`);
      setPowMining(false);
      setPowComplete(false);
    } finally {
      if (!powComplete) {
        setPowMining(false);
      }
    }
  };

  // Function to preload difficulty and withdrawal amount for display
  const preloadDifficulty = async () => {
    if (!contract || !account || !isDevFaucet) return;
    
    try {
      const liveCount = await contract.withdrawal_count(account);
      const withdrawalIndex = Number(liveCount) + 1;
      const difficultyTarget = await getDifficultyTarget(withdrawalIndex);
      
      // Also fetch the withdrawal amount for this index
      const amountWei = await contract.get_withdrawal_amount(withdrawalIndex);
      const amountFormatted = ethers.formatEther(amountWei);
      
      // Update powData with difficulty and amount for display
      setPowData(prev => ({
        ...prev,
        difficultyTarget,
        withdrawalIndex
      }));
      
      // Update expected withdrawal amount
      setExpectedWithdrawalAmountWei(amountWei);
      setExpectedWithdrawalAmount(amountFormatted);
    } catch (err) {
      console.warn('Could not preload difficulty and amount:', err);
    }
  };

  // Reset PoW state when withdrawal count changes
  useEffect(() => {
    if (isDevFaucet) {
      setPowComplete(false);
      // Don't reset powData to null completely - preserve difficulty if available
      setPowData(prev => prev ? { ...prev, nonce: 0, powHash: null, miningTime: 0 } : null);
      setPowProgress(0);
      setPowMining(false); // Also reset mining state
      
      // Preload difficulty for the next withdrawal
      preloadDifficulty();
    }
  }, [withdrawalCount, isDevFaucet]);

  // Also preload difficulty when contract and account are available
  useEffect(() => {
    if (contract && account && isDevFaucet) {
      preloadDifficulty();
    }
  }, [contract, account, isDevFaucet]);

  // Admin Functions
  const handleUpdateWithdrawalAmount = async (index, amount) => {
    if (!isAdmin || !contract) return;
    
    try {
      setAdminLoading(true);
      setAdminError('');
      setAdminSuccess('');
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      // Convert amount to wei
      const amountInWei = ethers.parseEther(amount.toString());
      
      const tx = await contractWithSigner.update_withdrawal_amount(index, amountInWei);
      await tx.wait();
      
      setAdminSuccess(`Successfully updated withdrawal amount for index ${index} to ${amount} tokens`);
      await updateInfo(); // Refresh contract info
    } catch (err) {
      console.error('Error updating withdrawal amount:', err);
      setAdminError(`Failed to update withdrawal amount: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdatePowDifficulty = async (index, difficulty) => {
    if (!isAdmin || !contract) return;
    
    try {
      setAdminLoading(true);
      setAdminError('');
      setAdminSuccess('');
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const tx = await contractWithSigner.update_pow_difficulty(index, difficulty);
      await tx.wait();
      
      setAdminSuccess(`Successfully updated PoW difficulty for index ${index} to ${difficulty}`);
      await updateInfo(); // Refresh contract info
    } catch (err) {
      console.error('Error updating PoW difficulty:', err);
      setAdminError(`Failed to update PoW difficulty: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateCooldownPeriod = async (period) => {
    if (!isAdmin || !contract) return;
    
    try {
      setAdminLoading(true);
      setAdminError('');
      setAdminSuccess('');
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const tx = await contractWithSigner.update_cooldown_period(period);
      await tx.wait();
      
      setAdminSuccess(`Successfully updated cooldown period to ${period} seconds`);
      await updateInfo(); // Refresh contract info
    } catch (err) {
      console.error('Error updating cooldown period:', err);
      setAdminError(`Failed to update cooldown period: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateBaseAmountMultiplier = async (multiplier) => {
    if (!isAdmin || !contract) return;
    
    try {
      setAdminLoading(true);
      setAdminError('');
      setAdminSuccess('');
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const tx = await contractWithSigner.update_base_amount_multiplier(multiplier);
      await tx.wait();
      
      const displayMultiplier = (multiplier / 1000).toFixed(2);
      setAdminSuccess(`Successfully updated base amount multiplier to ${displayMultiplier}x`);
      await updateInfo(); // Refresh contract info
    } catch (err) {
      console.error('Error updating base amount multiplier:', err);
      setAdminError(`Failed to update base amount multiplier: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateBaseDifficultyMultiplier = async (multiplier) => {
    if (!isAdmin || !contract) return;
    
    try {
      setAdminLoading(true);
      setAdminError('');
      setAdminSuccess('');
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const tx = await contractWithSigner.update_base_difficulty_multiplier(multiplier);
      await tx.wait();
      
      const displayMultiplier = (multiplier / 1000).toFixed(2);
      setAdminSuccess(`Successfully updated base difficulty multiplier to ${displayMultiplier}x`);
      await updateInfo(); // Refresh contract info
    } catch (err) {
      console.error('Error updating base difficulty multiplier:', err);
      setAdminError(`Failed to update base difficulty multiplier: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const debugBlockInfo = async () => {
    if (!contract || !account) return;
    
    try {
      console.log('=== DEBUG BLOCK INFO ===');
      const latestBlockNum = await provider.getBlockNumber();
      console.log(`RPC Latest block number: ${latestBlockNum}`);
      
      const latestBlock = await provider.getBlock('latest');
      console.log(`RPC Latest block details:`, {
        number: latestBlock.number,
        hash: latestBlock.hash,
        timestamp: latestBlock.timestamp,
        timeSinceNow: `${Math.floor((Date.now() / 1000) - latestBlock.timestamp)}s ago`
      });
      
      try {
        const userLastBlock = await contract.last_successful_block(account);
        const userLastBlockNum = Number(userLastBlock);
        console.log(`User last successful block: ${userLastBlockNum}`);
        
        // Check for rollup delay
        if (userLastBlockNum > latestBlockNum && userLastBlockNum > 0) {
          console.log(`🔴 ROLLUP DELAY DETECTED:`);
          console.log(`  User last block (${userLastBlockNum}) > RPC latest (${latestBlockNum})`);
          console.log(`  Difference: ${userLastBlockNum - latestBlockNum} blocks`);
          console.log(`  This is expected for rollup chains with processing delays`);
        } else if (userLastBlockNum > 0) {
          console.log(`✅ Block numbers consistent`);
          console.log(`  User last: ${userLastBlockNum}, RPC latest: ${latestBlockNum}`);
        }
      } catch (err) {
        console.log('Could not get user last block:', err.message);
      }
      
      console.log(`Network: ${network} (rollup chain)`);
      console.log(`Contract address: ${contractAddress}`);
      console.log(`RPC URL: ${networkConfig.rpcUrls?.[0] || 'Unknown'}`);
      console.log('========================');
    } catch (err) {
      console.error('Error in debug info:', err);
    }
  };

  const handleWithdrawAllFunds = async () => {
    if (!contract || !account || !isAdmin || !provider) {
      setAdminError('Not authorized or contract not connected');
      return;
    }

    try {
      setAdminLoading(true);
      setAdminError('');
      setAdminSuccess('');

      // Get current contract balance
      const currentBalance = await provider.getBalance(contractAddress);
      
      if (Number(currentBalance) === 0) {
        setAdminError('No funds to withdraw - contract balance is 0');
        return;
      }

      console.log(`Withdrawing all funds: ${ethers.formatEther(currentBalance)} ${networkConfig.nativeCurrency.symbol}`);

      // Get signer and connect contract to it for transaction
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Call withdraw_balance with the full balance
      const tx = await contractWithSigner.withdraw_balance(currentBalance);
      console.log('Withdraw all funds transaction sent:', tx.hash);

      await tx.wait();
      console.log('Withdraw all funds transaction confirmed');

      setAdminSuccess(`Successfully withdrew all funds: ${ethers.formatEther(currentBalance)} ${networkConfig.nativeCurrency.symbol}`);
      
      // Refresh contract info
      await updateInfo();
      await updateUserBalance();
      
    } catch (err) {
      console.error('Error withdrawing all funds:', err);
      setAdminError(`Withdraw all funds failed: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  // Alternative single-signature approach (experimental)
  const handleDirectWithdrawalOptimized = async () => {
    if (!isAdmin || !contract || !isDevFaucet) return;
    
    try {
      setAdminLoading(true);
      setAdminError('');
      setAdminSuccess('');
      
      if (!powComplete || !powData) {
        setAdminError('Please complete proof-of-work mining first');
        return;
      }

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      // SINGLE SIGNATURE APPROACH: Use the transaction signature as the EIP-712 signature
      // This requires crafting the transaction data to match what the contract expects
      
      const messageToSign = expectedMessage || DEV_FAUCET_MESSAGES[withdrawalCount] || "Admin test withdrawal";
      
      // Create the contract call data manually
      const withdrawInterface = new ethers.Interface([
        "function withdraw(bytes32 _chosen_block_hash, uint256 _withdrawal_index, bytes32 _ip_address, uint256 _pow_nonce, string _message)"
      ]);
      
      // Placeholder signature components - in a real implementation, 
      // these would be derived from the transaction signature itself
      const placeholderSig = {
        v: 27,
        r: ethers.ZeroHash,
        s: ethers.ZeroHash
      };
      
      const calldata = withdrawInterface.encodeFunctionData("withdraw", [
        powData.chosenBlockHash,
        powData.withdrawalIndex,
        powData.ipAddressHash,
        powData.nonce,
        placeholderSig.v,
        placeholderSig.r,
        placeholderSig.s
      ]);
      
      console.log('⚠️ Single signature approach needs contract modification to work properly');
      setAdminError('Single signature approach requires contract changes. Use the standard method below.');
      
    } catch (err) {
      console.error('Error with optimized withdrawal:', err);
      setAdminError(`Optimized withdrawal failed: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDirectWithdrawal = async () => {
    if (!isAdmin || !contract || !isDevFaucet) return;
    
    try {
      setAdminLoading(true);
      setAdminError('');
      setAdminSuccess('');
      
      if (!powComplete || !powData) {
        setAdminError('Please complete proof-of-work mining first');
        return;
      }

      // Check if we need to re-mine with a fresh block hash
      // For rollup chains, be more flexible with validation
      let userLastBlock = 0;
      try {
        userLastBlock = await contract.last_successful_block(account);
        userLastBlock = Number(userLastBlock);
      } catch (err) {
        console.log('Could not get user last block (new user):', err.message);
      }

      console.log(`Direct withdrawal validation: User last block ${userLastBlock}`);

      // For rollup chains with delays, let the contract handle validation
      // Only perform basic sanity checks here
      try {
        const currentBlock = await provider.getBlock(powData.chosenBlockHash);
        if (currentBlock) {
          console.log(`PoW block: ${currentBlock.number}, User last: ${userLastBlock}`);
          
          // Check for rollup delay scenario
          const latestBlockNum = await provider.getBlockNumber();
          if (userLastBlock > latestBlockNum) {
            console.warn(`Rollup delay in direct withdrawal: User last ${userLastBlock} > RPC latest ${latestBlockNum}`);
            console.warn('Proceeding - contract will validate with actual blockchain state');
          }
        }
      } catch (err) {
        console.log('Could not get PoW block details (synthetic hash or RPC issue):', err.message);
        console.log('Proceeding - contract will validate the block hash');
      }

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // DevFaucet direct withdraw uses single-signature flow: pass the message string
      const messageToSend = expectedMessage || DEV_FAUCET_MESSAGES[withdrawalCount] || "Admin test withdrawal";

      // Prefer live next index over any stale state
      const liveCountNow = await contract.withdrawal_count(account);
      const nextIndexNow = Number(liveCountNow) + 1;

      // Estimate gas first to surface errors early
      try {
        await contractWithSigner.withdraw.estimateGas(
          powData.chosenBlockHash,
          nextIndexNow,
          powData.ipAddressHash,
          powData.nonce,
          messageToSend
        );
      } catch (estimateError) {
        console.error('Direct withdrawal gas estimation failed:', estimateError);
        throw new Error(`Transaction would fail: ${estimateError.reason || estimateError.message}`);
      }

      const tx = await contractWithSigner.withdraw(
        powData.chosenBlockHash,
        nextIndexNow,
        powData.ipAddressHash,
        powData.nonce,
        messageToSend
      );
      
      console.log("Admin direct withdrawal transaction submitted:", tx.hash);
      await tx.wait();
      console.log("Admin direct withdrawal transaction confirmed!");
      
      setAdminSuccess(`Direct withdrawal successful! Transaction: ${tx.hash.substring(0, 10)}...`);
      
      // Reset PoW state after successful withdrawal
      setPowComplete(false);
      setPowData(null);
      setPowProgress(0);
      
      // Update contract info
      await updateInfo();
      await updateUserBalance();
      
    } catch (err) {
      console.error('Error with direct withdrawal:', err);
      setAdminError(`Direct withdrawal failed: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const isTestnet = network === 'animechain_testnet';
  

  
  // Render progress steps dynamically
  const renderProgressSteps = () => {
    const steps = [];
    
    for (let i = 1; i <= maxWithdrawals; i++) {
      const isCompleted = withdrawalCount >= i;
      const isCurrent = withdrawalCount === i - 1;
      
      steps.push(
        <div key={i} className={`progress-step ${isCompleted ? 'completed' : isCurrent ? 'current' : ''}`}>
          {i}
        </div>
      );
      
      // Add progress line between steps (but not after the last one)
      if (i < maxWithdrawals) {
        steps.push(<div key={`line-${i}`} className={`progress-line ${isDevFaucet ? 'dev' : ''}`}></div>);
      }
    }
    
    return steps;
  };

  return (
    <div className="faucet-container dark-theme">
                {network === 'animechain_testnet' && <div className="dev-banner">Testnet Mode - Using {networkConfig.chainName}</div>}
      <div className="logo-container">
        <img src={animecoinIcon} alt="Animecoin Logo" className="animecoin-logo" />
      </div>
      

      
      {/* Server Endpoint Switcher - only show on localhost */}
      {isLocalhost && account && (
        <div className="server-testing">
          <h3>Server Endpoint (Localhost Only)</h3>
          <div className="server-toggle-container">
            <button 
              onClick={() => setUseLocalServer(true)}
              className={`server-toggle-button ${useLocalServer ? 'active' : ''}`}
            >
              🏠 Local Server (localhost:5000)
            </button>
            <button 
              onClick={() => setUseLocalServer(false)}
              className={`server-toggle-button ${!useLocalServer ? 'active' : ''}`}
            >
              🌐 Production Server (faucet.animechain.dev)
            </button>
          </div>
          <p className="server-info-text">
            Choose which server endpoint to use for withdrawals. Current: <strong>{useLocalServer ? 'localhost:5000' : 'faucet.animechain.dev'}</strong>
          </p>
        </div>
      )}
      {isInitializing ? (
        <div className="loading-overlay"><div className="spinner" /><p>Loading your faucet status…</p></div>
      ) : !account ? (
        <button onClick={connectWallet} disabled={loading} className="connect-button">
          {loading ? 'Connecting...' : `Connect to ${networkConfig.chainName}`}
        </button>
      ) : (
        <div>
          <div className="info-container">
            <p className="account-info">Connected Account: {account}</p>
            <p className="user-balance">Your Balance: {userBalance} {networkConfig.nativeCurrency.symbol}</p>
            <p className="balance-info">Faucet Balance: {balance} {networkConfig.nativeCurrency.symbol}</p>
            
            {/* Hide global cooldown status for DevFaucet */}
            {!isDevFaucet && (
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
            )}
            
            {/* Only show progress bar if cooldown > 0 (not for DevFaucet) */}
            {!isDevFaucet && Number(cooldown) > 0 && (
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
              Withdrawals completed: <span className="count">{withdrawalCount}</span> / {maxWithdrawals}
            </p>
            
            <div className="explorer-link-container">
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-button">
                View on {networkConfig.chainName} Explorer
              </a>
            </div>
          </div>
          {withdrawalCount < maxWithdrawals && (
            <div className="phases-container">
                      {isDevFaucet && (
                <div className="phase-line">
                  <span className="phase-label">Phase 1: Mine PoW</span>
                  <span className="phase-difficulty">diff: {powData?.difficultyTarget?.toLocaleString() || 'loading'}</span>
                  <div className="phase-status">
                      {!powComplete ? (
                      !powMining ? (
                              <button
                                onClick={startPowMining}
                                disabled={
                                  loading ||
                                  withdrawalCount >= 8 ||
                                  !hasSufficientFunds ||
                                  uiCooldownRemaining() > 0
                                }
                          className="phase-button"
                        >
                          {!hasSufficientFunds
                            ? '⛔ Empty'
                            : uiCooldownRemaining() > 0
                              ? `Wait ${formatUiCooldown()}`
                              : '⛏️ Mine'}
                              </button>
                      ) : (
                        <div className="phase-mining">
                          <span>⛏️ {powProgress.toFixed(0)}%</span>
                          <div className="mini-progress">
                            <div className="mini-fill" style={{ width: `${powProgress}%` }}></div>
                              </div>
                            </div>
                      )
                    ) : (
                      <span className="phase-complete">✅ {powData?.miningTime?.toFixed(1)}s</span>
                          )}
                    {/* Always show progress dots (8 steps) inline below phases */}
              </div>
            </div>
          )}
              
              <div className="phase-line">
                <span className="phase-label">{isDevFaucet ? 'Phase 2: Sign Message' : 'Sign Message'}</span>
                <span className="phase-tokens">{isDevFaucet ? (expectedWithdrawalAmount ? `${Number(expectedWithdrawalAmount).toLocaleString()} ANIME` : 'loading') : '0.1 tokens'}</span>
            <button
                  className={`phase-button ${isDevFaucet && powComplete ? 'pow-ready' : ''}`}
              onClick={handleWithdraw}
              disabled={
                loading ||
                serverLoading ||
                Number(cooldown) > 0 ||
                uiCooldownRemaining() > 0 ||
                (isDevFaucet ? (withdrawalCount >= 8 || !powComplete || !hasSufficientFunds) : withdrawalCount >= 3)
              }
            >
              {loading ? 'Processing...' :
                serverLoading ? 'Sending to Server...' :
                    isDevFaucet ? (
                      (isDevFaucet && !hasSufficientFunds) ? 'Faucet empty' :
                      withdrawalCount >= 8 ? 'Daily limit reached' :
                      Number(cooldown) > 0 ? `Available in ${formatCooldown()}` :
                      uiCooldownRemaining() > 0 ? `Wait ${formatUiCooldown()}` :
                      !powComplete ? 'PoW Required' :
                      powComplete ? 'Sign & Claim' :
                      'Sign'
                    ) : (
                      withdrawalCount >= 3 ? 'Maximum reached' :
                      Number(cooldown) > 0 ? `Available in ${formatCooldown()}` :
                      withdrawalCount === 0 ? 'Sign & Request (Server)' :
                      'Sign & Request'
                    )
                  }
            </button>
                <span 
                  className="phase-toggle"
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowMessage(!showMessage)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowMessage(!showMessage); }}
                  aria-expanded={showMessage}
                >
                  {showMessage ? '▼' : '▶'} msg
                </span>
          </div>

              <div className="message-progress">
                {renderProgressSteps()}
              </div>
              
              {showMessage && (
                <div className="message-details">
                  <div className="message-highlight">
                    <p><b>{getDisplayMessage(withdrawalCount)}</b></p>
                  </div>
                  {expectedMessage && expectedMessage !== (DEV_FAUCET_MESSAGES[withdrawalCount]) && (
                    <div className="expected-message">
                      <p><strong>Contract expects:</strong> {isDevFaucet ? expectedMessage : expectedMessage.replace("  Also, Earth domain is best.", "")}</p>
                        </div>
                      )}
                  {withdrawalCount === 0 && (
                    <div className="server-info">
                      <p>📡 First withdrawal uses server at {
                        isLocalhost 
                          ? (useLocalServer ? 'localhost:5000' : 'faucet.animechain.dev')
                          : 'faucet.animechain.dev'
                      }</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Admin Panel - only show for admin users on devFaucet */}
          {isAdmin && isDevFaucet && (
            <div className="admin-panel">
              <div className="admin-header">
                <h3>🔧 Admin Controls</h3>
                <p className="admin-info">You are connected as the contract owner</p>
                <button 
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="admin-toggle-button"
                >
                  {showAdminPanel ? '🔼 Hide Admin Panel' : '🔽 Show Admin Panel'}
                </button>
              </div>
              
              {showAdminPanel && (
                <div className="admin-content">
                  <AdminPanel 
                    onUpdateWithdrawalAmount={handleUpdateWithdrawalAmount}
                    onUpdatePowDifficulty={handleUpdatePowDifficulty}
                    onUpdateCooldownPeriod={handleUpdateCooldownPeriod}
                    onUpdateBaseAmountMultiplier={handleUpdateBaseAmountMultiplier}
                    onUpdateBaseDifficultyMultiplier={handleUpdateBaseDifficultyMultiplier}
                    onDirectWithdrawal={handleDirectWithdrawal}
                    onDebugBlockInfo={debugBlockInfo}
                    onWithdrawAllFunds={handleWithdrawAllFunds}
                    loading={adminLoading}
                    contract={contract}
                    isDevFaucet={isDevFaucet}
                    powComplete={powComplete}
                  />
                </div>
              )}
              
              {adminError && <p className="admin-error">{adminError}</p>}
              {adminSuccess && <p className="admin-success">{adminSuccess}</p>}
            </div>
          )}

          
          {error && <p className="error">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
      )}

      
      {/* Footer: faucet details only (refill moved to App-level footer component) */}
      <div className="footer-refill">
        <div className="footer-details">
          {showFaucetDetails && (
            <div className="refill-container transparent">
              <div className="dev-faucet-info">
                <p>⚡ DevFaucet: Proof-of-work mining required for withdrawal</p>
                <p>💎 Progressive amounts: 5, 5, 10, 15, 25, 50, 75, 100 tokens</p>
                <p>🔄 Daily reset: Up to 8 withdrawals per 24-hour period</p>
                <p>⛏️ Difficulty: ~8k+ hashes (est. 30s avg)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Faucet;