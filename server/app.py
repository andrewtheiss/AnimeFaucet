from flask import Flask, request, jsonify
from web3 import Web3
import os
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Network configurations with deployed contract addresses
networks = {
    'sepolia': {
        'rpc_url': '"https://sepolia-rpc.scroll.io',
        'chain_id': 11155111,
        'private_key': os.getenv('PRIVATE_KEY'),
        'faucet_address': '0x6792e2DeA462E744E28D04d701F6C7505009ea1c',  # Replace with actual address
        'backend_address': '0xD2D8cbbb093042EDFd47C78cC09C425ceBD3B19E'  # Replace with actual address
    },
    'animechain': {
        'rpc_url': 'https://rpc-animechain-39xf6m45e3.t.conduit.xyz/',
        'chain_id': 69000,
        'private_key': os.getenv('PRIVATE_KEY'),
        'faucet_address': '0xYourAnimeChainFaucetAddress',  # Replace with actual address
        'backend_address': '0xYourAnimeChainBackendAddress'  # Replace with actual address
    }
}

# Initialize Web3 instances with fallback
web3_instances = {}
for network, config in networks.items():
    web3 = Web3(Web3.HTTPProvider(config['rpc_url']))
    if web3.is_connected():
        web3_instances[network] = web3
        logging.info(f"Connected to {network} RPC")
    else:
        logging.warning(f"Failed to connect to {network} RPC: {config['rpc_url']}")

# Check if any networks are available
if not web3_instances:
    raise ConnectionError("No RPC connections available. Server cannot start.")

# Replace with your actual contract ABIs
faucet_abi = [{"type":"event","name":"Withdrawal","inputs":[{"name":"recipient","type":"address","components":None,"internalType":None,"indexed":True},{"name":"amount","type":"uint256","components":None,"internalType":None,"indexed":False},{"name":"timestamp","type":"uint256","components":None,"internalType":None,"indexed":False},{"name":"withdrawal_count","type":"uint256","components":None,"internalType":None,"indexed":False}],"anonymous":False},{"type":"event","name":"Deposit","inputs":[{"name":"sender","type":"address","components":None,"internalType":None,"indexed":True},{"name":"amount","type":"uint256","components":None,"internalType":None,"indexed":False},{"name":"timestamp","type":"uint256","components":None,"internalType":None,"indexed":False}],"anonymous":False},{"type":"fallback","stateMutability":"payable"},{"type":"function","name":"deposit","stateMutability":"payable","inputs":[],"outputs":[]},{"type":"function","name":"withdraw","stateMutability":"nonpayable","inputs":[{"name":"_v","type":"uint8","components":None,"internalType":None},{"name":"_r","type":"bytes32","components":None,"internalType":None},{"name":"_s","type":"bytes32","components":None,"internalType":None},{"name":"_message","type":"string","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"withdrawFor","stateMutability":"nonpayable","inputs":[{"name":"_user","type":"address","components":None,"internalType":None},{"name":"_v","type":"uint8","components":None,"internalType":None},{"name":"_r","type":"bytes32","components":None,"internalType":None},{"name":"_s","type":"bytes32","components":None,"internalType":None},{"name":"_message","type":"string","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"addBackend","stateMutability":"nonpayable","inputs":[{"name":"_backend","type":"address","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"removeBackend","stateMutability":"nonpayable","inputs":[{"name":"_backend","type":"address","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"transferOwnership","stateMutability":"nonpayable","inputs":[{"name":"_newOwner","type":"address","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"get_balance","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"time_until_next_withdrawal","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"get_nonce","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"get_withdrawal_count","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"get_expected_message","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"string","components":None,"internalType":None}]},{"type":"function","name":"owner","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"address","components":None,"internalType":None}]},{"type":"function","name":"authorizedBackends","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"bool","components":None,"internalType":None}]},{"type":"function","name":"last_global_withdrawal","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"nonce","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"withdrawal_count","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"constructor","stateMutability":"nonpayable","inputs":[]}];
backend_abi = [{"type":"function","name":"requestWithdrawal","stateMutability":"nonpayable","inputs":[{"name":"_faucet","type":"address","components":None,"internalType":None},{"name":"_user","type":"address","components":None,"internalType":None},{"name":"_v","type":"uint8","components":None,"internalType":None},{"name":"_r","type":"bytes32","components":None,"internalType":None},{"name":"_s","type":"bytes32","components":None,"internalType":None},{"name":"_message","type":"string","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"owner","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"address","components":None,"internalType":None}]},{"type":"constructor","stateMutability":"nonpayable","inputs":[]}];

# Constants (adjust based on your contract)
WITHDRAW_AMOUNT = 100000000000000000  # 0.1 token in wei
GAS_RESERVE = 10000000000000000      # 0.01 token in wei

@app.route('/request-withdrawal', methods=['POST'])
def request_withdrawal():
    """Handle withdrawal requests for Sepolia or AnimeChain."""
    data = request.json
    try:
        network = data['network']  # 'sepolia' or 'animechain'
        user_address = Web3.toChecksumAddress(data['user_address'])
        v = int(data['v'])
        r = data['r']
        s = data['s']
        message = data['message']
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid input'}), 400

    if network not in networks:
        return jsonify({'error': 'Invalid network'}), 400

    # Select network-specific settings
    config = networks[network]
    web3 = web3_instances[network]
    faucet_address = config['faucet_address']
    backend_address = config['backend_address']
    private_key = config['private_key']

    # Basic signature validation
    if v not in [27, 28] or not (isinstance(r, str) and len(r) == 66) or not (isinstance(s, str) and len(s) == 66):
        return jsonify({'error': 'Invalid signature components'}), 400

    # Contract instances
    faucet_contract = web3.eth.contract(address=faucet_address, abi=faucet_abi)
    backend_contract = web3.eth.contract(address=backend_address, abi=backend_abi)

    # Off-chain checks
    try:
        if faucet_contract.functions.get_withdrawal_count(user_address).call() > 0:
            return jsonify({'error': 'User has already withdrawn'}), 400
        if faucet_contract.functions.time_until_next_withdrawal().call() > 0:
            return jsonify({'error': 'Global cooldown active'}), 400
        if faucet_contract.functions.get_balance().call() < WITHDRAW_AMOUNT + GAS_RESERVE:
            return jsonify({'error': 'Insufficient faucet balance'}), 400
        expected_message = faucet_contract.functions.get_expected_message(user_address).call()
        if message != expected_message:
            return jsonify({'error': 'Incorrect message'}), 400
    except Exception as e:
        logging.error(f"Check failed for {user_address} on {network}: {str(e)}")
        return jsonify({'error': 'Check failed'}), 500

    # Build and send transaction
    try:
        account = web3.eth.account.from_key(private_key)
        txn = backend_contract.functions.requestWithdrawal(
            faucet_address, user_address, v, r, s, message
        ).buildTransaction({
            'from': account.address,
            'nonce': web3.eth.getTransactionCount(account.address),
            'gas': 200000,
            'gasPrice': web3.toWei('50', 'gwei')
        })
        signed_txn = web3.eth.account.signTransaction(txn, private_key)
        tx_hash = web3.eth.sendRawTransaction(signed_txn.rawTransaction)
        logging.info(f"Tx {tx_hash.hex()} sent for {user_address} on {network}")
        return jsonify({'tx_hash': tx_hash.hex()})
    except Exception as e:
        logging.error(f"Tx failed for {user_address} on {network}: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)