import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// EIP712DebugContract ABI
const EIP712_DEBUG_ABI = [
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_domain_separator",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_message_hash",
    "inputs": [
      {"name": "_recipient", "type": "address"},
      {"name": "_chosen_block_hash", "type": "bytes32"},
      {"name": "_withdrawal_index", "type": "uint256"},
      {"name": "_ip_address", "type": "bytes32"},
      {"name": "_nonce", "type": "uint256"},
      {"name": "_message", "type": "string"}
    ],
    "outputs": [{"name": "", "type": "bytes32"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_typed_data_hash",
    "inputs": [
      {"name": "_recipient", "type": "address"},
      {"name": "_chosen_block_hash", "type": "bytes32"},
      {"name": "_withdrawal_index", "type": "uint256"},
      {"name": "_ip_address", "type": "bytes32"},
      {"name": "_nonce", "type": "uint256"},
      {"name": "_message", "type": "string"}
    ],
    "outputs": [{"name": "", "type": "bytes32"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "recover_signer",
    "inputs": [
      {"name": "_recipient", "type": "address"},
      {"name": "_chosen_block_hash", "type": "bytes32"},
      {"name": "_withdrawal_index", "type": "uint256"},
      {"name": "_ip_address", "type": "bytes32"},
      {"name": "_nonce", "type": "uint256"},
      {"name": "_message", "type": "string"},
      {"name": "_v", "type": "uint256"},
      {"name": "_r", "type": "bytes32"},
      {"name": "_s", "type": "bytes32"}
    ],
    "outputs": [{"name": "", "type": "address"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "debug_all_hashes",
    "inputs": [
      {"name": "_recipient", "type": "address"},
      {"name": "_chosen_block_hash", "type": "bytes32"},
      {"name": "_withdrawal_index", "type": "uint256"},
      {"name": "_ip_address", "type": "bytes32"},
      {"name": "_nonce", "type": "uint256"},
      {"name": "_message", "type": "string"},
      {"name": "_v", "type": "uint256"},
      {"name": "_r", "type": "bytes32"},
      {"name": "_s", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "", "type": "bytes32"},
      {"name": "", "type": "bytes32"},
      {"name": "", "type": "bytes32"},
      {"name": "", "type": "address"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "uint256"}
    ]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "test_devfaucet_signature_verification",
    "inputs": [
      {"name": "_recipient", "type": "address"},
      {"name": "_chosen_block_hash", "type": "bytes32"},
      {"name": "_withdrawal_index", "type": "uint256"},
      {"name": "_ip_address", "type": "bytes32"},
      {"name": "_message", "type": "string"},
      {"name": "_v", "type": "uint256"},
      {"name": "_r", "type": "bytes32"},
      {"name": "_s", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "", "type": "bool"},
      {"name": "", "type": "bytes32"},
      {"name": "", "type": "address"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "bytes32"},
      {"name": "", "type": "bytes32"}
    ]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "compare_nonce_signatures",
    "inputs": [
      {"name": "_recipient", "type": "address"},
      {"name": "_chosen_block_hash", "type": "bytes32"},
      {"name": "_withdrawal_index", "type": "uint256"},
      {"name": "_ip_address", "type": "bytes32"},
      {"name": "_passed_nonce", "type": "uint256"},
      {"name": "_message", "type": "string"},
      {"name": "_v", "type": "uint256"},
      {"name": "_r", "type": "bytes32"},
      {"name": "_s", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "", "type": "bool"},
      {"name": "", "type": "bool"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "address"},
      {"name": "", "type": "address"},
      {"name": "", "type": "bytes32"},
      {"name": "", "type": "bytes32"}
    ]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_domain_type_hash",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_name_hash",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_version_hash",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_message_type_hash",
    "inputs": [],
    "outputs": [{"name": "", "type": "bytes32"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_chain_id",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "get_contract_address",
    "inputs": [],
    "outputs": [{"name": "", "type": "address"}]
  },
  {
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "set_nonce",
    "inputs": [
      {"name": "_user", "type": "address"},
      {"name": "_nonce", "type": "uint256"}
    ],
    "outputs": []
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "nonce",
    "inputs": [{"name": "arg0", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "stateMutability": "view",
    "type": "function",
    "name": "devfaucet_address",
    "inputs": [],
    "outputs": [{"name": "", "type": "address"}]
  },
  {
    "stateMutability": "nonpayable",
    "type": "constructor",
    "inputs": [{"name": "_devfaucet_address", "type": "address"}],
    "outputs": []
  }
];

// TODO: Replace with actual deployed debug contract address
const DEBUG_CONTRACT_ADDRESS = "0xa2F227F46A91428A33d2fc9257cEac025335957f"; // PLACEHOLDER - UPDATE AFTER DEPLOYMENT

function EIP712DebugPanel({ contractAddress, provider, account, network }) {
  const [debugData, setDebugData] = useState({
    // Domain parameters
    domainName: 'DevFaucet',
    domainVersion: '1',
    chainId: 6900,
    verifyingContract: contractAddress || '0xf0D4061DB5330a3785DCb0705eE0565338311d4B',
    
    // Message parameters
    recipient: account || '0x2D68643fC11D8952324ca051fFa5c7DB5F9219D8',
    chosenBlockHash: '0x6a77e8738f9c4c3e133e98bd7e5ba23a85d422e4c315e0c529437597305629fa',
    withdrawalIndex: 1,
    ipAddress: '0x9109a121651aab043dae84379c12c9dc1f17da6929cd79892c0e872fa5c0249d',
    nonce: 0,
    message: 'Ill use this ANIME coin to build something on ANIME chain.  Also, Earth domain is best.'
  });

  const [results, setResults] = useState({
    domainSeparator: '',
    messageHash: '',
    typedDataHash: '',
    signature: '',
    recoveredAddress: '',
    signatureComponents: { v: '', r: '', s: '' },
    verificationStatus: '',
    contractNonce: '',
    contractResults: null,
    contractComparison: null,
    contractDebugResults: null,
    domainComponentComparison: null,
    errors: []
  });

  const [isLoading, setIsLoading] = useState(false);

  // Update contract address when prop changes
  useEffect(() => {
    if (contractAddress) {
      setDebugData(prev => ({ ...prev, verifyingContract: contractAddress }));
    }
  }, [contractAddress]);

  // Update account when prop changes
  useEffect(() => {
    if (account) {
      setDebugData(prev => ({ ...prev, recipient: account }));
    }
  }, [account]);

  // EIP-712 Domain and Types definitions
  const getDomain = () => ({
    name: debugData.domainName,
    version: debugData.domainVersion,
    chainId: parseInt(debugData.chainId),
    verifyingContract: debugData.verifyingContract
  });

  const getTypes = () => ({
    WithdrawalRequest: [
      { name: 'recipient', type: 'address' },
      { name: 'chosenBlockHash', type: 'bytes32' },
      { name: 'withdrawalIndex', type: 'uint256' },
      { name: 'ipAddress', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'message', type: 'string' }
    ]
  });

  const getMessage = () => ({
    recipient: debugData.recipient,
    chosenBlockHash: debugData.chosenBlockHash,
    withdrawalIndex: parseInt(debugData.withdrawalIndex),
    ipAddress: debugData.ipAddress,
    nonce: parseInt(debugData.nonce),
    message: debugData.message
  });

  // Step 1: Compute Domain Separator
  const computeDomainSeparator = async () => {
    try {
      const domain = getDomain();
      console.log('🔍 Computing Domain Separator with:', domain);
      
      // Manually compute domain separator hash for verification
      const domainTypeHash = ethers.keccak256(
        ethers.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
      );
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(domain.name));
      const versionHash = ethers.keccak256(ethers.toUtf8Bytes(domain.version));
      
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [domainTypeHash, nameHash, versionHash, domain.chainId, domain.verifyingContract]
      );
      
      const domainSeparator = ethers.keccak256(encoded);
      
      setResults(prev => ({
        ...prev,
        domainSeparator,
        errors: prev.errors.filter(e => !e.includes('Domain'))
      }));
      
      console.log('✅ Domain Separator:', domainSeparator);
      return domainSeparator;
    } catch (error) {
      console.error('❌ Domain Separator Error:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Domain Separator Error: ${error.message}`]
      }));
      return null;
    }
  };

  // Step 2: Compute Message Hash  
  const computeMessageHash = async () => {
    try {
      const types = getTypes();
      const message = getMessage();
      
      console.log('🔍 Computing Message Hash with:', { types, message });
      
      // Manually compute message type hash
      const messageTypeHash = ethers.keccak256(
        ethers.toUtf8Bytes('WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)')
      );
      
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message.message));
      
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'bytes32', 'uint256', 'bytes32', 'uint256', 'bytes32'],
        [
          messageTypeHash,
          message.recipient,
          message.chosenBlockHash,
          message.withdrawalIndex,
          message.ipAddress,
          message.nonce,
          messageHash
        ]
      );
      
      const structHash = ethers.keccak256(encoded);
      
      setResults(prev => ({
        ...prev,
        messageHash: structHash,
        errors: prev.errors.filter(e => !e.includes('Message'))
      }));
      
      console.log('✅ Message Hash:', structHash);
      return structHash;
    } catch (error) {
      console.error('❌ Message Hash Error:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Message Hash Error: ${error.message}`]
      }));
      return null;
    }
  };

  // Step 3: Compute Full Typed Data Hash
  const computeTypedDataHash = async () => {
    try {
      const domainSeparator = await computeDomainSeparator();
      const messageHash = await computeMessageHash();
      
      if (!domainSeparator || !messageHash) {
        throw new Error('Failed to compute domain separator or message hash');
      }
      
      // Compute final typed data hash
      const typedDataHash = ethers.keccak256(
        ethers.concat([
          ethers.toUtf8Bytes('\x19\x01'),
          domainSeparator,
          messageHash
        ])
      );
      
      setResults(prev => ({
        ...prev,
        typedDataHash,
        errors: prev.errors.filter(e => !e.includes('TypedData'))
      }));
      
      console.log('✅ Typed Data Hash:', typedDataHash);
      return typedDataHash;
    } catch (error) {
      console.error('❌ Typed Data Hash Error:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Typed Data Hash Error: ${error.message}`]
      }));
      return null;
    }
  };

  // Step 4: Sign Message with Wallet
  const signMessage = async () => {
    if (!provider || !account) {
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, 'Wallet not connected']
      }));
      return;
    }

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const domain = getDomain();
      const types = getTypes();
      const message = getMessage();
      
      console.log('🔍 Signing with wallet:', { domain, types, message });
      
      // Sign using ethers.js
      const signature = await signer.signTypedData(domain, types, message);
      const sig = ethers.Signature.from(signature);
      
      setResults(prev => ({
        ...prev,
        signature,
        signatureComponents: {
          v: sig.v,
          r: sig.r,
          s: sig.s
        },
        errors: prev.errors.filter(e => !e.includes('Signature'))
      }));
      
      console.log('✅ Signature:', signature);
      console.log('✅ Components:', { v: sig.v, r: sig.r, s: sig.s });
      
      return signature;
    } catch (error) {
      console.error('❌ Signature Error:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Signature Error: ${error.message}`]
      }));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: Verify Signature Recovery
  const verifySignature = async () => {
    try {
      const domain = getDomain();
      const types = getTypes();
      const message = getMessage();
      
      if (!results.signature) {
        throw new Error('No signature to verify');
      }
      
      console.log('🔍 Verifying signature:', results.signature);
      
      // Verify using ethers.js
      const recoveredAddress = ethers.verifyTypedData(domain, types, message, results.signature);
      
      const isValid = recoveredAddress.toLowerCase() === debugData.recipient.toLowerCase();
      
      setResults(prev => ({
        ...prev,
        recoveredAddress,
        verificationStatus: isValid ? 'VALID ✅' : 'INVALID ❌',
        errors: prev.errors.filter(e => !e.includes('Verification'))
      }));
      
      console.log('✅ Recovered Address:', recoveredAddress);
      console.log('✅ Expected Address:', debugData.recipient);
      console.log('✅ Verification Status:', isValid ? 'VALID' : 'INVALID');
      
      return { recoveredAddress, isValid };
    } catch (error) {
      console.error('❌ Verification Error:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Verification Error: ${error.message}`]
      }));
      return null;
    }
  };

  // Step 6: Fetch Contract Nonce
  const fetchContractNonce = async () => {
    if (!provider || !debugData.verifyingContract) {
      return;
    }

    try {
      const contract = new ethers.Contract(
        debugData.verifyingContract,
        ['function nonce(address) view returns (uint256)'],
        provider
      );
      
      const contractNonce = await contract.nonce(debugData.recipient);
      
      setResults(prev => ({
        ...prev,
        contractNonce: contractNonce.toString(),
        errors: prev.errors.filter(e => !e.includes('Contract'))
      }));
      
      console.log('✅ Contract Nonce:', contractNonce.toString());
      
      // Check if nonces match
      if (contractNonce.toString() !== debugData.nonce.toString()) {
        setResults(prev => ({
          ...prev,
          errors: [...prev.errors, `Nonce Mismatch: Contract has ${contractNonce}, using ${debugData.nonce}`]
        }));
      }
      
      return contractNonce.toString();
    } catch (error) {
      console.error('❌ Contract Nonce Error:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Contract Nonce Error: ${error.message}`]
      }));
      return null;
    }
  };

  // Run All Steps
  const runFullDebug = async () => {
    setIsLoading(true);
    setResults(prev => ({ ...prev, errors: [] }));
    
    try {
      console.log('🚀 Starting Full EIP-712 Debug Process...');
      
      await computeDomainSeparator();
      await computeMessageHash();
      await computeTypedDataHash();
      await fetchContractNonce();
      const signature = await signMessage();
      if (signature) {
        await verifySignature();
      }
      
      console.log('🎉 Full debug process completed!');
    } catch (error) {
      console.error('❌ Full Debug Error:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Full Debug Error: ${error.message}`]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setDebugData(prev => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    console.log(`📋 Copied ${label} to clipboard:`, text);
  };

  // Get debug contract instance
  const getDebugContract = () => {
    if (!provider || DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      throw new Error('Debug contract not deployed or provider not available');
    }
    return new ethers.Contract(DEBUG_CONTRACT_ADDRESS, EIP712_DEBUG_ABI, provider);
  };

  // Test individual domain components
  const testDomainComponents = async () => {
    try {
      console.log('🧪 Testing individual domain components...');
      setIsLoading(true);
      
      if (DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error('Debug contract address not set.');
      }

      const debugContract = getDebugContract();
      
      // Get individual components from contract
      const contractDomainTypeHash = await debugContract.get_domain_type_hash();
      const contractNameHash = await debugContract.get_name_hash();
      const contractVersionHash = await debugContract.get_version_hash();
      const contractChainId = await debugContract.get_chain_id();
      const contractAddress = await debugContract.get_contract_address();
      
      // Compute manual components
      const manualDomainTypeHash = ethers.keccak256(ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"));
      const manualNameHash = ethers.keccak256(ethers.toUtf8Bytes(debugData.domainName));
      const manualVersionHash = ethers.keccak256(ethers.toUtf8Bytes(debugData.domainVersion));
      
      const comparison = {
        domainTypeHash: {
          manual: manualDomainTypeHash,
          contract: contractDomainTypeHash,
          match: manualDomainTypeHash === contractDomainTypeHash
        },
        nameHash: {
          manual: manualNameHash,
          contract: contractNameHash,
          match: manualNameHash === contractNameHash
        },
        versionHash: {
          manual: manualVersionHash,
          contract: contractVersionHash,
          match: manualVersionHash === contractVersionHash
        },
        chainId: {
          manual: debugData.chainId,
          contract: contractChainId.toString(),
          match: debugData.chainId.toString() === contractChainId.toString()
        },
        verifyingContract: {
          manual: debugData.verifyingContract.toLowerCase(),
          contract: contractAddress.toLowerCase(),
          match: debugData.verifyingContract.toLowerCase() === contractAddress.toLowerCase()
        }
      };
      
      console.log('🔍 Domain Component Comparison:', comparison);
      
      setResults(prev => ({
        ...prev,
        domainComponentComparison: comparison
      }));
      
    } catch (error) {
      console.error('❌ Domain component test failed:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Domain component test failed: ${error.message}`]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Call debug contract to get all hashes at once
  const callDebugContract = async () => {
    try {
      console.log('🔧 Calling debug contract...');
      setIsLoading(true);
      
      if (DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error('Debug contract address not set. Please deploy the contract and update DEBUG_CONTRACT_ADDRESS.');
      }

      const debugContract = getDebugContract();
      
      // Call debug_all_hashes with current parameters
      const debugResult = await debugContract.debug_all_hashes(
        debugData.recipient,
        debugData.chosenBlockHash,
        debugData.withdrawalIndex,
        debugData.ipAddress,
        debugData.nonce,
        debugData.message,
        results.signatureComponents.v || 0,
        results.signatureComponents.r || '0x0000000000000000000000000000000000000000000000000000000000000000',
        results.signatureComponents.s || '0x0000000000000000000000000000000000000000000000000000000000000000'
      );
      
      // Parse results: [domainSeparator, messageHash, typedDataHash, recoveredSigner, chainId, contractNonce]
      const contractResults = {
        domainSeparator: debugResult[0],
        messageHash: debugResult[1],
        typedDataHash: debugResult[2],
        recoveredSigner: debugResult[3],
        chainId: debugResult[4].toString(),
        contractNonce: debugResult[5].toString()
      };
      
      console.log('✅ Debug contract results:', contractResults);
      
      setResults(prev => ({
        ...prev,
        contractDebugResults: contractResults
      }));
      
    } catch (error) {
      console.error('❌ Debug contract call failed:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Debug contract call failed: ${error.message}`]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Compare nonce signatures using debug contract
  const compareNonceSignatures = async () => {
    try {
      console.log('🔍 Comparing nonce signatures via debug contract...');
      setIsLoading(true);
      
      if (DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error('Debug contract address not set.');
      }

      const debugContract = getDebugContract();
      
      // Call compare_nonce_signatures
      const comparisonResult = await debugContract.compare_nonce_signatures(
        debugData.recipient,
        debugData.chosenBlockHash,
        debugData.withdrawalIndex,
        debugData.ipAddress,
        debugData.nonce, // passed nonce
        debugData.message,
        results.signatureComponents.v || 0,
        results.signatureComponents.r || '0x0000000000000000000000000000000000000000000000000000000000000000',
        results.signatureComponents.s || '0x0000000000000000000000000000000000000000000000000000000000000000'
      );
      
      // Parse results: [validWithPassed, validWithStored, passedNonce, storedNonce, recoveredWithPassed, recoveredWithStored, typedDataHashPassed, typedDataHashStored]
      const comparison = {
        validWithPassedNonce: comparisonResult[0],
        validWithStoredNonce: comparisonResult[1],
        passedNonce: comparisonResult[2].toString(),
        storedNonce: comparisonResult[3].toString(),
        recoveredWithPassed: comparisonResult[4],
        recoveredWithStored: comparisonResult[5],
        typedDataHashPassed: comparisonResult[6],
        typedDataHashStored: comparisonResult[7]
      };
      
      console.log('✅ Nonce comparison results:', comparison);
      
      setResults(prev => ({
        ...prev,
        contractComparison: comparison
      }));
      
    } catch (error) {
      console.error('❌ Nonce comparison failed:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `Nonce comparison failed: ${error.message}`]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Test DevFaucet signature verification exactly
  const testDevFaucetSignature = async () => {
    try {
      console.log('🎯 Testing DevFaucet signature verification...');
      setIsLoading(true);
      
      if (DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error('Debug contract address not set.');
      }

      const debugContract = getDebugContract();
      
      // Call test_devfaucet_signature_verification (uses stored nonce like DevFaucet)
      const testResult = await debugContract.test_devfaucet_signature_verification(
        debugData.recipient,
        debugData.chosenBlockHash,
        debugData.withdrawalIndex,
        debugData.ipAddress,
        debugData.message,
        results.signatureComponents.v || 0,
        results.signatureComponents.r || '0x0000000000000000000000000000000000000000000000000000000000000000',
        results.signatureComponents.s || '0x0000000000000000000000000000000000000000000000000000000000000000'
      );
      
      // Parse results: [signatureValid, typedDataHash, recoveredSigner, storedNonce, domainSeparator, messageHash]
      const devFaucetTest = {
        signatureValid: testResult[0],
        typedDataHash: testResult[1],
        recoveredSigner: testResult[2],
        storedNonce: testResult[3].toString(),
        domainSeparator: testResult[4],
        messageHash: testResult[5]
      };
      
      console.log('✅ DevFaucet signature test results:', devFaucetTest);
      
      setResults(prev => ({
        ...prev,
        contractResults: devFaucetTest
      }));
      
    } catch (error) {
      console.error('❌ DevFaucet signature test failed:', error);
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, `DevFaucet signature test failed: ${error.message}`]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #007bff', 
      borderRadius: '10px', 
      backgroundColor: '#f8f9fa',
      margin: '20px 0'
    }}>
      <h2 style={{ color: '#007bff', marginBottom: '20px' }}>🔍 EIP-712 Signature Debug Panel</h2>
      
      {/* Domain Parameters */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🏷️ Domain Parameters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label>Name:</label>
            <input 
              type="text" 
              value={debugData.domainName}
              onChange={(e) => handleInputChange('domainName', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Version:</label>
            <input 
              type="text" 
              value={debugData.domainVersion}
              onChange={(e) => handleInputChange('domainVersion', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Chain ID:</label>
            <input 
              type="number" 
              value={debugData.chainId}
              onChange={(e) => handleInputChange('chainId', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Contract Address:</label>
            <input 
              type="text" 
              value={debugData.verifyingContract}
              onChange={(e) => handleInputChange('verifyingContract', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
        </div>
      </div>

      {/* Message Parameters */}
      <div style={{ marginBottom: '20px' }}>
        <h3>📝 Message Parameters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label>Recipient:</label>
            <input 
              type="text" 
              value={debugData.recipient}
              onChange={(e) => handleInputChange('recipient', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Chosen Block Hash:</label>
            <input 
              type="text" 
              value={debugData.chosenBlockHash}
              onChange={(e) => handleInputChange('chosenBlockHash', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Withdrawal Index:</label>
            <input 
              type="number" 
              value={debugData.withdrawalIndex}
              onChange={(e) => handleInputChange('withdrawalIndex', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>IP Address Hash:</label>
            <input 
              type="text" 
              value={debugData.ipAddress}
              onChange={(e) => handleInputChange('ipAddress', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Nonce:</label>
            <input 
              type="number" 
              value={debugData.nonce}
              onChange={(e) => handleInputChange('nonce', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Message:</label>
            <textarea 
              value={debugData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              style={{ width: '100%', padding: '5px', height: '60px' }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🔧 Debug Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={computeDomainSeparator} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
            1. Compute Domain Separator
          </button>
          <button onClick={computeMessageHash} style={{ padding: '10px 15px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '5px' }}>
            2. Compute Message Hash
          </button>
          <button onClick={computeTypedDataHash} style={{ padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}>
            3. Compute Typed Data Hash
          </button>
          <button onClick={fetchContractNonce} style={{ padding: '10px 15px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px' }}>
            4. Fetch Contract Nonce
          </button>
          <button onClick={signMessage} disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#fd7e14', color: 'white', border: 'none', borderRadius: '5px' }}>
            5. Sign Message
          </button>
          <button onClick={verifySignature} style={{ padding: '10px 15px', backgroundColor: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px' }}>
            6. Verify Signature
          </button>
          <button onClick={runFullDebug} disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
            🚀 Run Full Debug
          </button>
        </div>
      </div>

      {/* Contract Debug Actions */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🔗 Contract Debug Actions</h3>
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #dee2e6', marginBottom: '10px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6c757d' }}>
            📍 <strong>Debug Contract Address:</strong> {DEBUG_CONTRACT_ADDRESS}
            {DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" && (
              <span style={{ color: '#dc3545', fontWeight: 'bold' }}> ⚠️ NOT DEPLOYED</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={callDebugContract} 
            disabled={isLoading || DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"}
            style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            🔧 Call Debug Contract
          </button>
          <button 
            onClick={compareNonceSignatures} 
            disabled={isLoading || DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"}
            style={{ padding: '10px 15px', backgroundColor: '#20c997', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            🔍 Compare Nonce Signatures
          </button>
          <button 
            onClick={testDevFaucetSignature} 
            disabled={isLoading || DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"}
            style={{ padding: '10px 15px', backgroundColor: '#6610f2', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            🎯 Test DevFaucet Signature
          </button>
          <button 
            onClick={testDomainComponents} 
            disabled={isLoading || DEBUG_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"}
            style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            🧪 Test Domain Components
          </button>
        </div>
      </div>

      {/* Results Display - Side by Side Comparison */}
      {(results.domainSeparator || results.contractDebugResults) && (
        <div style={{ marginBottom: '20px' }}>
          <h3>📊 Results Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Manual/Off-chain Results */}
            <div>
              <h4 style={{ color: '#007bff', marginBottom: '15px' }}>🧮 Off-chain (Manual) Results</h4>
              <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', border: '2px solid #007bff' }}>
                {results.domainSeparator && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#333' }}>Domain Separator:</strong>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', padding: '5px', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6' }}>
                      {results.domainSeparator}
                      <button onClick={() => copyToClipboard(results.domainSeparator, 'Domain Separator')} style={{ marginLeft: '10px', padding: '2px 8px' }}>📋</button>
                    </div>
                  </div>
                )}
                
                {results.messageHash && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#333' }}>Message Hash:</strong>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', padding: '5px', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6' }}>
                      {results.messageHash}
                      <button onClick={() => copyToClipboard(results.messageHash, 'Message Hash')} style={{ marginLeft: '10px', padding: '2px 8px' }}>📋</button>
                    </div>
                  </div>
                )}
                
                {results.typedDataHash && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#333' }}>Typed Data Hash:</strong>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', padding: '5px', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6' }}>
                      {results.typedDataHash}
                      <button onClick={() => copyToClipboard(results.typedDataHash, 'Typed Data Hash')} style={{ marginLeft: '10px', padding: '2px 8px' }}>📋</button>
                    </div>
                  </div>
                )}
                
                {results.contractNonce && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#333' }}>Contract Nonce:</strong>
                    <span style={{ fontFamily: 'monospace', padding: '5px', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6', marginLeft: '5px' }}>
                      {results.contractNonce}
                    </span>
                  </div>
                )}
                
                {results.signature && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#333' }}>Signature:</strong>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', padding: '5px', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6' }}>
                      {results.signature}
                      <button onClick={() => copyToClipboard(results.signature, 'Signature')} style={{ marginLeft: '10px', padding: '2px 8px' }}>📋</button>
                    </div>
                    <div style={{ marginTop: '5px' }}>
                      <strong style={{ color: '#333' }}>Components:</strong>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', padding: '5px', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6' }}>
                        <div>v: {results.signatureComponents.v}</div>
                        <div>r: {results.signatureComponents.r}</div>
                        <div>s: {results.signatureComponents.s}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {results.recoveredAddress && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#333' }}>Recovered Address:</strong>
                    <div style={{ fontFamily: 'monospace', padding: '5px', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6' }}>
                      {results.recoveredAddress}
                    </div>
                    <strong style={{ color: '#333' }}>Verification Status:</strong>
                    <span style={{ 
                      padding: '5px 10px', 
                      marginLeft: '10px',
                      backgroundColor: results.verificationStatus.includes('VALID') ? '#d4edda' : '#f8d7da',
                      color: results.verificationStatus.includes('VALID') ? '#155724' : '#721c24',
                      borderRadius: '3px'
                    }}>
                      {results.verificationStatus}
                    </span>
                  </div>
                )}
                
                {!results.domainSeparator && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <p>No manual results yet.</p>
                    <p>Run the manual debug steps above to get off-chain results.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contract/On-chain Results */}
            <div>
              <h4 style={{ color: '#28a745', marginBottom: '15px' }}>🔧 On-chain (Contract) Results</h4>
              <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', border: '2px solid #28a745' }}>
                {results.contractDebugResults ? (
                  <>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#333' }}>Contract Domain Separator:</strong>
                      <div style={{ 
                        fontFamily: 'monospace', 
                        wordBreak: 'break-all', 
                        padding: '5px', 
                        backgroundColor: results.domainSeparator === results.contractDebugResults.domainSeparator ? '#d4edda' : '#f8d7da',
                        color: '#333', 
                        border: '1px solid #dee2e6' 
                      }}>
                        {results.contractDebugResults.domainSeparator}
                        <button onClick={() => copyToClipboard(results.contractDebugResults.domainSeparator, 'Contract Domain Separator')} style={{ marginLeft: '10px', padding: '2px 8px' }}>📋</button>
                        {results.domainSeparator && (
                          <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                            {results.domainSeparator === results.contractDebugResults.domainSeparator ? '✅ MATCH' : '❌ MISMATCH'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#333' }}>Contract Message Hash:</strong>
                      <div style={{ 
                        fontFamily: 'monospace', 
                        wordBreak: 'break-all', 
                        padding: '5px', 
                        backgroundColor: results.messageHash === results.contractDebugResults.messageHash ? '#d4edda' : '#f8d7da',
                        color: '#333', 
                        border: '1px solid #dee2e6' 
                      }}>
                        {results.contractDebugResults.messageHash}
                        <button onClick={() => copyToClipboard(results.contractDebugResults.messageHash, 'Contract Message Hash')} style={{ marginLeft: '10px', padding: '2px 8px' }}>📋</button>
                        {results.messageHash && (
                          <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                            {results.messageHash === results.contractDebugResults.messageHash ? '✅ MATCH' : '❌ MISMATCH'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#333' }}>Contract Typed Data Hash:</strong>
                      <div style={{ 
                        fontFamily: 'monospace', 
                        wordBreak: 'break-all', 
                        padding: '5px', 
                        backgroundColor: results.typedDataHash === results.contractDebugResults.typedDataHash ? '#d4edda' : '#f8d7da',
                        color: '#333', 
                        border: '1px solid #dee2e6' 
                      }}>
                        {results.contractDebugResults.typedDataHash}
                        <button onClick={() => copyToClipboard(results.contractDebugResults.typedDataHash, 'Contract Typed Data Hash')} style={{ marginLeft: '10px', padding: '2px 8px' }}>📋</button>
                        {results.typedDataHash && (
                          <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                            {results.typedDataHash === results.contractDebugResults.typedDataHash ? '✅ MATCH' : '❌ MISMATCH'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#333' }}>Contract Recovered Signer:</strong>
                      <div style={{ 
                        fontFamily: 'monospace', 
                        padding: '5px', 
                        backgroundColor: results.recoveredAddress === results.contractDebugResults.recoveredSigner ? '#d4edda' : '#f8d7da',
                        color: '#333', 
                        border: '1px solid #dee2e6' 
                      }}>
                        {results.contractDebugResults.recoveredSigner}
                        {results.recoveredAddress && (
                          <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                            {results.recoveredAddress === results.contractDebugResults.recoveredSigner ? '✅ MATCH' : '❌ MISMATCH'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#333' }}>Contract Chain ID:</strong> 
                      <span style={{ color: '#333', marginLeft: '5px' }}>{results.contractDebugResults.chainId}</span>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#333' }}>Contract Stored Nonce:</strong> 
                      <span style={{ 
                        fontFamily: 'monospace', 
                        padding: '5px', 
                        backgroundColor: results.contractNonce === results.contractDebugResults.contractNonce ? '#d4edda' : '#f8d7da',
                        color: '#333', 
                        border: '1px solid #dee2e6',
                        marginLeft: '5px' 
                      }}>
                        {results.contractDebugResults.contractNonce}
                        {results.contractNonce && (
                          <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                            {results.contractNonce === results.contractDebugResults.contractNonce ? '✅ MATCH' : '❌ MISMATCH'}
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <p>No contract results yet.</p>
                    <p>Click "🔧 Call Debug Contract" to get on-chain results.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DevFaucet Signature Test Results */}
      {results.contractResults && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🎯 DevFaucet Signature Test Results</h3>
          <div style={{ backgroundColor: results.contractResults.signatureValid ? '#d4edda' : '#f8d7da', padding: '15px', borderRadius: '5px', border: `1px solid ${results.contractResults.signatureValid ? '#c3e6cb' : '#f5c6cb'}` }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>Signature Valid (with stored nonce):</strong>
              <span style={{ 
                padding: '5px 10px', 
                marginLeft: '10px',
                backgroundColor: results.contractResults.signatureValid ? '#155724' : '#721c24',
                color: 'white',
                borderRadius: '3px',
                fontWeight: 'bold'
              }}>
                {results.contractResults.signatureValid ? '✅ VALID' : '❌ INVALID'}
              </span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Contract Stored Nonce Used:</strong> {results.contractResults.storedNonce}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Contract Recovered Signer:</strong>
              <div style={{ fontFamily: 'monospace', padding: '5px', backgroundColor: '#f1f1f1' }}>
                {results.contractResults.recoveredSigner}
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Contract Typed Data Hash:</strong>
              <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', padding: '5px', backgroundColor: '#f1f1f1' }}>
                {results.contractResults.typedDataHash}
                <button onClick={() => copyToClipboard(results.contractResults.typedDataHash, 'Contract Typed Data Hash')} style={{ marginLeft: '10px', padding: '2px 8px' }}>📋</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nonce Comparison Results */}
      {results.contractComparison && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🔍 Nonce Comparison Results</h3>
          <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <h4 style={{ color: '#856404' }}>With Passed Nonce ({results.contractComparison.passedNonce})</h4>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Valid:</strong>
                  <span style={{ 
                    padding: '3px 8px', 
                    marginLeft: '5px',
                    backgroundColor: results.contractComparison.validWithPassedNonce ? '#d4edda' : '#f8d7da',
                    color: results.contractComparison.validWithPassedNonce ? '#155724' : '#721c24',
                    borderRadius: '3px'
                  }}>
                    {results.contractComparison.validWithPassedNonce ? '✅ VALID' : '❌ INVALID'}
                  </span>
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Recovered:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {results.contractComparison.recoveredWithPassed}
                  </div>
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Typed Data Hash:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                    {results.contractComparison.typedDataHashPassed}
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ color: '#856404' }}>With Stored Nonce ({results.contractComparison.storedNonce})</h4>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Valid:</strong>
                  <span style={{ 
                    padding: '3px 8px', 
                    marginLeft: '5px',
                    backgroundColor: results.contractComparison.validWithStoredNonce ? '#d4edda' : '#f8d7da',
                    color: results.contractComparison.validWithStoredNonce ? '#155724' : '#721c24',
                    borderRadius: '3px'
                  }}>
                    {results.contractComparison.validWithStoredNonce ? '✅ VALID' : '❌ INVALID'}
                  </span>
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Recovered:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {results.contractComparison.recoveredWithStored}
                  </div>
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Typed Data Hash:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                    {results.contractComparison.typedDataHashStored}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain Component Comparison */}
      {results.domainComponentComparison && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🧪 Domain Component Analysis</h3>
          <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
            <p style={{ color: '#856404', marginBottom: '15px', fontWeight: 'bold' }}>
              This analysis compares each domain separator component individually to find the exact mismatch:
            </p>
            
            {Object.entries(results.domainComponentComparison).map(([key, data]) => (
              <div key={key} style={{ marginBottom: '15px', padding: '10px', backgroundColor: data.match ? '#d4edda' : '#f8d7da', borderRadius: '5px' }}>
                <h4 style={{ color: '#333', margin: '0 0 10px 0' }}>
                  {key === 'domainTypeHash' ? 'Domain Type Hash' : 
                   key === 'nameHash' ? 'Name Hash' :
                   key === 'versionHash' ? 'Version Hash' :
                   key === 'chainId' ? 'Chain ID' :
                   'Verifying Contract'}
                  <span style={{ 
                    marginLeft: '10px', 
                    padding: '3px 8px', 
                    backgroundColor: data.match ? '#155724' : '#721c24',
                    color: 'white',
                    borderRadius: '3px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {data.match ? '✅ MATCH' : '❌ MISMATCH'}
                  </span>
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <strong style={{ color: '#333' }}>Manual/Off-chain:</strong>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', padding: '5px', backgroundColor: 'rgba(255,255,255,0.7)', color: '#333' }}>
                      {data.manual}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: '#333' }}>Contract/On-chain:</strong>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', padding: '5px', backgroundColor: 'rgba(255,255,255,0.7)', color: '#333' }}>
                      {data.contract}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '5px' }}>
              <p style={{ color: '#0c5460', margin: '0', fontSize: '14px' }}>
                💡 <strong>Fix the mismatched components above</strong> by updating your debug panel parameters to match the contract values, then re-run the domain separator computation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Errors Display */}
      {results.errors.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#dc3545' }}>❌ Errors</h3>
          <div style={{ backgroundColor: '#f8d7da', padding: '10px', borderRadius: '5px', border: '1px solid #f5c6cb' }}>
            {results.errors.map((error, index) => (
              <div key={index} style={{ color: '#721c24', marginBottom: '5px' }}>
                • {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ backgroundColor: '#d1ecf1', padding: '15px', borderRadius: '5px', border: '1px solid #bee5eb' }}>
        <h4 style={{ color: '#0c5460' }}>📋 Debug Instructions:</h4>
        <ol style={{ color: '#0c5460' }}>
          <li><strong>Modify Parameters:</strong> Edit domain and message fields above to match your test case</li>
          <li><strong>Run Individual Steps:</strong> Click each button to debug specific parts of the EIP-712 process</li>
          <li><strong>Compare Results:</strong> Check if computed hashes match what your contract expects</li>
          <li><strong>Run Full Debug:</strong> Execute all steps at once for a complete analysis</li>
          <li><strong>Check Console:</strong> Detailed logs are available in browser console</li>
        </ol>
      </div>
    </div>
  );
}

export default EIP712DebugPanel;