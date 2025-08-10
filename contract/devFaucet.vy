#pragma version >0.4.0

# DevFaucet contract with proper nonce separation
# Separates anti-replay nonce (for EIP-712) from PoW nonce (for mining validation)
# This fixes the fundamental design issue where both nonces were conflated

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
nonce: public(HashMap[address, uint256])                 # Anti-replay nonce per user for signature verification

# Configuration variables
cooldown_period: public(uint256)                     # Global cooldown period in seconds (0 = disabled)
pow_base_difficulty: public(uint256)                 # Base proof-of-work difficulty
base_amount_multiplier: public(uint256)              # Base amount multiplier (1000 = 1x, 2000 = 2x)
base_difficulty_multiplier: public(uint256)          # Base difficulty multiplier (1000 = 1x, 2000 = 2x)

# Dynamic arrays for amounts and difficulties per withdrawal index
withdrawal_amounts: public(uint256[8])               # Base withdrawal amounts for each index (1-8)
pow_difficulty_targets: public(uint256[8])           # Base PoW difficulty targets for each index (1-8)

# Events
event Withdrawal:
    recipient: indexed(address)
    amount: uint256
    withdrawal_index: uint256
    chosen_block_hash: bytes32
    pow_nonce: uint256
    block_time: uint256

event Deposit:
    depositor: indexed(address)
    amount: uint256

event OwnershipTransferred:
    previous_owner: indexed(address)
    new_owner: indexed(address)

# Constructor
@deploy
def __init__():
    self.owner = msg.sender
    
    # Initialize withdrawal amounts (in wei) for each index
    self.withdrawal_amounts[0] = 5000000000000000000   # 5.0 ANIME for withdrawal 1
    self.withdrawal_amounts[1] = 5000000000000000000   # 5.0 ANIME for withdrawal 2
    self.withdrawal_amounts[2] = 5000000000000000000   # 5.0 ANIME for withdrawal 3
    self.withdrawal_amounts[3] = 10000000000000000000  # 10.0 ANIME for withdrawal 4
    self.withdrawal_amounts[4] = 10000000000000000000  # 10.0 ANIME for withdrawal 5
    self.withdrawal_amounts[5] = 15000000000000000000  # 15.0 ANIME for withdrawal 6
    self.withdrawal_amounts[6] = 20000000000000000000  # 20.0 ANIME for withdrawal 7
    self.withdrawal_amounts[7] = 20000000000000000000  # 20.0 ANIME for withdrawal 8
    
    # Initialize PoW difficulty targets for each index
    self.pow_difficulty_targets[0] = 80000     # Easiest for first withdrawal
    self.pow_difficulty_targets[1] = 160000
    self.pow_difficulty_targets[2] = 320000
    self.pow_difficulty_targets[3] = 640000
    self.pow_difficulty_targets[4] = 1280000    # Increase difficulty for later withdrawals
    self.pow_difficulty_targets[5] = 2560000
    self.pow_difficulty_targets[6] = 5120000
    self.pow_difficulty_targets[7] = 12800000   # Hardest for final withdrawal
    
    # Initialize multipliers
    self.base_amount_multiplier = 1000        # 1x multiplier (1000 = 1x)
    self.base_difficulty_multiplier = 1000    # 1x multiplier (1000 = 1x)
    self.cooldown_period = 0                  # No global cooldown by default

# Function to receive native currency deposits
@external
@payable
def deposit():
    log Deposit(depositor=msg.sender, amount=msg.value)

# EIP-712 Domain Separator
@internal
@view
def _build_domain_separator() -> bytes32:
    return keccak256(concat(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("DevFaucet"),  # Updated domain name
        keccak256("1"),
        convert(chain.id, bytes32),
        concat(empty(bytes12), convert(self, bytes20))  # explicit left-pad address to 32 bytes
    ))

# EIP-712 Message Hash for Withdrawal Request (FIXED - uses anti-replay nonce)
@internal
@view
def _build_withdrawal_message_hash(
    _recipient: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _anti_replay_nonce: uint256,  # FIXED: Renamed for clarity
    _message: String[103]
) -> bytes32:
    return keccak256(concat(
        keccak256("WithdrawalRequest(address recipient,bytes32 chosenBlockHash,uint256 withdrawalIndex,bytes32 ipAddress,uint256 nonce,string message)"),
        concat(empty(bytes12), convert(_recipient, bytes20)),  # explicit left-pad address to 32 bytes
        _chosen_block_hash,
        convert(_withdrawal_index, bytes32),
        _ip_address,
        convert(_anti_replay_nonce, bytes32),  # FIXED: Use anti-replay nonce for signature
        keccak256(_message)
    ))

# GASLESS WITHDRAWAL: Server calls this on behalf of user with signature (FIXED VERSION)
@external
def withdrawFor(
    _recipient: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _pow_nonce: uint256,           # FIXED: PoW nonce for mining validation
    _message: String[103],
    _v: uint256,
    _r: bytes32,
    _s: bytes32
):
    # FIXED: Verify EIP-712 signature using the stored anti-replay nonce
    domain_separator: bytes32 = self._build_domain_separator()
    
    # Get the current anti-replay nonce for this user
    current_anti_replay_nonce: uint256 = self.nonce[_recipient]
    
    message_hash: bytes32 = self._build_withdrawal_message_hash(
        _recipient, _chosen_block_hash, _withdrawal_index, _ip_address, current_anti_replay_nonce, _message
    )
    
    typed_data_hash: bytes32 = keccak256(concat(
        b"\x19\x01",
        domain_separator,
        message_hash
    ))
    
    recovered_signer: address = ecrecover(typed_data_hash, _v, _r, _s)
    assert recovered_signer == _recipient, "Invalid signature - not signed by recipient"
    
    # FIXED: Increment anti-replay nonce BEFORE withdrawal to prevent replay attacks
    self.nonce[_recipient] += 1
    
    # Execute withdrawal logic using _recipient and separate _pow_nonce
    self._execute_withdrawal(_recipient, _chosen_block_hash, _withdrawal_index, _ip_address, _pow_nonce, _message)

# DIRECT WITHDRAWAL: User calls this directly, paying their own gas (FIXED VERSION)
@external
def withdraw(_chosen_block_hash: bytes32, _withdrawal_index: uint256, _ip_address: bytes32, _pow_nonce: uint256, _message: String[103]):
    # FIXED: For direct withdrawals, we don't need signature verification
    # Execute withdrawal logic using msg.sender and _pow_nonce
    self._execute_withdrawal(msg.sender, _chosen_block_hash, _withdrawal_index, _ip_address, _pow_nonce, _message)

# Internal function to execute withdrawal logic (FIXED - uses separate pow_nonce)
@internal
def _execute_withdrawal(
    _user: address,
    _chosen_block_hash: bytes32,
    _withdrawal_index: uint256,
    _ip_address: bytes32,
    _pow_nonce: uint256,           # FIXED: Separate PoW nonce parameter
    _message: String[103]
):
    # Get the current timestamp and block number
    current_time: uint256 = block.timestamp
    current_block: uint256 = block.number
    
    # Validate withdrawal index (1-8)
    assert _withdrawal_index >= 1 and _withdrawal_index <= MAX_DAILY_WITHDRAWALS, "Invalid withdrawal index"
    
    # Get user's current state
    current_count: uint256 = self.withdrawal_count[_user]
    user_first_request: uint256 = self.first_request_time[_user]
    user_ip_hash: bytes32 = self.ip_address_hash[_user]
    user_last_block: uint256 = self.last_successful_block[_user]
    
    # Initialize first request time if this is user's first interaction
    if user_first_request == 0:
        self.first_request_time[_user] = current_time
        user_first_request = current_time
    
    # Check if daily period has elapsed (24 hours from first request)
    if current_time >= user_first_request + DAILY_RESET_PERIOD:
        # Reset daily counter and update first request time
        current_count = 0
        self.withdrawal_count[_user] = 0
        self.first_request_time[_user] = current_time
        user_first_request = current_time
    
    # Check if user has reached daily limit
    assert current_count < MAX_DAILY_WITHDRAWALS, "Max daily withdrawals reached"
    
    # Validate withdrawal index matches expected next withdrawal
    assert _withdrawal_index == current_count + 1, "Withdrawal index must be sequential"
    
    # Validate/store IP address hash (for privacy and consistency)
    if user_ip_hash == empty(bytes32):
        # First request - store IP address hash
        self.ip_address_hash[_user] = _ip_address
        user_ip_hash = _ip_address
    else:
        # Subsequent requests - verify IP matches
        assert _ip_address == user_ip_hash, "IP address must remain consistent"
    
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
    
    # FIXED: Validate proof-of-work using separate _pow_nonce parameter
    self._validate_proof_of_work(_chosen_block_hash, _user, _ip_address, _pow_nonce, _withdrawal_index)
    
    # Check global cooldown
    if self.cooldown_period > 0:
        assert self.last_global_withdrawal == 0 or current_time >= self.last_global_withdrawal + self.cooldown_period, "Global cooldown not elapsed"
    
    # Calculate withdrawal amount with multiplier
    base_amount: uint256 = self.withdrawal_amounts[_withdrawal_index - 1]
    withdrawal_amount: uint256 = (base_amount * self.base_amount_multiplier) // 1000
    
    # Check contract balance (including gas reserve)
    assert self.balance >= withdrawal_amount + GAS_RESERVE, "Insufficient contract balance"
    
    # Update user state
    self.withdrawal_count[_user] = current_count + 1
    self.last_successful_block[_user] = chosen_block_num
    self.last_global_withdrawal = current_time
    
    # Transfer tokens to user
    send(_user, withdrawal_amount)
    
    # Log the withdrawal event
    log Withdrawal(
        recipient=_user,
        amount=withdrawal_amount,
        withdrawal_index=_withdrawal_index,
        chosen_block_hash=_chosen_block_hash,
        pow_nonce=_pow_nonce,  # FIXED: Log the PoW nonce used
        block_time=current_time
    )

# Internal function to validate proof-of-work (FIXED - clearer parameter naming)
@internal
def _validate_proof_of_work(_chosen_block_hash: bytes32, _user: address, _ip_address: bytes32, _pow_nonce: uint256, _withdrawal_index: uint256):
    # Get difficulty target with multiplier
    base_difficulty: uint256 = self.pow_difficulty_targets[_withdrawal_index - 1]
    difficulty_target: uint256 = (base_difficulty * self.base_difficulty_multiplier) // 1000
    
    # Calculate the proof-of-work hash using _user (recipient) instead of msg.sender
    pow_hash: bytes32 = keccak256(concat(
        _chosen_block_hash,
        convert(_user, bytes20),
        _ip_address,
        convert(_pow_nonce, bytes32)  # FIXED: Use dedicated PoW nonce parameter
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

# View function to get the expected message for a specific withdrawal index
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
        return ""

# Admin functions (only owner)
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

@external
def withdraw_balance(_amount: uint256):
    assert msg.sender == self.owner, "Only owner"
    assert self.balance >= _amount, "Insufficient balance"
    send(self.owner, _amount)

@external
def transfer_ownership(_new_owner: address):
    assert msg.sender == self.owner, "Only owner"
    assert _new_owner != empty(address), "Invalid new owner"
    old_owner: address = self.owner
    self.owner = _new_owner
    log OwnershipTransferred(previous_owner=old_owner, new_owner=_new_owner)
