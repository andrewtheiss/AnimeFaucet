#pragma version >0.4.0

# EIP-712 Debug Contract
# This contract exposes all internal EIP-712 computations to help debug signature verification issues
# It mimics the exact behavior of DevFaucet but returns all intermediate values

# Storage for nonce (to mimic DevFaucet behavior)
nonce: public(HashMap[address, uint256])

# Address of the actual DevFaucet contract we're debugging
devfaucet_address: public(address)

@deploy
def __init__(_devfaucet_address: address):
    self.devfaucet_address = _devfaucet_address

# EIP-712 Domain Separator (exactly matching DevFaucet)
@external
@view
def get_domain_separator() -> bytes32:
    return keccak256(concat(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("DevFaucet"),  # Same name as DevFaucet
        keccak256("1"),         # Same version as DevFaucet
        convert(chain.id, bytes32),
        convert(self.devfaucet_address, bytes32)  # Use DevFaucet address, not debug contract address
    ))

# Message Hash computation (exactly matching DevFaucet)
@external
@view
def get_message_hash(
    _recipient: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _nonce: uint256,
    _message: String[103]
) -> bytes32:
    return keccak256(concat(
        keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)"),
        convert(_recipient, bytes32),
        _chosen_block_hash,
        convert(_withdrawal_index, bytes32),
        _ip_address,
        convert(_nonce, bytes32),
        keccak256(_message)
    ))

# Full Typed Data Hash computation (exactly matching DevFaucet)
@external
@view
def get_typed_data_hash(
    _recipient: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _nonce: uint256,
    _message: String[103]
) -> bytes32:
    # Compute domain separator inline
    domain_separator: bytes32 = keccak256(concat(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("DevFaucet"),
        keccak256("1"),
        convert(chain.id, bytes32),
        convert(self.devfaucet_address, bytes32)
    ))
    
    # Compute message hash inline
    message_hash: bytes32 = keccak256(concat(
        keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)"),
        convert(_recipient, bytes32),
        _chosen_block_hash,
        convert(_withdrawal_index, bytes32),
        _ip_address,
        convert(_nonce, bytes32),
        keccak256(_message)
    ))
    
    return keccak256(concat(
        b"\x19\x01",
        domain_separator,
        message_hash
    ))

# Test signature recovery (exactly matching DevFaucet)
@external
@view
def recover_signer(
    _recipient: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _nonce: uint256,
    _message: String[103],
    _v: uint256,
    _r: bytes32,
    _s: bytes32
) -> address:
    # Compute typed data hash inline
    domain_separator: bytes32 = keccak256(concat(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("DevFaucet"),
        keccak256("1"),
        convert(chain.id, bytes32),
        convert(self.devfaucet_address, bytes32)
    ))
    
    message_hash: bytes32 = keccak256(concat(
        keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)"),
        convert(_recipient, bytes32),
        _chosen_block_hash,
        convert(_withdrawal_index, bytes32),
        _ip_address,
        convert(_nonce, bytes32),
        keccak256(_message)
    ))
    
    typed_data_hash: bytes32 = keccak256(concat(
        b"\x19\x01",
        domain_separator,
        message_hash
    ))
    
    return ecrecover(typed_data_hash, _v, _r, _s)

# Get all hash components in one call for easy debugging
@external
@view
def debug_all_hashes(
    _recipient: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _nonce: uint256,
    _message: String[103],
    _v: uint256,
    _r: bytes32,
    _s: bytes32
) -> (bytes32, bytes32, bytes32, address, uint256, uint256):
    # Compute domain separator
    domain_separator: bytes32 = keccak256(concat(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("DevFaucet"),
        keccak256("1"),
        convert(chain.id, bytes32),
        convert(self.devfaucet_address, bytes32)
    ))
    
    # Compute message hash
    message_hash: bytes32 = keccak256(concat(
        keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)"),
        convert(_recipient, bytes32),
        _chosen_block_hash,
        convert(_withdrawal_index, bytes32),
        _ip_address,
        convert(_nonce, bytes32),
        keccak256(_message)
    ))
    
    # Compute typed data hash
    typed_data_hash: bytes32 = keccak256(concat(
        b"\x19\x01",
        domain_separator,
        message_hash
    ))
    
    # Recover signer
    recovered_signer: address = ecrecover(typed_data_hash, _v, _r, _s)
    
    # Return: domain_separator, message_hash, typed_data_hash, recovered_signer, chain_id, contract_nonce
    return (domain_separator, message_hash, typed_data_hash, recovered_signer, chain.id, self.nonce[_recipient])

# Test the exact DevFaucet signature verification logic using STORED nonce
@external
@view
def test_devfaucet_signature_verification(
    _recipient: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _message: String[103],
    _v: uint256,
    _r: bytes32,
    _s: bytes32
) -> (bool, bytes32, address, uint256, bytes32, bytes32):
    # EXACTLY mimic DevFaucet logic - use STORED nonce for signature verification
    current_anti_replay_nonce: uint256 = self.nonce[_recipient]
    
    # Compute domain separator
    domain_separator: bytes32 = keccak256(concat(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("DevFaucet"),
        keccak256("1"),
        convert(chain.id, bytes32),
        convert(self.devfaucet_address, bytes32)
    ))
    
    # Compute message hash using STORED nonce
    message_hash: bytes32 = keccak256(concat(
        keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)"),
        convert(_recipient, bytes32),
        _chosen_block_hash,
        convert(_withdrawal_index, bytes32),
        _ip_address,
        convert(current_anti_replay_nonce, bytes32),  # Use stored nonce here
        keccak256(_message)
    ))
    
    # Compute typed data hash
    typed_data_hash: bytes32 = keccak256(concat(
        b"\x19\x01",
        domain_separator,
        message_hash
    ))
    
    # Recover signer
    recovered_signer: address = ecrecover(typed_data_hash, _v, _r, _s)
    signature_valid: bool = recovered_signer == _recipient
    
    # Return: signature_valid, typed_data_hash, recovered_signer, stored_nonce, domain_separator, message_hash
    return (signature_valid, typed_data_hash, recovered_signer, current_anti_replay_nonce, domain_separator, message_hash)

# Compare signatures with passed nonce vs stored nonce
@external
@view
def compare_nonce_signatures(
    _recipient: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _passed_nonce: uint256,
    _message: String[103],
    _v: uint256,
    _r: bytes32,
    _s: bytes32
) -> (bool, bool, uint256, uint256, address, address, bytes32, bytes32):
    stored_nonce: uint256 = self.nonce[_recipient]
    
    # Compute domain separator (same for both)
    domain_separator: bytes32 = keccak256(concat(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("DevFaucet"),
        keccak256("1"),
        convert(chain.id, bytes32),
        convert(self.devfaucet_address, bytes32)
    ))
    
    # Test with PASSED nonce
    message_hash_passed: bytes32 = keccak256(concat(
        keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)"),
        convert(_recipient, bytes32),
        _chosen_block_hash,
        convert(_withdrawal_index, bytes32),
        _ip_address,
        convert(_passed_nonce, bytes32),
        keccak256(_message)
    ))
    
    typed_data_hash_passed: bytes32 = keccak256(concat(b"\x19\x01", domain_separator, message_hash_passed))
    recovered_with_passed: address = ecrecover(typed_data_hash_passed, _v, _r, _s)
    valid_with_passed: bool = recovered_with_passed == _recipient
    
    # Test with STORED nonce
    message_hash_stored: bytes32 = keccak256(concat(
        keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)"),
        convert(_recipient, bytes32),
        _chosen_block_hash,
        convert(_withdrawal_index, bytes32),
        _ip_address,
        convert(stored_nonce, bytes32),
        keccak256(_message)
    ))
    
    typed_data_hash_stored: bytes32 = keccak256(concat(b"\x19\x01", domain_separator, message_hash_stored))
    recovered_with_stored: address = ecrecover(typed_data_hash_stored, _v, _r, _s)
    valid_with_stored: bool = recovered_with_stored == _recipient
    
    # Return: valid_with_passed, valid_with_stored, passed_nonce, stored_nonce, recovered_with_passed, recovered_with_stored, typed_data_hash_passed, typed_data_hash_stored
    return (valid_with_passed, valid_with_stored, _passed_nonce, stored_nonce, recovered_with_passed, recovered_with_stored, typed_data_hash_passed, typed_data_hash_stored)

# Individual component getters for detailed debugging
@external
@view
def get_domain_type_hash() -> bytes32:
    return keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")

@external
@view
def get_name_hash() -> bytes32:
    return keccak256("DevFaucet")

@external
@view
def get_version_hash() -> bytes32:
    return keccak256("1")

@external
@view
def get_message_type_hash() -> bytes32:
    return keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)")

@external
@view
def get_chain_id() -> uint256:
    return chain.id

@external
@view
def get_contract_address() -> address:
    return self.devfaucet_address

# Helper function to set nonce for testing (mimics a withdrawal that would increment nonce)
@external
def set_nonce(_user: address, _nonce: uint256):
    self.nonce[_user] = _nonce