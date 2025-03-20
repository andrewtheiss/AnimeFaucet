from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
import os
import logging
import time

app = Flask(__name__)
# Enable CORS for all routes and all origins during development
CORS(app, resources={r"/*": {"origins": "*"}})
logging.basicConfig(level=logging.INFO)

@app.after_request
def after_request(response):
    """Log CORS info for debugging."""
    origin = request.headers.get('Origin', '')
    logging.info(f"Request from origin: {origin}")
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Network configurations with deployed contract addresses
networks = {
    'sepolia': {
        'rpc_url': 'https://sepolia-rpc.scroll.io',
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

# Check if private key is available
if not os.getenv('PRIVATE_KEY'):
    logging.warning("PRIVATE_KEY environment variable not set! The server will not be able to send transactions.")
    # In production, you might want to raise an error here

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
    logging.info("Received withdrawal request")
    try:
        data = request.json
        logging.info(f"Request data: {data}")
        
        # Validate required fields
        required_fields = ['network', 'user_address', 'v', 'r', 's', 'message']
        for field in required_fields:
            if field not in data:
                logging.error(f"Missing required field: {field}")
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        network = data['network']  # 'sepolia' or 'animechain'
        logging.info(f"Processing request for network: {network}")
        
        # Validate network before using it
        if network not in networks:
            logging.error(f"Invalid network requested: {network}")
            return jsonify({'error': f'Invalid network: {network}'}), 400
            
        # Get the appropriate web3 instance for this network
        if network not in web3_instances:
            logging.error(f"No web3 instance available for network: {network}")
            return jsonify({'error': f'Network {network} is not available'}), 503
            
        web3 = web3_instances[network]
        
        # Use the web3 instance to create checksum address
        try:
            user_address = web3.to_checksum_address(data['user_address'])
            logging.info(f"User address: {user_address}")
        except Exception as e:
            logging.error(f"Invalid address format: {data['user_address']}, error: {str(e)}")
            return jsonify({'error': 'Invalid Ethereum address format'}), 400
        
        # Parse signature components
        try:
            v = int(data['v'])
            r = data['r']
            s = data['s']
            message = data['message']
            logging.info(f"Signature components: v={v}, r={r[:10]}..., s={s[:10]}...")
        except (ValueError, TypeError) as e:
            logging.error(f"Error parsing signature components: {str(e)}")
            return jsonify({'error': 'Invalid signature components'}), 400

        # Select network-specific settings
        config = networks[network]
        faucet_address = config['faucet_address']
        backend_address = config['backend_address']
        private_key = config['private_key']
        
        if not private_key:
            logging.error("Missing PRIVATE_KEY environment variable")
            return jsonify({'error': 'Server configuration error: Missing private key'}), 500

        # Basic signature validation
        if v not in [27, 28] or not (isinstance(r, str) and len(r) == 66) or not (isinstance(s, str) and len(s) == 66):
            logging.error(f"Invalid signature format: v={v}, r={r[:10]}..., s={s[:10]}...")
            return jsonify({'error': 'Invalid signature components format'}), 400

        # Contract instances
        try:
            faucet_contract = web3.eth.contract(address=faucet_address, abi=faucet_abi)
            backend_contract = web3.eth.contract(address=backend_address, abi=backend_abi)
        except Exception as e:
            logging.error(f"Error creating contract instances: {str(e)}")
            return jsonify({'error': 'Contract initialization error'}), 500

        # Off-chain checks
        try:
            withdrawal_count = faucet_contract.functions.get_withdrawal_count(user_address).call()
            logging.info(f"User withdrawal count: {withdrawal_count}")
            if withdrawal_count > 0:
                return jsonify({'error': 'User has already withdrawn'}), 400
                
            cooldown = faucet_contract.functions.time_until_next_withdrawal().call()
            logging.info(f"Global cooldown: {cooldown} seconds")
            if cooldown > 0:
                return jsonify({'error': f'Global cooldown active: {cooldown} seconds remaining'}), 400
                
            balance = faucet_contract.functions.get_balance().call()
            logging.info(f"Faucet balance: {balance}")
            if balance < WITHDRAW_AMOUNT + GAS_RESERVE:
                return jsonify({'error': 'Insufficient faucet balance'}), 400
                
            expected_message = faucet_contract.functions.get_expected_message(user_address).call()
            logging.info(f"Expected message: '{expected_message}', Provided message: '{message}'")
            if message != expected_message:
                return jsonify({'error': 'Incorrect message'}), 400
        except Exception as e:
            logging.error(f"Contract check failed for {user_address} on {network}: {str(e)}")
            return jsonify({'error': f'Contract check failed: {str(e)}'}), 500

        # Build and send transaction
        try:
            account = web3.eth.account.from_key(private_key)
            logging.info(f"Using account {account.address} to send transaction")
            
            # Get the current gas price
            gas_price = web3.eth.gas_price
            logging.info(f"Current gas price: {gas_price}")
            
            # Ensure we use enough gas price (at least 50 gwei)
            min_gas_price = web3.to_wei('50', 'gwei')
            gas_price = max(gas_price, min_gas_price)
            
            # Get the nonce for the account
            nonce = web3.eth.get_transaction_count(account.address)
            logging.info(f"Using nonce: {nonce}")
            
            # Build the transaction
            txn = backend_contract.functions.requestWithdrawal(
                faucet_address, user_address, v, r, s, message
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': gas_price
            })
            
            logging.info(f"Transaction built: {txn}")
            
            # Sign the transaction
            signed_txn = web3.eth.account.sign_transaction(txn, private_key)
            
            # Send the transaction
            tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
            tx_hash_hex = tx_hash.hex()
            logging.info(f"Transaction sent: {tx_hash_hex} for {user_address} on {network}")
            
            return jsonify({'tx_hash': tx_hash_hex, 'status': 'success'})
        except Exception as e:
            logging.error(f"Transaction failed for {user_address} on {network}: {str(e)}")
            return jsonify({'error': f'Transaction failed: {str(e)}'}), 500
            
    except Exception as e:
        logging.error(f"Unexpected error processing withdrawal request: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/status', methods=['GET'])
def status():
    """Return server status and connected networks."""
    networks_status = {}
    
    for network, web3 in web3_instances.items():
        try:
            block_number = web3.eth.block_number
            networks_status[network] = {
                'connected': True,
                'block_number': block_number,
                'faucet_address': networks[network]['faucet_address'],
                'backend_address': networks[network]['backend_address']
            }
        except Exception as e:
            networks_status[network] = {
                'connected': False,
                'error': str(e)
            }
    
    return jsonify({
        'status': 'running',
        'networks': networks_status,
        'timestamp': int(time.time())
    })

if __name__ == '__main__':
    # Check if running in development mode
    debug_mode = os.getenv('FLASK_ENV') == 'development' or os.getenv('DEBUG') == 'true'
    
    if debug_mode:
        logging.info("Starting server in DEBUG mode")
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        logging.info("Starting server in PRODUCTION mode")
        app.run(host='0.0.0.0', port=5000)