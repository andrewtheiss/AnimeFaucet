#pragma version >0.4.0

# Faucet contract with EIP-712 signature verification
# Users sign messages to claim 0.1 ANIME, with a 24-hour global cooldown
# Aims to use ANIME chain's gasless features if available

# Constants
WITHDRAW_AMOUNT: constant(uint256) = 100000000000000000  # 0.1 ANIME (18 decimals)
COOLDOWN_PERIOD: constant(uint256) = 24 * 60 * 60       # 24 hours in seconds
MAX_WITHDRAWALS: constant(uint256) = 3                  # Max claims per user
GAS_RESERVE: constant(uint256) = 10000000000000000      # 0.01 ANIME buffer

MESSAGE_1: constant(String[103]) = "Ill use this ANIME coin to build something on ANIME chain and not sell it like a degen."
MESSAGE_2: constant(String[103]) = "Gonna build more with this ANIME coin, and not ape into a meme coin."
MESSAGE_3: constant(String[103]) = "Gonna use this ANIME as my last hope for creating something worthwhile.  God help me."

EIP712_DOMAIN_TYPEHASH: constant(bytes32) = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
MESSAGE_TYPEHASH: constant(bytes32) = keccak256("FaucetRequest(address recipient,string message,uint256 nonce)")

# Storage variables
last_global_withdrawal: public(uint256)              # Timestamp of last withdrawal
nonce: public(HashMap[address, uint256])             # Nonce per user
withdrawal_count: public(HashMap[address, uint256])  # Withdrawals per user
last_withdrawer: public(address)                     # Last user to claim

# Events
event Withdrawal:
    recipient: indexed(address)
    amount: uint256
    timestamp: uint256
    withdrawal_count: uint256

event Deposit:
    sender: indexed(address)
    amount: uint256
    timestamp: uint256

@external
@payable
def __default__():
    """Accepts ANIME deposits to fund the faucet."""
    log Deposit(msg.sender, msg.value, block.timestamp)

@external
def claim(_recipient: address, _message: String[103], _v: uint8, _r: bytes32, _s: bytes32):
    """Claims 0.1 ANIME for the signed recipient, gas potentially sponsored by contract."""
    current_time: uint256 = block.timestamp
    
    # Check global cooldown
    assert self.last_global_withdrawal == 0 or current_time >= self.last_global_withdrawal + COOLDOWN_PERIOD, "Cooldown active"

    # Check withdrawal limit
    current_count: uint256 = self.withdrawal_count[_recipient]
    assert current_count < MAX_WITHDRAWALS, "Max withdrawals reached"

    # Check balance
    assert self.balance >= WITHDRAW_AMOUNT + GAS_RESERVE, "Insufficient balance"

    # Determine expected message
    expected_message: String[103] = MESSAGE_1
    if current_count == 1:
        expected_message = MESSAGE_2
    elif current_count == 2:
        expected_message = MESSAGE_3
    assert _message == expected_message, "Wrong message"

    # EIP-712 domain separator
    domain_separator: bytes32 = keccak256(
        abi_encode(
            EIP712_DOMAIN_TYPEHASH,
            keccak256(convert("ANIMEFaucet", Bytes[11])),  # Fixed: Bytes[11] for 11 chars
            keccak256(convert("1", Bytes[1])),
            chain.id,
            self
        )
    )

    # Message hash
    message_hash: bytes32 = keccak256(
        abi_encode(
            MESSAGE_TYPEHASH,
            _recipient,
            keccak256(convert(_message, Bytes[103])),
            self.nonce[_recipient]
        )
    )

    # Compute digest
    digest: bytes32 = keccak256(
        concat(
            b'\x19\x01',
            domain_separator,
            message_hash
        )
    )

    # Verify signature
    signer: address = ecrecover(digest, _v, _r, _s)
    assert signer == _recipient, "Invalid signature"
    assert signer != empty(address), "Signature failed"

    # Update state
    self.nonce[_recipient] += 1
    self.withdrawal_count[_recipient] = current_count + 1
    self.last_global_withdrawal = current_time
    self.last_withdrawer = _recipient

    # Send tokens
    send(_recipient, WITHDRAW_AMOUNT)

    # Emit event
    log Withdrawal(_recipient, WITHDRAW_AMOUNT, current_time, current_count + 1)


@external
@view
def get_nonce(_user: address) -> uint256:
    return self.nonce[_user]

@external
@view
def get_withdrawal_count(_user: address) -> uint256:
    return self.withdrawal_count[_user]

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

@external
@view
def time_until_next_withdrawal() -> uint256:
    if self.last_global_withdrawal == 0:
        return 0
    next_time: uint256 = self.last_global_withdrawal + COOLDOWN_PERIOD
    if block.timestamp >= next_time:
        return 0
    return next_time - block.timestamp

@external
@view
def get_last_withdrawer() -> address:
    return self.last_withdrawer


@external
@payable
def fund():
    """Allows anyone to fund the faucet with ANIME tokens."""
    pass
