#pragma version >0.4.0

# Interface for the DevFaucet contract with single signature (no EIP-712)
interface DevFaucet:
    def withdraw(_chosen_block_hash: bytes32, _withdrawal_index: uint256, _ip_address: bytes32, _nonce: uint256, _message: String[103]): nonpayable

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

# Function to request a withdrawal from the devFaucet on behalf of a user
# This handles the proof-of-work parameters and message for single signature
# Anyone can call this if they have valid PoW - the DevFaucet contract handles all validation
@external
def requestWithdrawal(
    _faucet: address, 
    _chosen_block_hash: bytes32, 
    _withdrawal_index: uint256, 
    _ip_address: bytes32, 
    _nonce: uint256, 
    _message: String[103]
):
    # Anyone can request withdrawals if they have valid PoW + message
    # The DevFaucet contract will validate the proof-of-work and message
    extcall DevFaucet(_faucet).withdraw(
        _chosen_block_hash, 
        _withdrawal_index, 
        _ip_address, 
        _nonce, 
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