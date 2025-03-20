#pragma version >0.4.0

# Interface for the Faucet contract
interface Faucet:
    def withdrawFor(_user: address, _v: uint8, _r: bytes32, _s: bytes32, _message: String[103]): nonpayable

# Storage variables
owner: public(address)

# Constructor to set the owner
@deploy
def __init__():
    self.owner = msg.sender

# Function to request a withdrawal from the faucet on behalf of a user
@external
def requestWithdrawal(_faucet: address, _user: address, _v: uint8, _r: bytes32, _s: bytes32, _message: String[103]):
    assert msg.sender == self.owner, "Only owner"
    extcall Faucet(_faucet).withdrawFor(_user, _v, _r, _s, _message)