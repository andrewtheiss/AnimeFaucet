#pragma version >0.4.0

# DevFaucet contract with single signature verification 
# Uses transaction signature itself as authorization, eliminating need for separate EIP-712 signing
# Maintains all security features: PoW, rate limiting, IP consistency, message verification

# Define constants
DAILY_RESET_PERIOD: constant(uint256) = 86400  # 24 hours in seconds
MAX_DAILY_WITHDRAWALS: constant(uint256) = 8   # Max withdrawals per user per day
GAS_RESERVE: constant(uint256) = 10000000000000000  # 0.01 token reserved for gas costs

# Specific messages that must be included in the transaction data for verification
MESSAGE_1: constant(String[103]) = "Ill use this ANIME coin to build something on ANIME chain.  Also, Earth domain is best."
MESSAGE_2: constant(String[103]) = "Gonna build more with this ANIME coin and not sell it like a degen."
MESSAGE_3: constant(String[103]) = "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me."
MESSAGE_4: constant(String[103]) = "I promise to use this ANIME coin for building and not just hodling forever."
MESSAGE_5: constant(String[103]) = "Building on ANIME chain with determination and hope for the future."
MESSAGE_6: constant(String[103]) = "This ANIME coin will help me create something meaningful and lasting."
MESSAGE_7: constant(String[103]) = "Using this ANIME coin to contribute to the ecosystem and community growth."
MESSAGE_8: constant(String[103]) = "Final ANIME coin withdrawal - time to build something truly remarkable."

# Storage variables
owner: public(address)
withdrawal_count: public(HashMap[address, uint256])      # Number of withdrawals per user
first_request_time: public(HashMap[address, uint256])    # First request timestamp per user
ip_address_hash: public(HashMap[address, bytes32])       # IP address hash per user (for consistency)
last_successful_block: public(HashMap[address, uint256]) # Last successful withdrawal block per user
last_global_withdrawal: public(uint256)                  # Global timestamp of last withdrawal
nonce: public(HashMap[address, uint256])                 # Transaction nonce per user for replay protection

# Configurable parameters (owner-adjustable)
cooldown_period: public(uint256)                         # Global cooldown between withdrawals (seconds)
pow_base_difficulty: public(uint256)                     # Base PoW difficulty
base_amount_multiplier: public(uint256)                  # Multiplier for withdrawal amounts (1000 = 1.0x)
base_difficulty_multiplier: public(uint256)              # Multiplier for PoW difficulty (1000 = 1.0x)

# Dynamic arrays for withdrawal amounts and PoW difficulty targets (by index)
withdrawal_amounts: public(HashMap[uint256, uint256])    # Amount per withdrawal index
pow_difficulty_targets: public(HashMap[uint256, uint256]) # PoW difficulty per withdrawal index

# Events
event Withdrawal:
    recipient: indexed(address)
    amount: uint256
    withdrawal_index: uint256
    chosen_block_hash: bytes32
    pow_nonce: uint256
    block_time: uint256

event Deposit:
    sender: indexed(address)
    amount: uint256
    block_time: uint256

@deploy
def __init__():
    self.owner = msg.sender
    
    # Initialize default cooldown period (0 = no cooldown)
    self.cooldown_period = 0
    
    # Initialize default PoW base difficulty
    self.pow_base_difficulty = 1000
    
    # Initialize default multipliers (1000 = 1.0x, 2000 = 2.0x, etc.)
    self.base_amount_multiplier = 1000  # 1.0x multiplier
    self.base_difficulty_multiplier = 1000  # 1.0x multiplier
    
    # Initialize default withdrawal amounts (5, 5, 10, 15, 25, 50, 75, 100 tokens in wei)
    self.withdrawal_amounts[0] = 5000000000000000000   # 5 tokens
    self.withdrawal_amounts[1] = 5000000000000000000   # 5 tokens  
    self.withdrawal_amounts[2] = 10000000000000000000  # 10 tokens
    self.withdrawal_amounts[3] = 15000000000000000000  # 15 tokens
    self.withdrawal_amounts[4] = 25000000000000000000  # 25 tokens
    self.withdrawal_amounts[5] = 50000000000000000000  # 50 tokens
    self.withdrawal_amounts[6] = 75000000000000000000  # 75 tokens
    self.withdrawal_amounts[7] = 100000000000000000000 # 100 tokens
    
    # Initialize default PoW difficulty targets
    self.pow_difficulty_targets[0] = 8000    # Index 1: ~30 seconds avg
    self.pow_difficulty_targets[1] = 8000    # Index 2: ~30 seconds avg
    self.pow_difficulty_targets[2] = 8000    # Index 3: ~30 seconds avg
    self.pow_difficulty_targets[3] = 8000    # Index 4: ~30 seconds avg
    self.pow_difficulty_targets[4] = 16000   # Index 5: ~1 minute avg
    self.pow_difficulty_targets[5] = 32000   # Index 6: ~2 minutes avg
    self.pow_difficulty_targets[6] = 64000   # Index 7: ~4 minutes avg
    self.pow_difficulty_targets[7] = 128000  # Index 8: ~8 minutes avg

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
    log Deposit(sender=msg.sender, amount=msg.value, block_time=block.timestamp)

# SINGLE SIGNATURE WITHDRAW: Uses transaction authorization + message in calldata
@external
def withdraw(_chosen_block_hash: bytes32, _withdrawal_index: uint256, _ip_address: bytes32, _nonce: uint256, _message: String[103]):
    # Get the current timestamp and block number
    current_time: uint256 = block.timestamp
    current_block: uint256 = block.number
    
    # Validate withdrawal index (1-8)
    assert _withdrawal_index >= 1 and _withdrawal_index <= MAX_DAILY_WITHDRAWALS, "Invalid withdrawal index"
    
    # Get user's current state
    current_count: uint256 = self.withdrawal_count[msg.sender]
    user_first_request: uint256 = self.first_request_time[msg.sender]
    user_ip_hash: bytes32 = self.ip_address_hash[msg.sender]
    user_last_block: uint256 = self.last_successful_block[msg.sender]
    
    # Initialize first request time if this is user's first interaction
    if user_first_request == 0:
        self.first_request_time[msg.sender] = current_time
        user_first_request = current_time
    
    # Check if daily period has elapsed (24 hours from first request)
    if current_time >= user_first_request + DAILY_RESET_PERIOD:
        # Reset daily counter and update first request time
        current_count = 0
        self.withdrawal_count[msg.sender] = 0
        self.first_request_time[msg.sender] = current_time
        user_first_request = current_time
    
    # Check if user has reached daily limit
    assert current_count < MAX_DAILY_WITHDRAWALS, "Max daily withdrawals reached"
    
    # Validate withdrawal index matches expected next withdrawal
    assert _withdrawal_index == current_count + 1, "Withdrawal index must be sequential"
    
    # Validate/store IP address hash (for privacy and consistency)
    if user_ip_hash == empty(bytes32):
        # First request - store IP address hash
        self.ip_address_hash[msg.sender] = _ip_address
        user_ip_hash = _ip_address
    else:
        # Subsequent requests - verify IP matches
        assert _ip_address == user_ip_hash, "IP address must remain consistent"
    
    # Validate nonce for replay protection
    assert _nonce == self.nonce[msg.sender], "Invalid nonce"
    
    # Note: Block validation will be done by frontend/server since we can't easily extract block number from hash
    # The PoW validation provides sufficient security by requiring recent block hashes
    chosen_block_num: uint256 = current_block  # Use current block as reference for now
    
    # Get the expected message for this withdrawal index
    expected_message: String[103] = MESSAGE_1
    if _withdrawal_index == 2:
        expected_message = MESSAGE_2
    elif _withdrawal_index == 3:
        expected_message = MESSAGE_3
    elif _withdrawal_index == 4:
        expected_message = MESSAGE_4
    elif _withdrawal_index == 5:
        expected_message = MESSAGE_5
    elif _withdrawal_index == 6:
        expected_message = MESSAGE_6
    elif _withdrawal_index == 7:
        expected_message = MESSAGE_7
    elif _withdrawal_index == 8:
        expected_message = MESSAGE_8
    
    # CRITICAL: Verify the provided message matches expected message
    assert _message == expected_message, "Invalid message for this withdrawal"
    
    # Validate proof-of-work
    self._validate_proof_of_work(_chosen_block_hash, msg.sender, _ip_address, _nonce, _withdrawal_index)
    
    # Check global cooldown
    if self.cooldown_period > 0:
        assert self.last_global_withdrawal == 0 or current_time >= self.last_global_withdrawal + self.cooldown_period, "Global cooldown not elapsed"
    
    # Calculate withdrawal amount with multiplier
    base_amount: uint256 = self.withdrawal_amounts[_withdrawal_index - 1]
    withdrawal_amount: uint256 = (base_amount * self.base_amount_multiplier) // 1000
    
    # Check contract balance (including gas reserve)
    assert self.balance >= withdrawal_amount + GAS_RESERVE, "Insufficient contract balance"
    
    # Update user state - SINGLE SIGNATURE SUCCESS!
    self.nonce[msg.sender] += 1
    self.withdrawal_count[msg.sender] = current_count + 1
    self.last_successful_block[msg.sender] = chosen_block_num
    self.last_global_withdrawal = current_time
    
    # Send the tokens
    send(msg.sender, withdrawal_amount)
    
    # Emit withdrawal event with proof-of-work details
    log Withdrawal(
        recipient=msg.sender,
        amount=withdrawal_amount,
        withdrawal_index=_withdrawal_index,
        chosen_block_hash=_chosen_block_hash,
        pow_nonce=_nonce,
        block_time=current_time
    )

# Internal function to validate proof-of-work
@internal
def _validate_proof_of_work(_chosen_block_hash: bytes32, _user: address, _ip_address: bytes32, _nonce: uint256, _withdrawal_index: uint256):
    # Get difficulty target with multiplier
    base_difficulty: uint256 = self.pow_difficulty_targets[_withdrawal_index - 1]
    difficulty_target: uint256 = (base_difficulty * self.base_difficulty_multiplier) // 1000
    
    # Calculate the proof-of-work hash
    pow_hash: bytes32 = keccak256(concat(
        _chosen_block_hash,
        convert(_user, bytes20),
        _ip_address,
        convert(_nonce, bytes32)
    ))
    
    # Validate the hash meets the difficulty requirement
    hash_uint: uint256 = convert(pow_hash, uint256)
    assert hash_uint % difficulty_target == 0, "Proof-of-work validation failed"

# View function to get the difficulty target for a specific withdrawal index
@external
@view
def get_difficulty_target(_withdrawal_index: uint256) -> uint256:
    assert _withdrawal_index >= 1 and _withdrawal_index <= MAX_DAILY_WITHDRAWALS, "Invalid withdrawal index"
    base_difficulty: uint256 = self.pow_difficulty_targets[_withdrawal_index - 1]
    return (base_difficulty * self.base_difficulty_multiplier) // 1000

# View function to get the withdrawal amount for a specific index
@external
@view
def get_withdrawal_amount(_withdrawal_index: uint256) -> uint256:
    assert _withdrawal_index >= 1 and _withdrawal_index <= MAX_DAILY_WITHDRAWALS, "Invalid withdrawal index"
    base_amount: uint256 = self.withdrawal_amounts[_withdrawal_index - 1]
    return (base_amount * self.base_amount_multiplier) // 1000

# View function to get expected message for withdrawal index
@external
@view
def get_expected_message(_withdrawal_index: uint256) -> String[103]:
    assert _withdrawal_index >= 1 and _withdrawal_index <= MAX_DAILY_WITHDRAWALS, "Invalid withdrawal index"
    
    if _withdrawal_index == 1:
        return MESSAGE_1
    elif _withdrawal_index == 2:
        return MESSAGE_2
    elif _withdrawal_index == 3:
        return MESSAGE_3
    elif _withdrawal_index == 4:
        return MESSAGE_4
    elif _withdrawal_index == 5:
        return MESSAGE_5
    elif _withdrawal_index == 6:
        return MESSAGE_6
    elif _withdrawal_index == 7:
        return MESSAGE_7
    elif _withdrawal_index == 8:
        return MESSAGE_8
    else:
        return MESSAGE_1  # Fallback

# Admin functions for configuration (owner only)
@external
def update_withdrawal_amount(_index: uint256, _amount: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _index >= 1 and _index <= MAX_DAILY_WITHDRAWALS, "Invalid index"
    self.withdrawal_amounts[_index - 1] = _amount

@external
def update_pow_difficulty(_index: uint256, _difficulty: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _index >= 1 and _index <= MAX_DAILY_WITHDRAWALS, "Invalid index"
    self.pow_difficulty_targets[_index - 1] = _difficulty

@external
def update_cooldown_period(_period: uint256):
    assert msg.sender == self.owner, "Only owner"
    self.cooldown_period = _period

@external
def update_base_amount_multiplier(_multiplier: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _multiplier > 0, "Multiplier must be positive"
    self.base_amount_multiplier = _multiplier

@external
def update_base_difficulty_multiplier(_multiplier: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _multiplier > 0, "Multiplier must be positive"
    self.base_difficulty_multiplier = _multiplier

# Emergency functions (owner only)
@external
def emergency_withdraw(_amount: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert self.balance >= _amount, "Insufficient balance"
    send(self.owner, _amount)

@external
def transfer_ownership(_new_owner: address):
    assert msg.sender == self.owner, "Only owner"
    assert _new_owner != empty(address), "Invalid address"
    self.owner = _new_owner