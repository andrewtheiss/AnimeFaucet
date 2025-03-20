# Faucet contract with EIP-712 signature verification
# Users must sign specific degen messages in order for 3 withdrawals of 0.001 native token, every 10 seconds

# Define constants
WITHDRAW_AMOUNT: constant(uint256) = 1000000000000000  # 0.001 token (in wei, assuming 18 decimals)
COOLDOWN_PERIOD: constant(uint256) = 10  # 10 seconds
MAX_WITHDRAWALS: constant(uint256) = 3  # Maximum withdrawals per account
GAS_RESERVE: constant(uint256) = 10000000000000000  # 0.01 token reserved for gas costs

# Specific messages to sign for each withdrawal (in order)
MESSAGE_1: constant(String[103]) = "Ill use this ANIME coin to build something, maybe, or just hodl it til I can flex on normies, idk."
MESSAGE_2: constant(String[103]) = "Gonna build with this ANIME coin, not yeet it into a pool and cry wen moon like a pleb."
MESSAGE_3: constant(String[103]) = "Gonna use this ANIME coin to slap some code together or just diamond-hand it til I can rug my mom, lfg."

# EIP-712 domain constants
EIP712_DOMAIN_TYPEHASH: constant(bytes32) = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
MESSAGE_TYPEHASH: constant(bytes32) = keccak256("FaucetRequest(address recipient,string message,uint256 nonce)")

# Storage variables
last_withdrawal: public(HashMap[address, uint256])  # Tracks the last withdrawal time for each user
nonce: public(HashMap[address, uint256])  # Nonce to prevent replay attacks
withdrawal_count: public(HashMap[address, uint256])  # Tracks number of withdrawals per user

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

# Function to withdraw 0.001 native token with EIP-712 signature
@external
def withdraw(_v: uint8, _r: bytes32, _s: bytes32, _message: String[103]):
    # Get the current timestamp
    current_time: uint256 = block.timestamp
    
    # Check cooldown
    last_time: uint256 = self.last_withdrawal[msg.sender]
    assert last_time == 0 or current_time >= last_time + COOLDOWN_PERIOD, "Cooldown period not elapsed"

    # Check withdrawal limit
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

    # Construct the message hash (includes the specific message and nonce)
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

    # Update withdrawal count and last withdrawal time
    self.withdrawal_count[msg.sender] = current_count + 1
    self.last_withdrawal[msg.sender] = current_time

    # Send the native token (WITHDRAW_AMOUNT only, GAS_RESERVE stays in contract)
    send(msg.sender, WITHDRAW_AMOUNT)

    # Emit withdrawal event
    log Withdrawal(msg.sender, WITHDRAW_AMOUNT, current_time, current_count + 1)

# Function to check contract balance (view function)
@external
@view
def get_balance() -> uint256:
    return self.balance

# Function to check when a user can withdraw next (view function)
@external
@view
def time_until_next_withdrawal(_user: address) -> uint256:
    last_time: uint256 = self.last_withdrawal[_user]
    if last_time == 0:
        return 0
    next_time: uint256 = last_time + COOLDOWN_PERIOD
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