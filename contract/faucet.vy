# Faucet contract for distributing native tokens
# Anyone can withdraw 0.1 native token every 10 minutes
# Includes an explicit payable deposit method

# Define constants
WITHDRAW_AMOUNT: constant(uint256) = 100000000000000000  # 0.1 token (in wei, assuming 18 decimals)
COOLDOWN_PERIOD: constant(uint256) = 600  # 10 minutes in seconds

# Storage variables
last_withdrawal: public(HashMap[address, uint256])  # Tracks the last withdrawal time for each user

# Events for logging withdrawals and deposits
event Withdrawal:
    recipient: indexed(address)
    amount: uint256
    timestamp: uint256

event Deposit:
    sender: indexed(address)
    amount: uint256
    timestamp: uint256

# Fallback function to accept native token deposits (implicitly payable)
@external
@payable
def __default__():
    pass

# Explicit payable function to deposit funds into the faucet
@external
@payable
def deposit():
    assert msg.value > 0, "Must send some tokens"
    # Emit a deposit event
    log Deposit(msg.sender, msg.value, block.timestamp)

# Function to withdraw 0.1 native token
@external
def withdraw():
    # Get the current timestamp
    current_time: uint256 = block.timestamp
    
    # Check if the user has waited long enough since their last withdrawal
    last_time: uint256 = self.last_withdrawal[msg.sender]
    assert last_time == 0 or current_time >= last_time + COOLDOWN_PERIOD, "Cooldown period not elapsed"

    # Check if the contract has enough balance
    assert self.balance >= WITHDRAW_AMOUNT, "Insufficient contract balance"

    # Update the user's last withdrawal time
    self.last_withdrawal[msg.sender] = current_time

    # Send the native token (e.g., ETH or chain's native currency)
    send(msg.sender, WITHDRAW_AMOUNT)

    # Emit an event for the withdrawal
    log Withdrawal(msg.sender, WITHDRAW_AMOUNT, current_time)

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