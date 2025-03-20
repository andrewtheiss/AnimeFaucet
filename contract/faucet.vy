#pragma version >0.4.0

# Faucet contract with EIP-712 signature verification
# Users must sign specific messages for 3 withdrawals of 0.1 native token, with a global 15-minute cooldown

# Define constants
WITHDRAW_AMOUNT: constant(uint256) = 100000000000000000  # 0.1 token (in wei, assuming 18 decimals)
COOLDOWN_PERIOD: constant(uint256) = 450  # 7 minutes 30 seconds (in seconds)
MAX_WITHDRAWALS: constant(uint256) = 3    # Maximum withdrawals per account
GAS_RESERVE: constant(uint256) = 10000000000000000  # 0.01 token reserved for gas costs

# Specific messages to sign for each withdrawal (in order)
MESSAGE_1: constant(String[103]) = "Ill use this ANIME coin to build something on ANIME chain.  Also, Earth domain is best."
MESSAGE_2: constant(String[103]) = "Gonna build more with this ANIME coin and not sell it like a degen."
MESSAGE_3: constant(String[103]) = "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me."

# EIP-712 domain constants
EIP712_DOMAIN_TYPEHASH: constant(bytes32) = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
MESSAGE_TYPEHASH: constant(bytes32) = keccak256("FaucetRequest(address recipient,string message,uint256 nonce)")

# Storage variables
owner: public(address)                            # Owner of the contract
authorizedBackends: public(HashMap[address, bool]) # Whitelist of authorized backend contracts
last_global_withdrawal: public(uint256)           # Tracks the last withdrawal time globally
nonce: public(HashMap[address, uint256])          # Nonce to prevent replay attacks
withdrawal_count: public(HashMap[address, uint256]) # Tracks number of withdrawals per user

# Events for logging withdrawals and deposits
event Withdrawal:
    recipient: indexed(address)
    amount: uint256
    timestamp: uint256
    withdrawal_count: uint256

event Deposit:
    sender: indexed(address)
    amount: uint256
    timestamp: uint256

# Constructor to set the owner
@deploy
def __init__():
    self.owner = msg.sender

# Fallback function to accept native token deposits
@external
@payable
def __default__():
    pass

# Explicit payable function to deposit funds into the faucet
@external
@payable
def deposit():
    assert msg.value > 0, "Must send some tokens"
    log Deposit(msg.sender, msg.value, block.timestamp)

# Function to withdraw 0.1 native token with EIP-712 signature (original functionality)
@external
def withdraw(_v: uint8, _r: bytes32, _s: bytes32, _message: String[103]):
    current_time: uint256 = block.timestamp
    
    # Check global cooldown
    assert self.last_global_withdrawal == 0 or current_time >= self.last_global_withdrawal + COOLDOWN_PERIOD, "Global cooldown period not elapsed"

    # Check withdrawal limit per user
    current_count: uint256 = self.withdrawal_count[msg.sender]
    assert current_count < MAX_WITHDRAWALS, "Max withdrawals reached"

    # Check contract balance (including gas reserve)
    assert self.balance >= WITHDRAW_AMOUNT + GAS_RESERVE, "Insufficient contract balance"

    # Determine the expected message based on current withdrawal count
    expected_message: String[103] = MESSAGE_1
    if current_count == 1:
        expected_message = MESSAGE_2
    elif current_count == 2:
        expected_message = MESSAGE_3
    
    # Verify the submitted message matches the expected one
    assert _message == expected_message, "Wrong message for this withdrawal"

    # Construct EIP-712 domain separator
    domain_separator: bytes32 = keccak256(
        abi_encode(
            EIP712_DOMAIN_TYPEHASH,
            keccak256(convert("Faucet", Bytes[6])),
            keccak256(convert("1", Bytes[1])),
            chain.id,
            self
        )
    )

    # Construct the message hash
    message_hash: bytes32 = keccak256(
        abi_encode(
            MESSAGE_TYPEHASH,
            msg.sender,
            keccak256(convert(_message, Bytes[103])),
            self.nonce[msg.sender]
        )
    )

    # Compute the final digest
    digest: bytes32 = keccak256(
        concat(
            b'\x19\x01',
            domain_separator,
            message_hash
        )
    )

    # Verify the signature
    signer: address = ecrecover(digest, _v, _r, _s)
    assert signer == msg.sender, "Invalid signature"
    assert signer != empty(address), "Signature verification failed"

    # Increment nonce to prevent replay
    self.nonce[msg.sender] += 1

    # Update withdrawal count and global withdrawal time
    self.withdrawal_count[msg.sender] = current_count + 1
    self.last_global_withdrawal = current_time

    # Send the native token
    send(msg.sender, WITHDRAW_AMOUNT)

    # Emit withdrawal event
    log Withdrawal(msg.sender, WITHDRAW_AMOUNT, current_time, current_count + 1)

# Function for backend contract to withdraw on behalf of a user (first withdrawal only)
@external
def withdrawFor(_user: address, _v: uint8, _r: bytes32, _s: bytes32, _message: String[103]):
    # Restrict to authorized backend contracts
    assert self.authorizedBackends[msg.sender], "Unauthorized backend"
    
    current_time: uint256 = block.timestamp
    
    # Check global cooldown
    assert self.last_global_withdrawal == 0 or current_time >= self.last_global_withdrawal + COOLDOWN_PERIOD, "Global cooldown period not elapsed"
    
    # Ensure this is the user's first withdrawal
    assert self.withdrawal_count[_user] == 0, "User already withdrew"
    
    # Check contract balance
    assert self.balance >= WITHDRAW_AMOUNT + GAS_RESERVE, "Insufficient contract balance"
    
    # Verify the message is MESSAGE_1 (first withdrawal)
    assert _message == MESSAGE_1, "Wrong message"

    # Construct EIP-712 domain separator
    domain_separator: bytes32 = keccak256(
        abi_encode(
            EIP712_DOMAIN_TYPEHASH,
            keccak256(convert("Faucet", Bytes[6])),
            keccak256(convert("1", Bytes[1])),
            chain.id,
            self
        )
    )

    # Construct the message hash with _user as recipient
    message_hash: bytes32 = keccak256(
        abi_encode(
            MESSAGE_TYPEHASH,
            _user,
            keccak256(convert(_message, Bytes[103])),
            self.nonce[_user]
        )
    )

    # Compute the final digest
    digest: bytes32 = keccak256(
        concat(
            b'\x19\x01',
            domain_separator,
            message_hash
        )
    )

    # Verify the user's signature
    signer: address = ecrecover(digest, _v, _r, _s)
    assert signer == _user, "Invalid signature"
    assert signer != empty(address), "Signature verification failed"

    # Increment nonce to prevent replay
    self.nonce[_user] += 1

    # Update withdrawal count and global withdrawal time
    self.withdrawal_count[_user] = 1
    self.last_global_withdrawal = current_time

    # Send the native token to the user
    send(_user, WITHDRAW_AMOUNT)

    # Emit withdrawal event
    log Withdrawal(_user, WITHDRAW_AMOUNT, current_time, 1)

# Function to add an authorized backend contract to the whitelist
@external
def addBackend(_backend: address):
    assert msg.sender == self.owner, "Only owner"
    self.authorizedBackends[_backend] = True

# Function to remove an authorized backend contract from the whitelist
@external
def removeBackend(_backend: address):
    assert msg.sender == self.owner, "Only owner"
    self.authorizedBackends[_backend] = False

# Function to transfer ownership
@external
def transferOwnership(_newOwner: address):
    assert msg.sender == self.owner, "Only owner"
    self.owner = _newOwner

# Function to check contract balance (view function)
@external
@view
def get_balance() -> uint256:
    return self.balance

# Function to check when the next withdrawal can occur (view function)
@external
@view
def time_until_next_withdrawal() -> uint256:
    if self.last_global_withdrawal == 0:
        return 0
    next_time: uint256 = self.last_global_withdrawal + COOLDOWN_PERIOD
    if block.timestamp >= next_time:
        return 0
    return next_time - block.timestamp

# Function to get a user's current nonce (view function)
@external
@view
def get_nonce(_user: address) -> uint256:
    return self.nonce[_user]

# Function to get a user's withdrawal count (view function)
@external
@view
def get_withdrawal_count(_user: address) -> uint256:
    return self.withdrawal_count[_user]

# Function to get the expected message for a user's next withdrawal (view function)
@external
@view
def get_expected_message(_user: address) -> String[103]:
    current_count: uint256 = self.withdrawal_count[_user]
    if current_count >= MAX_WITHDRAWALS:
        return "No more withdrawals, degen!"
    if current_count == 0:
        return MESSAGE_1
    if current_count == 1:
        return MESSAGE_2
    return MESSAGE_3