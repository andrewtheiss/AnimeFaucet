#pragma version >0.4.0

# Proof-of-work faucet contract with EIP-712 signature verification and IP validation
# Users must solve progressive proof-of-work and sign messages for 8 daily withdrawals with increasing amounts

# PROOF-OF-WORK FAUCET LOGIC:
# • Users get 8 progressive withdrawals per day (amounts: 5,5,10,15,25,50,75,100 tokens)
# • Each withdrawal requires signing one of 8 predefined messages (MESSAGE_1 through MESSAGE_8)
# • Users must solve proof-of-work hash with progressive difficulty:
#   - Index 1: hash % 8,000 == 0     (~30 seconds avg)
#   - Index 2: hash % 8,000 == 0     (~30 seconds avg)  
#   - Index 3: hash % 8,000 == 0     (~30 seconds avg)
#   - Index 4: hash % 8,000 == 0     (~30 seconds avg)
#   - Index 5: hash % 16,000 == 0    (~1 minute avg)
#   - Index 6: hash % 32,000 == 0    (~2 minutes avg)
#   - Index 7: hash % 64,000 == 0    (~4 minutes avg)
#   - Index 8: hash % 128,000 == 0   (~8 minutes avg)
#
# HASH GENERATION REQUIREMENTS:
# • hash_input = user_wallet_address + chosen_block_hash + withdrawal_index + ip_address + nonce
# • chosen_block must be from last 1000 blocks AND after user's last successful request
# • target_hash = keccak256(hash_input)
# • valid_pow = target_hash % difficulty_target == 0
# • IP address must match first request (stored as hash for privacy)
# • Daily counter resets every 24 hours from first request
# • No global cooldown (proof-of-work provides natural rate limiting)
# • Users can mine at their own pace within the 1000 block window

# Define constants (immutable)
DAILY_RESET_PERIOD: constant(uint256) = 86400  # 24 hours in seconds
MAX_DAILY_WITHDRAWALS: constant(uint256) = 8  # Maximum withdrawals per day
BLOCK_HISTORY_LIMIT: constant(uint256) = 1000  # Can choose from last 1000 blocks
GAS_RESERVE: constant(uint256) = 10000000000000000  # 0.01 token reserved for gas costs

# Admin-configurable parameters (mutable)
cooldown_period: public(uint256)  # Global cooldown (default: 0 for no cooldown)  
pow_base_difficulty: public(uint256)  # Base PoW difficulty multiplier (default: 1000)
base_amount_multiplier: public(uint256)  # Global multiplier for all withdrawal amounts (default: 1000 = 1.0x)
base_difficulty_multiplier: public(uint256)  # Global multiplier for all PoW difficulties (default: 1000 = 1.0x)

# Progressive withdrawal amounts (admin configurable)
withdrawal_amounts: public(uint256[8])

# Proof-of-work difficulty targets (admin configurable)  
pow_difficulty_targets: public(uint256[8])

# Specific messages to sign for each withdrawal (in order)
MESSAGE_1: constant(String[103]) = "Ill use this ANIME coin to test building something on ANIME chain testnet."
MESSAGE_2: constant(String[103]) = "Gonna test more with this ANIME testnet coin."
MESSAGE_3: constant(String[103]) = "Gonna use this testnet ANIME as fodder to test more c0d3."
MESSAGE_4: constant(String[103]) = "This is my fourth to last ANIME amount today, I promise I'll use it wisely."
MESSAGE_5: constant(String[103]) = "How much more testnet ANIME do I need?  MOARRRR."
MESSAGE_6: constant(String[103]) = "I actually still need more.  I'm probably vibe coding at this point."
MESSAGE_7: constant(String[103]) = "I still need more testnet ANIME today...  I likely have bugs in my code if I need this much."
MESSAGE_8: constant(String[103]) = "This is the last testnet ANIME I can request today.  Gonna have to make a new wallet."

# EIP-712 domain constants
EIP712_DOMAIN_TYPEHASH: constant(bytes32) = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
MESSAGE_TYPEHASH: constant(bytes32) = keccak256("FaucetRequest(address recipient,string message,uint256 nonce)")

# Storage variables
owner: public(address)                            # Owner of the contract
last_global_withdrawal: public(uint256)  # Tracks the last withdrawal time globally
nonce: public(HashMap[address, uint256])  # Nonce to prevent replay attacks
withdrawal_count: public(HashMap[address, uint256])  # Tracks number of withdrawals per user
first_request_time: public(HashMap[address, uint256])  # Tracks when user made their first request (for daily reset)
ip_address_hash: public(HashMap[address, bytes32])  # Stores hash of user's IP address for validation
last_successful_block: public(HashMap[address, uint256])  # Tracks user's last successful withdrawal block

# Events for logging withdrawals and deposits
event Withdrawal:
    recipient: indexed(address)
    amount: uint256
    block_time: uint256
    withdrawal_count: uint256
    withdrawal_index: uint256
    difficulty_target: uint256
    chosen_block: uint256
    proof_hash: bytes32

event Deposit:
    sender: indexed(address)
    amount: uint256
    block_time: uint256

# Constructor to set the owner and initialize default values
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

# Function to withdraw tokens with proof-of-work and EIP-712 signature
@external
def withdraw(_chosen_block_hash: bytes32, _withdrawal_index: uint256, _ip_address: bytes32, _nonce: uint256, _v: uint8, _r: bytes32, _s: bytes32):
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
    
    # Validate chosen block is within acceptable range
    # Note: We can't directly validate the block hash here, but we ensure the block range is valid
    # The actual block hash validation happens implicitly through the proof-of-work
    chosen_block_num: uint256 = current_block - 1  # Use previous block for hash validation
    assert chosen_block_num >= current_block - BLOCK_HISTORY_LIMIT, "Chosen block too old"
    assert chosen_block_num > user_last_block, "Chosen block must be after last successful withdrawal"
    
    # Calculate proof-of-work hash
    # hash_input = user_wallet_address + chosen_block_hash + withdrawal_index + ip_address + nonce
    pow_hash: bytes32 = keccak256(
        concat(
            convert(msg.sender, bytes20),
            _chosen_block_hash,
            convert(_withdrawal_index, bytes32),
            _ip_address,
            convert(_nonce, bytes32)
        )
    )
    
    # Get difficulty target for this withdrawal index (with multiplier applied)
    base_difficulty: uint256 = self.pow_difficulty_targets[_withdrawal_index - 1]
    difficulty_target: uint256 = (base_difficulty * self.base_difficulty_multiplier) // 1000
    
    # Verify proof-of-work
    assert convert(pow_hash, uint256) % difficulty_target == 0, "Invalid proof-of-work"
    
    # Get withdrawal amount for this index (with multiplier applied)
    base_amount: uint256 = self.withdrawal_amounts[_withdrawal_index - 1]
    withdrawal_amount: uint256 = (base_amount * self.base_amount_multiplier) // 1000
    
    # Check contract balance (including gas reserve)
    assert self.balance >= withdrawal_amount + GAS_RESERVE, "Insufficient contract balance"
    
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
    
    # Construct the message hash (includes the specific message and withdrawal details)
    message_hash: bytes32 = keccak256(
        abi_encode(
            MESSAGE_TYPEHASH,
            msg.sender,
            keccak256(convert(expected_message, Bytes[103])),
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
    
    # Update user state
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
        block_time=current_time, 
        withdrawal_count=current_count + 1,
        withdrawal_index=_withdrawal_index,
        difficulty_target=difficulty_target,
        chosen_block=chosen_block_num,
        proof_hash=pow_hash
    )

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
    next_time: uint256 = self.last_global_withdrawal + self.cooldown_period
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
    user_first_request: uint256 = self.first_request_time[_user]
    
    # Check if daily period has elapsed and reset counter if needed
    if user_first_request > 0 and block.timestamp >= user_first_request + DAILY_RESET_PERIOD:
        current_count = 0
    
    if current_count >= MAX_DAILY_WITHDRAWALS:
        return "No more withdrawals, degen!"
    
    next_index: uint256 = current_count + 1
    if next_index == 1:
        return MESSAGE_1
    elif next_index == 2:
        return MESSAGE_2
    elif next_index == 3:
        return MESSAGE_3
    elif next_index == 4:
        return MESSAGE_4
    elif next_index == 5:
        return MESSAGE_5
    elif next_index == 6:
        return MESSAGE_6
    elif next_index == 7:
        return MESSAGE_7
    elif next_index == 8:
        return MESSAGE_8
    else:
        return "Invalid withdrawal index"

# Function to get user's next withdrawal index (view function)
@external
@view
def get_next_withdrawal_index(_user: address) -> uint256:
    current_count: uint256 = self.withdrawal_count[_user]
    user_first_request: uint256 = self.first_request_time[_user]
    
    # Check if daily period has elapsed and reset counter if needed
    if user_first_request > 0 and block.timestamp >= user_first_request + DAILY_RESET_PERIOD:
        current_count = 0
    
    if current_count >= MAX_DAILY_WITHDRAWALS:
        return 0  # No more withdrawals
    
    return current_count + 1

# Function to get the next withdrawal amount for a user (view function)
@external
@view
def get_next_withdrawal_amount(_user: address) -> uint256:
    current_count: uint256 = self.withdrawal_count[_user]
    user_first_request: uint256 = self.first_request_time[_user]
    
    # Check if daily period has elapsed and reset counter if needed
    if user_first_request > 0 and block.timestamp >= user_first_request + DAILY_RESET_PERIOD:
        current_count = 0
    
    if current_count >= MAX_DAILY_WITHDRAWALS:
        return 0  # No more withdrawals
    
    next_index: uint256 = current_count + 1
    base_amount: uint256 = self.withdrawal_amounts[next_index - 1]
    # Apply base amount multiplier (1000 = 1.0x, 2000 = 2.0x, etc.)
    return (base_amount * self.base_amount_multiplier) // 1000

# Function to get the difficulty target for a specific withdrawal index (view function)
@external
@view
def get_difficulty_target(_withdrawal_index: uint256) -> uint256:
    assert _withdrawal_index >= 1 and _withdrawal_index <= MAX_DAILY_WITHDRAWALS, "Invalid withdrawal index"
    base_difficulty: uint256 = self.pow_difficulty_targets[_withdrawal_index - 1]
    # Apply base difficulty multiplier (1000 = 1.0x, 2000 = 2.0x, etc.)
    return (base_difficulty * self.base_difficulty_multiplier) // 1000

# Function to verify a proof-of-work hash without executing withdrawal (view function)
@external
@view
def verify_proof_of_work(_user: address, _chosen_block_hash: bytes32, _withdrawal_index: uint256, _ip_address: bytes32, _nonce: uint256) -> bool:
    # Validate withdrawal index
    if _withdrawal_index < 1 or _withdrawal_index > MAX_DAILY_WITHDRAWALS:
        return False
    
    # Calculate proof-of-work hash
    pow_hash: bytes32 = keccak256(
        concat(
            convert(_user, bytes20),
            _chosen_block_hash,
            convert(_withdrawal_index, bytes32),
            _ip_address,
            convert(_nonce, bytes32)
        )
    )
    
    # Get difficulty target for this withdrawal index
    difficulty_target: uint256 = self.pow_difficulty_targets[_withdrawal_index - 1]
    
    # Check if proof-of-work is valid
    return convert(pow_hash, uint256) % difficulty_target == 0

# Function to get user's IP address hash (view function)
@external
@view
def get_ip_address_hash(_user: address) -> bytes32:
    return self.ip_address_hash[_user]

# Function to get user's first request time (view function)
@external
@view
def get_first_request_time(_user: address) -> uint256:
    return self.first_request_time[_user]

# Function to get user's last successful block (view function)
@external
@view
def get_last_successful_block(_user: address) -> uint256:
    return self.last_successful_block[_user]

# Function to validate proof-of-work hash before submission (pure function)
@external
@pure
def validate_hash(_user: address, _chosen_block_hash: bytes32, _withdrawal_index: uint256, _ip_address: bytes32, _nonce: uint256, _difficulty_target: uint256) -> bool:
    """
    Pure function to validate a proof-of-work hash given all inputs.
    Users can call this to verify their hash before submitting withdrawal.
    
    Args:
        _user: User's wallet address
        _chosen_block_hash: Block hash chosen by user
        _withdrawal_index: Withdrawal index (1-8)
        _ip_address: User's IP address hash
        _nonce: Nonce used for proof-of-work
        _difficulty_target: Difficulty target for this withdrawal index
    
    Returns:
        bool: True if the hash meets the difficulty requirement, False otherwise
    """
    # Validate withdrawal index
    if _withdrawal_index < 1 or _withdrawal_index > MAX_DAILY_WITHDRAWALS:
        return False
    
    # Calculate proof-of-work hash
    # hash_input = user_wallet_address + chosen_block_hash + withdrawal_index + ip_address + nonce
    pow_hash: bytes32 = keccak256(
        concat(
            convert(_user, bytes20),
            _chosen_block_hash,
            convert(_withdrawal_index, bytes32),
            _ip_address,
            convert(_nonce, bytes32)
        )
    )
    
    # Check if proof-of-work is valid
    return convert(pow_hash, uint256) % _difficulty_target == 0

# Function to get time until daily reset for a user (view function)
@external
@view
def time_until_daily_reset(_user: address) -> uint256:
    user_first_request: uint256 = self.first_request_time[_user]
    if user_first_request == 0:
        return 0  # No requests yet
    
    reset_time: uint256 = user_first_request + DAILY_RESET_PERIOD
    if block.timestamp >= reset_time:
        return 0  # Reset has already occurred
    
    return reset_time - block.timestamp

# Function to get comprehensive user status (view function)
@external
@view
def get_user_daily_status(_user: address) -> (uint256, uint256, uint256, uint256):
    """
    Returns comprehensive daily status for a user:
    - total_remaining_amount: Total tokens the user can still withdraw today
    - remaining_withdrawals: Number of withdrawals remaining today
    - time_until_reset: Seconds until daily reset
    - next_withdrawal_amount: Amount for the next withdrawal
    """
    current_count: uint256 = self.withdrawal_count[_user]
    user_first_request: uint256 = self.first_request_time[_user]
    remaining_withdrawals: uint256 = 0
    total_remaining_amount: uint256 = 0
    i: uint256 = 0
    time_until_reset: uint256 = 0
    reset_time: uint256 = 0
    next_withdrawal_amount: uint256 = 0
    
    # Check if daily period has elapsed and reset counter if needed
    if user_first_request > 0 and block.timestamp >= user_first_request + DAILY_RESET_PERIOD:
        current_count = 0
    
    # Calculate remaining withdrawals
    if current_count < MAX_DAILY_WITHDRAWALS:
        remaining_withdrawals = MAX_DAILY_WITHDRAWALS - current_count
    
    # Calculate total remaining amount
    if current_count < MAX_DAILY_WITHDRAWALS:
        # Sum up all remaining withdrawal amounts
        i = current_count
        for j: uint256 in range(8):
            if i < MAX_DAILY_WITHDRAWALS:
                base_amount: uint256 = self.withdrawal_amounts[i]
                multiplied_amount: uint256 = (base_amount * self.base_amount_multiplier) // 1000
                total_remaining_amount += multiplied_amount
                i += 1
            else:
                break
    
    # Calculate time until reset
    if user_first_request > 0:
        reset_time = user_first_request + DAILY_RESET_PERIOD
        if block.timestamp < reset_time:
            time_until_reset = reset_time - block.timestamp
    
    # Get next withdrawal amount (with multiplier applied)
    if current_count < MAX_DAILY_WITHDRAWALS:
        base_next_amount: uint256 = self.withdrawal_amounts[current_count]
        next_withdrawal_amount = (base_next_amount * self.base_amount_multiplier) // 1000
    
    return (total_remaining_amount, remaining_withdrawals, time_until_reset, next_withdrawal_amount)

# Admin Events
event WithdrawalAmountUpdated:
    index: uint256
    old_amount: uint256
    new_amount: uint256
    updated_by: indexed(address)

event PowDifficultyUpdated:
    index: uint256
    old_difficulty: uint256
    new_difficulty: uint256
    updated_by: indexed(address)

event CooldownPeriodUpdated:
    old_period: uint256
    new_period: uint256
    updated_by: indexed(address)

event PowBaseDifficultyUpdated:
    old_base: uint256
    new_base: uint256
    updated_by: indexed(address)

event BaseAmountMultiplierUpdated:
    old_multiplier: uint256
    new_multiplier: uint256
    updated_by: indexed(address)

event BaseDifficultyMultiplierUpdated:
    old_multiplier: uint256
    new_multiplier: uint256
    updated_by: indexed(address)

# Admin function to update a specific withdrawal amount
@external
def updateWithdrawalAmount(_index: uint256, _amount: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _index >= 1 and _index <= MAX_DAILY_WITHDRAWALS, "Invalid withdrawal index"
    assert _amount > 0, "Amount must be greater than 0"
    
    old_amount: uint256 = self.withdrawal_amounts[_index - 1]
    self.withdrawal_amounts[_index - 1] = _amount
    
    log WithdrawalAmountUpdated(index=_index, old_amount=old_amount, new_amount=_amount, updated_by=msg.sender)

# Admin function to update all withdrawal amounts at once
@external
def updateAllWithdrawalAmounts(_amounts: uint256[8]):
    assert msg.sender == self.owner, "Only owner"
    
    old_amount: uint256 = 0
    
    for i: uint256 in range(8):
        assert _amounts[i] > 0, "All amounts must be greater than 0"
        old_amount = self.withdrawal_amounts[i]
        self.withdrawal_amounts[i] = _amounts[i]
        log WithdrawalAmountUpdated(index=i+1, old_amount=old_amount, new_amount=_amounts[i], updated_by=msg.sender)

# Admin function to update a specific PoW difficulty target
@external
def updatePowDifficulty(_index: uint256, _difficulty: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _index >= 1 and _index <= MAX_DAILY_WITHDRAWALS, "Invalid withdrawal index"
    assert _difficulty > 0, "Difficulty must be greater than 0"
    
    old_difficulty: uint256 = self.pow_difficulty_targets[_index - 1]
    self.pow_difficulty_targets[_index - 1] = _difficulty
    
    log PowDifficultyUpdated(index=_index, old_difficulty=old_difficulty, new_difficulty=_difficulty, updated_by=msg.sender)

# Admin function to update all PoW difficulty targets at once
@external
def updateAllPowDifficulties(_difficulties: uint256[8]):
    assert msg.sender == self.owner, "Only owner"
    
    old_difficulty: uint256 = 0
    
    for i: uint256 in range(8):
        assert _difficulties[i] > 0, "All difficulties must be greater than 0"
        old_difficulty = self.pow_difficulty_targets[i]
        self.pow_difficulty_targets[i] = _difficulties[i]
        log PowDifficultyUpdated(index=i+1, old_difficulty=old_difficulty, new_difficulty=_difficulties[i], updated_by=msg.sender)

# Admin function to update the global cooldown period
@external
def updateCooldownPeriod(_period: uint256):
    assert msg.sender == self.owner, "Only owner"
    # Note: period can be 0 to disable cooldown
    
    old_period: uint256 = self.cooldown_period
    self.cooldown_period = _period
    
    log CooldownPeriodUpdated(old_period=old_period, new_period=_period, updated_by=msg.sender)

# Admin function to update the PoW base difficulty multiplier
@external
def updatePowBaseDifficulty(_base: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _base > 0, "Base difficulty must be greater than 0"
    
    old_base: uint256 = self.pow_base_difficulty
    self.pow_base_difficulty = _base
    
    log PowBaseDifficultyUpdated(old_base=old_base, new_base=_base, updated_by=msg.sender)

# Admin function to update the base amount multiplier
@external
def updateBaseAmountMultiplier(_multiplier: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _multiplier > 0, "Multiplier must be greater than 0"
    
    old_multiplier: uint256 = self.base_amount_multiplier
    self.base_amount_multiplier = _multiplier
    
    log BaseAmountMultiplierUpdated(old_multiplier=old_multiplier, new_multiplier=_multiplier, updated_by=msg.sender)

# Admin function to update the base difficulty multiplier
@external
def updateBaseDifficultyMultiplier(_multiplier: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _multiplier > 0, "Multiplier must be greater than 0"
    
    old_multiplier: uint256 = self.base_difficulty_multiplier
    self.base_difficulty_multiplier = _multiplier
    
    log BaseDifficultyMultiplierUpdated(old_multiplier=old_multiplier, new_multiplier=_multiplier, updated_by=msg.sender)

# Function to transfer ownership
@external
def transferOwnership(_newOwner: address):
    assert msg.sender == self.owner, "Only owner"
    self.owner = _newOwner

# Emergency function to withdraw all funds (admin only)
@external
def emergencyWithdrawAll():
    assert msg.sender == self.owner, "Only owner"
    assert self.balance > 0, "No funds to withdraw"
    
    # Send all contract balance to owner
    send(self.owner, self.balance)

# Emergency function to withdraw specific amount (admin only)
@external
def emergencyWithdraw(_amount: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert _amount > 0, "Amount must be greater than 0"
    assert self.balance >= _amount, "Insufficient contract balance"
    
    # Send specified amount to owner
    send(self.owner, _amount)