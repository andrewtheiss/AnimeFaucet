#pragma version >0.4.0

# Interface for the DevFaucet contract with properly separated nonces
interface DevFaucet:
    def withdraw(_chosen_block_hash: bytes32, _withdrawal_index: uint256, _ip_address: bytes32, _pow_nonce: uint256, _message: String[103]): nonpayable
    def withdrawFor(_recipient: address, _chosen_block_hash: bytes32, _withdrawal_index: uint256, _ip_address: bytes32, _pow_nonce: uint256, _message: String[103], _v: uint256, _r: bytes32, _s: bytes32): nonpayable

# Storage variables
owner: public(address)

# Constructor to set the owner
@deploy
def __init__():
    self.owner = msg.sender

# Function to accept native currency payments (for gas fees)
@external
@payable
def deposit():
    pass

# GASLESS WITHDRAWAL: Server calls withdrawFor on behalf of user with their signature (FIXED VERSION)
@external
def requestWithdrawal(
    _faucet: address,
    _user: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _pow_nonce: uint256,           # FIXED: This is now clearly the PoW nonce
    _message: String[103],
    _v: uint256,
    _r: bytes32,
    _s: bytes32
):
    # Call the DevFaucet's withdrawFor function with user's signature
    # The DevFaucet contract will:
    # 1. Use the stored anti-replay nonce for EIP-712 signature verification
    # 2. Use the _pow_nonce parameter for PoW validation
    # 3. Increment the anti-replay nonce to prevent replay attacks
    # 4. Transfer tokens directly to _user
    extcall DevFaucet(_faucet).withdrawFor(
        _user,
        _chosen_block_hash,
        _withdrawal_index,
        _ip_address,
        _pow_nonce,     # FIXED: Pass PoW nonce for mining validation
        _message,
        _v,
        _r,
        _s
    )

# LEGACY: Direct withdrawal (for backwards compatibility)
@external
def requestWithdrawalDirect(
    _faucet: address, 
    _chosen_block_hash: bytes32, 
    _withdrawal_index: uint256, 
    _ip_address: bytes32, 
    _pow_nonce: uint256,    # FIXED: Now clearly the PoW nonce
    _message: String[103]
):
    # Legacy function - calls withdraw directly (user pays gas)
    # This will use msg.sender for PoW validation
    extcall DevFaucet(_faucet).withdraw(
        _chosen_block_hash, 
        _withdrawal_index, 
        _ip_address, 
        _pow_nonce,     # FIXED: Pass PoW nonce for mining validation
        _message
    )

# Function to check contract balance
@external
@view
def get_balance() -> uint256:
    return self.balance

# Function to withdraw native currency (owner only)
@external
def withdraw_native(_amount: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert self.balance >= _amount, "Insufficient balance"
    send(self.owner, _amount)

# Function to transfer ownership
@external
def transfer_ownership(_new_owner: address):
    assert msg.sender == self.owner, "Only owner"
    assert _new_owner != empty(address), "Invalid address"
    self.owner = _new_owner