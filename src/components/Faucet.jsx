import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { FAUCET_ABI, DEV_FAUCET_ABI, FAUCET_SERVER_ABI, DEV_FAUCET_SERVER_ABI, NETWORKS, WITHDRAWAL_MESSAGES, DEV_FAUCET_MESSAGES } from '../constants/contracts';
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
  
  // Server endpoint preference for localhost users
  const [useLocalServer, setUseLocalServer] = useState(true);
  
  // Detect localhost for showing server features
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const networkConfig = NETWORKS[network] || NETWORKS.animechain;
  const isDevFaucet = network === 'animechain_testnet'; // Use devFaucet on AnimeChain testnet
  const contractABI = isDevFaucet ? DEV_FAUCET_ABI : FAUCET_ABI;
  const explorerUrl = `${networkConfig.blockExplorerUrls[0]}address/${account}`;
  
  // Get max withdrawals based on faucet type
  const maxWithdrawals = isDevFaucet ? 8 : 3;
  
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
        
        // Get the last recipient if we're checking cooldown (only for regular faucet)
        if (!isDevFaucet) {
          try {
            const recipient = await contractToUse.last_recipient();
            setLastRecipient(recipient);
          } catch (recipientErr) {
            console.error("Error getting last recipient:", recipientErr);
          }
        } else {
          // DevFaucet doesn't have last_recipient, set to empty
          setLastRecipient("");
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
        
        // Check admin status
        await checkAdminStatus(accountToUse, contractToUse);
        
        try {
          const message = await contractToUse.get_expected_message(accountToUse);
          console.log("Expected message from contract:", message);
          setExpectedMessage(message);
        } catch (msgErr) {
          console.error("Error getting expected message:", msgErr);
          // Fallback to using the appropriate messages array
          const fallbackMessage = isDevFaucet ? 
            (DEV_FAUCET_MESSAGES[withdrawalCount] || "") : 
            (WITHDRAWAL_MESSAGES[withdrawalCount] || "");
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
          const fallbackMessage = isDevFaucet ? 
            (DEV_FAUCET_MESSAGES[withdrawalCount] || "") : 
            (WITHDRAWAL_MESSAGES[withdrawalCount] || "");
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
        
        // Get the last recipient (only for regular faucet)
        if (!isDevFaucet) {
          try {
            const recipient = await contract.last_recipient();
            setLastRecipient(recipient);
          } catch (recipientErr) {
            console.error("Error getting last recipient:", recipientErr);
          }
        } else {
          // DevFaucet doesn't have last_recipient, set to empty
          setLastRecipient("");
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
      
      // Get the last recipient (only for regular faucet)
      if (!isDevFaucet) {
        try {
          const recipient = await contract.last_recipient();
          setLastRecipient(recipient);
        } catch (recipientErr) {
          console.error("Error getting last recipient:", recipientErr);
        }
      } else {
        // DevFaucet doesn't have last_recipient, set to empty
        setLastRecipient("");
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
    if (isDevFaucet) {
      // Use devFaucet messages directly
      return DEV_FAUCET_MESSAGES[index] || "";
    }
    
    // For mainnet faucet, for the first message, hide the "Earth domain is best" part in the UI
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
      // If expectedMessage is empty, fall back to the appropriate array
      const messageToSign = expectedMessage || (isDevFaucet ? 
        DEV_FAUCET_MESSAGES[withdrawalCount] : 
        WITHDRAWAL_MESSAGES[withdrawalCount]);
      
      // Validate message exists
      if (!messageToSign) {
        throw new Error('No message available for signing. Please refresh and try again.');
      }
      
      console.log("Message to sign:", messageToSign);
      
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
      
      // Check DevFaucet PoW requirements (for all withdrawals, including first via server)
      if (isDevFaucet && (!powComplete || !powData)) {
        throw new Error('Please complete proof-of-work mining before requesting tokens.');
      }

      // For first withdrawal (withdrawalCount == 0), use server API for both faucets
      if (withdrawalCount === 0) {
        // Determine server URL based on user preference (localhost) or default (production)
        const serverUrl = isLocalhost 
          ? (useLocalServer ? 'http://localhost:5000' : 'https://faucet.animechain.dev')
          : 'https://faucet.animechain.dev';
        const serverNetwork = getServerNetwork(network);
        console.log(`Using server at ${serverUrl} for first withdrawal on network ${serverNetwork}`);
        
        // Log the request data for debugging
        const requestData = isDevFaucet ? {
          network: serverNetwork,
          user_address: account,
          chosen_block_hash: powData?.chosenBlockHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
          withdrawal_index: powData?.withdrawalIndex || 1,
          ip_address: powData?.ipAddressHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
          nonce: powData?.nonce || 0,
          v: sig.v,
          r: sig.r,
          s: sig.s,
          message: messageToSign
        } : {
          network: serverNetwork,
          user_address: account,
          v: sig.v,
          r: sig.r,
          s: sig.s,
          message: messageToSign
        };
        
        console.log("Server request data:", requestData);
        console.log("Sending network name to server:", serverNetwork);
        
        try {
          setServerLoading(true);
          const response = await fetch(`${serverUrl}/request-withdrawal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
            
            // Special handling for network not available error
            if (errorData.error && errorData.error.includes('Network') && errorData.error.includes('not available')) {
              console.error("Network not available error:", errorData);
              console.log("Tried network name:", serverNetwork);
              console.log("Available networks might be: animechain, testnet, animechain_testnet");
              throw new Error(`Network "${serverNetwork}" not available on server. Check server logs for available networks.`);
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
        
        // Reset PoW state after successful server withdrawal (DevFaucet only)
        if (isDevFaucet) {
          setPowComplete(false);
          setPowData(null);
          setPowProgress(0);
        }
      } else if (isDevFaucet) {
        // For subsequent DevFaucet withdrawals, use direct contract interaction
        console.log("Using PoW data for devFaucet withdrawal:", powData);
        
        // First try to estimate gas to catch any revert reasons
        try {
          const gasEstimate = await contractWithSigner.withdraw.estimateGas(
            powData.chosenBlockHash,
            powData.withdrawalIndex,
            powData.ipAddressHash,
            powData.nonce,
            sig.v,
            sig.r,
            sig.s
          );
          console.log("Gas estimate successful:", gasEstimate.toString());
        } catch (estimateError) {
          console.error("Gas estimation failed - transaction would revert:", estimateError);
          throw new Error(`Transaction would fail: ${estimateError.reason || estimateError.message}`);
        }
        
        // Call devFaucet withdraw with PoW parameters
        const tx = await contractWithSigner.withdraw(
          powData.chosenBlockHash,
          powData.withdrawalIndex,
          powData.ipAddressHash,
          powData.nonce,
          sig.v,
          sig.r,
          sig.s
        );
        
        console.log("DevFaucet transaction submitted:", tx.hash);
        setLastTxHash(tx.hash);
        await tx.wait();
        console.log("DevFaucet transaction confirmed!");
        
        // Reset PoW state after successful withdrawal
        setPowComplete(false);
        setPowData(null);
        setPowProgress(0);
        
        // Reset cooldown after successful withdrawal
        await resetCooldownAfterWithdrawal();
        
        // Update user balance
        await updateUserBalance();
      } else {
        // For subsequent original faucet withdrawals, use direct contract interaction
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
    // Convert all inputs to bytes and concatenate
    const userBytes = ethers.getBytes(userAddress);
    const blockHashBytes = ethers.getBytes(blockHash);
    const indexBytes = ethers.zeroPadValue(ethers.toBeHex(withdrawalIndex), 32);
    const ipBytes = ethers.getBytes(ipAddressHash);
    const nonceBytes = ethers.zeroPadValue(ethers.toBeHex(nonce), 32);
    
    // Concatenate all bytes
    const combinedBytes = ethers.concat([userBytes, blockHashBytes, indexBytes, ipBytes, nonceBytes]);
    
    // Return keccak256 hash
    return ethers.keccak256(combinedBytes);
  };

  // PoW Mining Function with Pure Contract Validation 
  const startPowMining = async () => {
    if (!contract || !account) {
      setError('Contract or account not available');
      return;
    }

    try {
      setPowMining(true);
      setPowComplete(false);
      setPowProgress(0);
      setPowStartTime(Date.now());
      setError('');

      // Get the withdrawal index (1-based)
      const withdrawalIndex = withdrawalCount + 1;
      
      // Get difficulty target for this withdrawal
      const difficultyTarget = await getDifficultyTarget(withdrawalIndex);
      
      // Get recent block hash
      const latestBlock = await provider.getBlock('latest');
      const chosenBlockHash = latestBlock.hash;
      
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
          // Found potential solution - verify with contract to be sure
          try {
            const isValid = await contract.validate_hash(
              account,
              chosenBlockHash,
              withdrawalIndex,
              ipAddressHash,
              nonce,
              difficultyTarget
            );
            
            if (isValid) {
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
              console.warn('Local validation passed but contract validation failed for nonce:', nonce);
              nonce++;
            }
          } catch (contractError) {
            console.error('Contract validation error:', contractError.message);
            // Trust local validation if contract call fails
            found = true;
            const miningTime = (Date.now() - startTime) / 1000;
            console.log(`PoW found (local validation)! Nonce: ${nonce}, Hash: ${powHash}, Time: ${miningTime.toFixed(2)}s`);
            
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
          }
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

  // Reset PoW state when withdrawal count changes
  useEffect(() => {
    if (isDevFaucet) {
      setPowComplete(false);
      setPowData(null);
      setPowProgress(0);
    }
  }, [withdrawalCount, isDevFaucet]);

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
      
      const tx = await contractWithSigner.updateWithdrawalAmount(index, amountInWei);
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
      
      const tx = await contractWithSigner.updatePowDifficulty(index, difficulty);
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
      
      const tx = await contractWithSigner.updateCooldownPeriod(period);
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
      
      const tx = await contractWithSigner.updateBaseAmountMultiplier(multiplier);
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
      
      const tx = await contractWithSigner.updateBaseDifficultyMultiplier(multiplier);
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
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      // Build EIP-712 signature for admin withdrawal
      const domain = {
        name: "Faucet",
        version: "1",
        chainId: parseInt(networkConfig.chainId, 16),
        verifyingContract: contractAddress
      };
      
      const types = {
        FaucetRequest: [
          { name: "recipient", type: "address" },
          { name: "message", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };
      
      const messageToSign = expectedMessage || DEV_FAUCET_MESSAGES[withdrawalCount] || "Admin test withdrawal";
      
      const message = {
        recipient: account,
        message: messageToSign,
        nonce: Number(nonce)
      };
      
      const signature = await signer.signTypedData(domain, types, message);
      const sig = ethers.Signature.from(signature);
      
      console.log('Admin direct withdrawal with PoW data:', powData);
      
      // Call devFaucet withdraw directly
      const tx = await contractWithSigner.withdraw(
        powData.chosenBlockHash,
        powData.withdrawalIndex,
        powData.ipAddressHash,
        powData.nonce,
        sig.v,
        sig.r,
        sig.s
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
  
  // Admin Panel Component
  const AdminPanel = ({ onUpdateWithdrawalAmount, onUpdatePowDifficulty, onUpdateCooldownPeriod, onUpdateBaseAmountMultiplier, onUpdateBaseDifficultyMultiplier, onDirectWithdrawal, loading }) => {
    const [withdrawalIndex, setWithdrawalIndex] = useState(1);
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [difficultyIndex, setDifficultyIndex] = useState(1);
    const [difficultyValue, setDifficultyValue] = useState('');
    const [cooldownPeriod, setCooldownPeriod] = useState('');
    const [baseAmountMultiplier, setBaseAmountMultiplier] = useState('');
    const [baseDifficultyMultiplier, setBaseDifficultyMultiplier] = useState('');

    const handleWithdrawalAmountSubmit = (e) => {
      e.preventDefault();
      if (withdrawalAmount && withdrawalIndex >= 1 && withdrawalIndex <= 8) {
        onUpdateWithdrawalAmount(withdrawalIndex, withdrawalAmount);
        setWithdrawalAmount('');
      }
    };

    const handleDifficultySubmit = (e) => {
      e.preventDefault();
      if (difficultyValue && difficultyIndex >= 1 && difficultyIndex <= 8) {
        onUpdatePowDifficulty(difficultyIndex, parseInt(difficultyValue));
        setDifficultyValue('');
      }
    };

    const handleCooldownSubmit = (e) => {
      e.preventDefault();
      if (cooldownPeriod !== '') {
        onUpdateCooldownPeriod(parseInt(cooldownPeriod));
        setCooldownPeriod('');
      }
    };

    const handleBaseAmountMultiplierSubmit = (e) => {
      e.preventDefault();
      if (baseAmountMultiplier !== '') {
        // Convert decimal to integer (1.5 -> 1500)
        const multiplierInt = Math.round(parseFloat(baseAmountMultiplier) * 1000);
        onUpdateBaseAmountMultiplier(multiplierInt);
        setBaseAmountMultiplier('');
      }
    };

    const handleBaseDifficultyMultiplierSubmit = (e) => {
      e.preventDefault();
      if (baseDifficultyMultiplier !== '') {
        // Convert decimal to integer (1.5 -> 1500)
        const multiplierInt = Math.round(parseFloat(baseDifficultyMultiplier) * 1000);
        onUpdateBaseDifficultyMultiplier(multiplierInt);
        setBaseDifficultyMultiplier('');
      }
    };

    return (
      <div className="admin-panel-content">
        <div className="admin-section">
          <h4>💰 Update Withdrawal Amount</h4>
          <form onSubmit={handleWithdrawalAmountSubmit} className="admin-form">
            <div className="form-row">
              <select 
                value={withdrawalIndex} 
                onChange={(e) => setWithdrawalIndex(parseInt(e.target.value))}
                className="admin-select"
              >
                {[1,2,3,4,5,6,7,8].map(i => (
                  <option key={i} value={i}>Index {i} (currently {[5,5,10,15,25,50,75,100][i-1]} tokens)</option>
                ))}
              </select>
              <input
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="New amount (tokens)"
                className="admin-input"
                min="0"
                step="0.1"
              />
              <button type="submit" disabled={loading || !withdrawalAmount} className="admin-button">
                Update Amount
              </button>
            </div>
          </form>
        </div>

        <div className="admin-section">
          <h4>⛏️ Update PoW Difficulty</h4>
          <form onSubmit={handleDifficultySubmit} className="admin-form">
            <div className="form-row">
              <select 
                value={difficultyIndex} 
                onChange={(e) => setDifficultyIndex(parseInt(e.target.value))}
                className="admin-select"
              >
                {[1,2,3,4,5,6,7,8].map(i => (
                  <option key={i} value={i}>Index {i} (currently {[8000,8000,8000,8000,16000,32000,64000,128000][i-1]})</option>
                ))}
              </select>
              <input
                type="number"
                value={difficultyValue}
                onChange={(e) => setDifficultyValue(e.target.value)}
                placeholder="New difficulty"
                className="admin-input"
                min="1000"
                step="1000"
              />
              <button type="submit" disabled={loading || !difficultyValue} className="admin-button">
                Update Difficulty
              </button>
            </div>
          </form>
        </div>

        <div className="admin-section">
          <h4>⏰ Update Cooldown Period</h4>
          <form onSubmit={handleCooldownSubmit} className="admin-form">
            <div className="form-row">
              <input
                type="number"
                value={cooldownPeriod}
                onChange={(e) => setCooldownPeriod(e.target.value)}
                placeholder="Cooldown period (seconds, 0 = no cooldown)"
                className="admin-input"
                min="0"
                step="1"
              />
              <button type="submit" disabled={loading || cooldownPeriod === ''} className="admin-button">
                Update Cooldown
              </button>
            </div>
          </form>
        </div>

        <div className="admin-section multiplier-section">
          <h4>🎯 Global Multipliers</h4>
          
          <div className="multiplier-subsection">
            <h5>💰 Base Amount Multiplier</h5>
            <p className="multiplier-info">Multiplies all withdrawal amounts (1.0 = default, 2.0 = double amounts)</p>
            <form onSubmit={handleBaseAmountMultiplierSubmit} className="admin-form">
              <div className="form-row">
                <input
                  type="number"
                  value={baseAmountMultiplier}
                  onChange={(e) => setBaseAmountMultiplier(e.target.value)}
                  placeholder="Amount multiplier (e.g., 1.5 for 1.5x)"
                  className="admin-input"
                  min="0.1"
                  step="0.1"
                />
                <button type="submit" disabled={loading || !baseAmountMultiplier} className="admin-button">
                  Update Amount Multiplier
                </button>
              </div>
            </form>
          </div>

          <div className="multiplier-subsection"> 
            <h5>⛏️ Base Difficulty Multiplier</h5>
            <p className="multiplier-info">Multiplies all PoW difficulties (1.0 = default, 2.0 = double difficulty)</p>
            <form onSubmit={handleBaseDifficultyMultiplierSubmit} className="admin-form">
              <div className="form-row">
                <input
                  type="number"
                  value={baseDifficultyMultiplier}
                  onChange={(e) => setBaseDifficultyMultiplier(e.target.value)}
                  placeholder="Difficulty multiplier (e.g., 0.5 for 0.5x)"
                  className="admin-input"
                  min="0.1"
                  step="0.1"
                />
                <button type="submit" disabled={loading || !baseDifficultyMultiplier} className="admin-button">
                  Update Difficulty Multiplier
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="admin-section">
          <h4>🧪 Direct Withdrawal Test</h4>
          <p className="multiplier-info">Test direct contract interaction bypassing the server (requires completed PoW)</p>
          <button 
            onClick={onDirectWithdrawal}
            disabled={loading || !powComplete}
            className="admin-button direct-withdrawal-button"
          >
            {!powComplete ? 'Complete Mining First' : '🚀 Test Direct Withdrawal'}
          </button>
        </div>
      </div>
    );
  };
  
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
        steps.push(<div key={`line-${i}`} className="progress-line"></div>);
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
              Withdrawals completed: <span className="count">{withdrawalCount}</span> / {maxWithdrawals}
            </p>
            
            <div className="explorer-link-container">
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-button">
                View on {networkConfig.chainName} Explorer
              </a>
            </div>
          </div>
          {withdrawalCount < maxWithdrawals && (
            <div className="messages-container">
              <h3>{isDevFaucet ? 'Step 2: Sign Message to get tokens' : `Sign Message to get 0.1 ${networkConfig.nativeCurrency.symbol}`}</h3>
              <p className="signature-info">A unique signature is required for each withdrawal {isDevFaucet ? '(daily reset)' : '(global 7.5 minute cooldown)'}</p>
              <div className="message-progress">
                {renderProgressSteps()}
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
                  {expectedMessage && expectedMessage !== (isDevFaucet ? DEV_FAUCET_MESSAGES[withdrawalCount] : WITHDRAWAL_MESSAGES[withdrawalCount]) && (
                    <div className="expected-message">
                      <p><strong>Contract expects:</strong> {isDevFaucet ? expectedMessage : expectedMessage.replace("  Also, Earth domain is best.", "")}</p>
                    </div>
                  )}
                  <div>
                    <p className="message-message">
                      {isDevFaucet ? 
                        `Sign the above message to receive ${[5,5,10,15,25,50,75,100][withdrawalCount] || 5} tokens:` :
                        'Sign the above message to receive 0.1 Anime Coin:'
                      }
                    </p>
                  </div>
                  {withdrawalCount === 0 && (
                    <div className="server-info">
                      <p>📡 First withdrawal will use server API at {
                        isLocalhost 
                          ? (useLocalServer ? 'localhost:5000' : 'faucet.animechain.dev')
                          : 'faucet.animechain.dev'
                      } to pay for gas</p>
                      {isDevFaucet && (
                        <p>💡 <strong>Note:</strong> DevFaucet server supports PoW mining + gas assistance for first withdrawal.</p>
                      )}
                    </div>
                  )}
                  {isDevFaucet && (
                    <div className="dev-faucet-info">
                      <p>⚡ DevFaucet: Proof-of-work mining required for withdrawal</p>
                      <p>💎 Progressive amounts: 5, 5, 10, 15, 25, 50, 75, 100 tokens</p>
                      <p>🔄 Daily reset: Up to 8 withdrawals per 24-hour period</p>
                      <p>⛏️ Difficulty: ~8k+ hashes (est. {
                        withdrawalCount < 4 ? '30s' : 
                        withdrawalCount === 4 ? '1min' : 
                        withdrawalCount === 5 ? '2min' : 
                        withdrawalCount === 6 ? '4min' : '8min'
                      } avg)</p>
                    </div>
                  )}
                  
                  {isDevFaucet && (
                    <div className="pow-mining-container">
                      {!powComplete ? (
                        <div className="pow-mining-section">
                          <h4>Step 1: Mine Proof-of-Work</h4>
                          {!powMining ? (
                            <button
                              onClick={startPowMining}
                              disabled={loading || withdrawalCount >= 8}
                              className="pow-start-button"
                            >
                              ⛏️ Start Mining Proof-of-Work
                            </button>
                          ) : (
                            <div className="pow-mining-status">
                              <div className="mining-spinner">⛏️</div>
                              <p>Mining in progress... ({powProgress.toFixed(1)}%)</p>
                              <div className="pow-progress-bar">
                                <div className="pow-progress-fill" style={{ width: `${powProgress}%` }}></div>
                              </div>
                              <p className="mining-stats">
                                Difficulty: {powData?.difficultyTarget?.toLocaleString() || 'Loading...'} | 
                                Time: {powStartTime ? ((Date.now() - powStartTime) / 1000).toFixed(1) : 0}s
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pow-complete-section">
                          <h4>✅ Proof-of-Work Complete!</h4>
                          <div className="pow-success-info">
                            <p>🎯 <strong>Valid hash found!</strong></p>
                            <p>⛏️ Nonce: {powData?.nonce?.toLocaleString()}</p>
                            <p>⏱️ Mining time: {powData?.miningTime?.toFixed(2)}s</p>
                            <p>🔗 Hash: {powData?.powHash?.substring(0, 10)}...{powData?.powHash?.substring(powData.powHash.length - 6)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="actions-container">
            <button
              onClick={handleWithdraw}
              disabled={loading || serverLoading || Number(cooldown) > 0 || (isDevFaucet ? (withdrawalCount >= 8 || !powComplete) : withdrawalCount >= 3)}
              className={`action-button ${isDevFaucet && powComplete ? 'pow-ready' : ''}`}
            >
              {loading ? 'Processing...' :
                serverLoading ? 'Sending to Server...' :
                isDevFaucet && withdrawalCount >= 8 ? 'Daily limit reached (8/8)' :
                !isDevFaucet && withdrawalCount >= 3 ? 'Maximum withdrawals reached (3/3)' :
                Number(cooldown) > 0 ? `Faucet available in ${formatCooldown()}` :
                isDevFaucet && !powComplete ? 'Complete Mining First (Step 1)' :
                isDevFaucet && powComplete ? '🎯 PoW Hash Found! Get Faucet Anime' :
                withdrawalCount === 0 ? `Sign & Request via Server (First Withdrawal)` :
                `Sign & Request 0.1 ${networkConfig.nativeCurrency.symbol} Directly`}
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
                    loading={adminLoading}
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
          flex-wrap: wrap;
          gap: 2px;
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
          font-size: 12px;
        }
        
        .progress-step.current {
          background-color: #6c5ce7;
        }
        
        .progress-step.completed {
          background-color: #4cd137;
        }
        
        .progress-line {
          height: 3px;
          width: ${isDevFaucet ? '15px' : '60px'};
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
        
        .server-testing {
          background-color: #1e1e1e;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 2px solid #ff9800;
        }
        
        .server-testing h3 {
          margin-top: 0;
          color: #ff9800;
          font-size: 16px;
        }
        
        .server-info-text {
          margin: 10px 0 0 0;
          font-size: 13px;
          color: #aaa;
        }
        
        .server-toggle-container {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .server-toggle-button {
          background-color: #333;
          color: #ccc;
          padding: 10px 15px;
          border: 2px solid #555;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: bold;
          flex: 1;
          transition: all 0.3s;
          text-align: center;
        }
        
        .server-toggle-button.active {
          background-color: #ff9800;
          color: white;
          border-color: #ff9800;
        }
        
        .server-toggle-button:hover:not(.active) {
          background-color: #444;
          border-color: #666;
        }
        
        .success-message {
          color: #4cd137;
          margin-top: 15px;
          padding: 10px;
          background-color: rgba(76, 209, 55, 0.1);
          border-radius: 6px;
          border-left: 3px solid #4cd137;
        }
        
        .pow-mining-container {
          background-color: #2d2d2d;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border: 2px solid #ff9800;
        }
        
        .pow-mining-section h4,
        .pow-complete-section h4 {
          margin: 0 0 15px 0;
          color: #ff9800;
          font-size: 16px;
        }
        
        .pow-start-button {
          background-color: #ff9800;
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
        
        .pow-start-button:hover:not(:disabled) {
          background-color: #f57c00;
        }
        
        .pow-start-button:disabled {
          background-color: #666;
          cursor: not-allowed;
        }
        
        .pow-mining-status {
          text-align: center;
        }
        
        .mining-spinner {
          font-size: 24px;
          animation: spin 2s linear infinite;
          margin-bottom: 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .pow-progress-bar {
          width: 100%;
          height: 12px;
          background-color: #444;
          border-radius: 6px;
          overflow: hidden;
          margin: 10px 0;
        }
        
        .pow-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff9800, #ffc107);
          border-radius: 6px;
          transition: width 0.3s ease;
        }
        
        .mining-stats {
          font-size: 12px;
          color: #aaa;
          margin-top: 10px;
        }
        
        .pow-complete-section {
          text-align: center;
        }
        
        .pow-success-info {
          background-color: #1e3a1e;
          border: 1px solid #4cd137;
          border-radius: 6px;
          padding: 15px;
          margin-top: 10px;
        }
        
        .pow-success-info p {
          margin: 5px 0;
          font-size: 14px;
          color: #ddd;
        }
        
        .pow-success-info strong {
          color: #4cd137;
        }
        
        .action-button.pow-ready {
          background: linear-gradient(45deg, #4cd137, #2ed573);
          animation: glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
          from {
            box-shadow: 0 0 5px #4cd137;
          }
          to {
            box-shadow: 0 0 20px #4cd137, 0 0 30px #4cd137;
          }
        }
        
        .action-button.pow-ready:hover {
          background: linear-gradient(45deg, #2ed573, #20bf6b);
        }
        
        .admin-panel {
          background-color: #1e1e1e;
          border: 2px solid #ff6b35;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }
        
        .admin-header {
          text-align: center;
          margin-bottom: 15px;
        }
        
        .admin-header h3 {
          color: #ff6b35;
          margin: 0 0 10px 0;
        }
        
        .admin-info {
          color: #aaa;
          font-size: 14px;
          margin: 0 0 15px 0;
        }
        
        .admin-toggle-button {
          background-color: #ff6b35;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: background-color 0.3s;
        }
        
        .admin-toggle-button:hover {
          background-color: #e55a30;
        }
        
        .admin-content {
          margin-top: 15px;
        }
        
        .admin-panel-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .admin-section {
          background-color: #2d2d2d;
          padding: 15px;
          border-radius: 6px;
          border-left: 3px solid #ff6b35;
        }
        
        .admin-section h4 {
          margin: 0 0 15px 0;
          color: #ff6b35;
          font-size: 16px;
        }
        
        .admin-form {
          width: 100%;
        }
        
        .form-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .admin-select, .admin-input {
          background-color: #3d3d3d;
          color: white;
          border: 1px solid #555;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 14px;
          flex: 1;
          min-width: 120px;
        }
        
        .admin-select:focus, .admin-input:focus {
          outline: none;
          border-color: #ff6b35;
        }
        
        .admin-button {
          background-color: #ff6b35;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          white-space: nowrap;
          transition: background-color 0.3s;
        }
        
        .admin-button:hover:not(:disabled) {
          background-color: #e55a30;
        }
        
        .admin-button:disabled {
          background-color: #666;
          cursor: not-allowed;
        }
        
        .admin-error {
          color: #ff5252;
          margin-top: 15px;
          padding: 10px;
          background-color: rgba(255, 82, 82, 0.1);
          border-radius: 6px;
          border-left: 3px solid #ff5252;
          font-size: 14px;
        }
        
        .admin-success {
          color: #4cd137;
          margin-top: 15px;
          padding: 10px;
          background-color: rgba(76, 209, 55, 0.1);
          border-radius: 6px;
          border-left: 3px solid #4cd137;
          font-size: 14px;
        }
        
        .multiplier-section {
          background: linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 100%);
          border-left: 3px solid #00d4ff;
        }
        
        .multiplier-subsection {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #3d3d3d;
          border-radius: 6px;
          border: 1px solid #555;
        }
        
        .multiplier-subsection:last-child {
          margin-bottom: 0;
        }
        
        .multiplier-subsection h5 {
          margin: 0 0 10px 0;
          color: #00d4ff;
          font-size: 14px;
          font-weight: bold;
        }
        
        .multiplier-info {
          margin: 0 0 15px 0;
          font-size: 12px;
          color: #bbb;
          font-style: italic;
        }
        
        .multiplier-section h4 {
          color: #00d4ff;
          margin-bottom: 20px;
        }
        
        .direct-withdrawal-button {
          background: linear-gradient(45deg, #ff6b35, #ff8f65);
          color: white;
          font-weight: bold;
          width: 100%;
          padding: 12px 20px;
          margin-top: 10px;
          transition: all 0.3s;
        }
        
        .direct-withdrawal-button:hover:not(:disabled) {
          background: linear-gradient(45deg, #e55a30, #ff7050);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(255, 107, 53, 0.3);
        }
        
        .direct-withdrawal-button:disabled {
          background: #666;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        @media (max-width: 600px) {
          .form-row {
            flex-direction: column;
            align-items: stretch;
          }
          
          .admin-select, .admin-input, .admin-button {
            width: 100%;
          }
          
          .multiplier-subsection {
            margin-bottom: 15px;
          }
        }
      `}</style>
    </div>
  );
}

export default Faucet;