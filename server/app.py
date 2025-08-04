import logging
import time
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
from eth_account.account import Account

# Import middleware that might be needed
try:
    from web3.middleware import geth_poa_middleware
except ImportError:
    geth_poa_middleware = None

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
NETWORK_CONFIG = {
    'sepolia': {
        'rpc_url': 'https://ethereum-sepolia.publicnode.com',
        'chain_id': 11155111,
        'faucet_address': '0x6792e2DeA462E744E28D04d701F6C7505009ea1c',
        'backend_address': '0x16de3a4FF803E18a7E6D440Dca1D1b03Ff890F97'
    },
    'animechain': {
        'rpc_url': 'https://rpc-animechain-39xf6m45e3.t.conduit.xyz/',
        'chain_id': 69000,
        'faucet_address': '0x81AC57b126940a1F946Aed67e5C0F0351d607eAb',
        'backend_address': '0x3aEF475d3FA57790DDEFe79dEBdC46f6A9A48c72'
    },
    'devanimechain': {
        'rpc_url': 'https://testnet-rpc.anime.xyz',
        'chain_id': 6900,
        'faucet_address': '0x0000000000000000000000000000000000000000',
        'backend_address': '0x0000000000000000000000000000000000000000',
        'block_explorer_url': 'https://explorer-animechain-testnet-i8yja6a1a0.t.conduit.xyz:443'
    }
}

# Check if private key is available
def get_private_key():
    """Get the private key from environment variable."""
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        logging.warning("PRIVATE_KEY environment variable not set! The server will not be able to send transactions.")
    return private_key

# Initialize Web3 instances with fallback
web3_instances = {}
for network, config in NETWORK_CONFIG.items():
    try:
        web3 = Web3(Web3.HTTPProvider(config['rpc_url']))
        
        # Add PoA middleware for testnets if available
        if geth_poa_middleware is not None:
            web3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
        if web3.is_connected():
            # Log Web3 info without relying on __version__ attribute
            try:
                # Try getting version from package instead of Web3 instance
                import pkg_resources
                web3_version = pkg_resources.get_distribution("web3").version
                logging.info(f"Using Web3.py version: {web3_version}")
            except Exception as ve:
                logging.info(f"Unable to determine Web3 version: {str(ve)}")
                
            logging.info(f"Connected to {network} RPC at {config['rpc_url']}")
            web3_instances[network] = web3
        else:
            logging.warning(f"Failed to connect to {network} RPC: {config['rpc_url']}")
    except Exception as e:
        logging.error(f"Error initializing Web3 for {network}: {str(e)}")

# Check if any networks are available
if not web3_instances:
    logging.critical("No RPC connections available. Server cannot start.")
    raise ConnectionError("No RPC connections available. Server cannot start.")

# Replace with your actual contract ABIs
faucet_abi = [{"type":"event","name":"Withdrawal","inputs":[{"name":"recipient","type":"address","components":None,"internalType":None,"indexed":True},{"name":"amount","type":"uint256","components":None,"internalType":None,"indexed":False},{"name":"timestamp","type":"uint256","components":None,"internalType":None,"indexed":False},{"name":"withdrawal_count","type":"uint256","components":None,"internalType":None,"indexed":False}],"anonymous":False},{"type":"event","name":"Deposit","inputs":[{"name":"sender","type":"address","components":None,"internalType":None,"indexed":True},{"name":"amount","type":"uint256","components":None,"internalType":None,"indexed":False},{"name":"timestamp","type":"uint256","components":None,"internalType":None,"indexed":False}],"anonymous":False},{"type":"fallback","stateMutability":"payable"},{"type":"function","name":"deposit","stateMutability":"payable","inputs":[],"outputs":[]},{"type":"function","name":"withdraw","stateMutability":"nonpayable","inputs":[{"name":"_v","type":"uint8","components":None,"internalType":None},{"name":"_r","type":"bytes32","components":None,"internalType":None},{"name":"_s","type":"bytes32","components":None,"internalType":None},{"name":"_message","type":"string","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"withdrawFor","stateMutability":"nonpayable","inputs":[{"name":"_user","type":"address","components":None,"internalType":None},{"name":"_v","type":"uint8","components":None,"internalType":None},{"name":"_r","type":"bytes32","components":None,"internalType":None},{"name":"_s","type":"bytes32","components":None,"internalType":None},{"name":"_message","type":"string","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"addBackend","stateMutability":"nonpayable","inputs":[{"name":"_backend","type":"address","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"removeBackend","stateMutability":"nonpayable","inputs":[{"name":"_backend","type":"address","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"transferOwnership","stateMutability":"nonpayable","inputs":[{"name":"_newOwner","type":"address","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"get_balance","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"time_until_next_withdrawal","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"get_nonce","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"get_withdrawal_count","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"get_expected_message","stateMutability":"view","inputs":[{"name":"_user","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"string","components":None,"internalType":None}]},{"type":"function","name":"owner","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"address","components":None,"internalType":None}]},{"type":"function","name":"authorizedBackends","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"bool","components":None,"internalType":None}]},{"type":"function","name":"last_global_withdrawal","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"last_recipient","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"address","components":None,"internalType":None}]},{"type":"function","name":"nonce","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"function","name":"withdrawal_count","stateMutability":"view","inputs":[{"name":"arg0","type":"address","components":None,"internalType":None}],"outputs":[{"name":"","type":"uint256","components":None,"internalType":None}]},{"type":"constructor","stateMutability":"nonpayable","inputs":[]}];
backend_abi = [{"type":"function","name":"deposit","stateMutability":"payable","inputs":[],"outputs":[]},{"type":"function","name":"requestWithdrawal","stateMutability":"nonpayable","inputs":[{"name":"_faucet","type":"address","components":None,"internalType":None},{"name":"_user","type":"address","components":None,"internalType":None},{"name":"_v","type":"uint8","components":None,"internalType":None},{"name":"_r","type":"bytes32","components":None,"internalType":None},{"name":"_s","type":"bytes32","components":None,"internalType":None},{"name":"_message","type":"string","components":None,"internalType":None}],"outputs":[]},{"type":"function","name":"owner","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"address","components":None,"internalType":None}]},{"type":"constructor","stateMutability":"nonpayable","inputs":[]}];

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
        if network not in NETWORK_CONFIG:
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
        config = NETWORK_CONFIG[network]
        faucet_address = config['faucet_address']
        backend_address = config['backend_address']
        
        private_key = get_private_key()
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
                
            balance = faucet_contract.functions.get_balance().call()
            logging.info(f"Faucet balance: {balance}")
            if balance < WITHDRAW_AMOUNT:
                return jsonify({'error': 'Insufficient faucet balance'}), 400
                
            # Only log a warning if there's not enough for gas reserve
            if balance < WITHDRAW_AMOUNT + GAS_RESERVE:
                logging.warning(f"Faucet balance {balance} is less than withdrawal + gas reserve ({WITHDRAW_AMOUNT + GAS_RESERVE})")
                
            expected_message = faucet_contract.functions.get_expected_message(user_address).call()
            logging.info(f"Expected message: '{expected_message}', Provided message: '{message}'")
            if message != expected_message:
                logging.error(f"Message mismatch! Expected: '{expected_message}', Got: '{message}'")
                # If they're close but not exact, log additional info to help debugging
                if expected_message.lower() == message.lower():
                    logging.warning("Messages match when case-insensitive, check for capitalization issues")
                if expected_message.replace(" ", "") == message.replace(" ", ""):
                    logging.warning("Messages match when spaces are removed, check for whitespace issues")
                return jsonify({'error': 'Incorrect message', 'expected': expected_message, 'provided': message}), 400
        except Exception as e:
            logging.error(f"Contract check failed for {user_address} on {network}: {str(e)}")
            logging.error(f"Contract addresses - Faucet: {faucet_address}, Backend: {backend_address}")
            logging.error(f"RPC URL: {NETWORK_CONFIG[network]['rpc_url']}")
            logging.exception("Detailed error traceback:")
            return jsonify({
                'error': f'Contract check failed: {str(e)}',
                'details': {
                    'faucet_address': faucet_address,
                    'backend_address': backend_address,
                    'rpc_url': NETWORK_CONFIG[network]['rpc_url']
                }
            }), 500

        # Build and send transaction
        try:
            account = Account.from_key(private_key)
            logging.info(f"Using account {account.address} to send transaction")
            
            # Check if server account has enough balance for gas
            server_balance = web3.eth.get_balance(account.address)
            logging.info(f"Server account balance: {server_balance}")
            
            min_required_balance = web3.to_wei('0.01', 'ether')  # Minimum balance for gas
            if server_balance < min_required_balance:
                logging.error(f"Server account has insufficient balance for gas: {server_balance} wei")
                return jsonify({
                    'error': 'Server has insufficient funds for gas',
                    'details': {
                        'server_address': account.address,
                        'balance': server_balance,
                        'min_required': min_required_balance
                    }
                }), 500
            
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
            logging.info("Signing transaction...")
            try:
                signed_txn = web3.eth.account.sign_transaction(txn, private_key)
                
                # Log information about the signed transaction object for debugging
                logging.info(f"Transaction signed successfully. Type: {type(signed_txn)}")
                
                # Get attribute names available on the signed transaction
                attr_names = dir(signed_txn)
                attr_dict = {}
                for attr in attr_names:
                    if not attr.startswith('_') and attr not in ['__class__', '__module__']:
                        try:
                            attr_dict[attr] = getattr(signed_txn, attr)
                        except Exception:
                            attr_dict[attr] = "Error accessing attribute"
                            
                logging.info(f"Available attributes on signed transaction: {attr_names}")
                
                # Try to send the transaction using the most common attribute names
                raw_tx = None
                
                # Method 1: Using the raw_transaction attribute (newer Web3.py versions)
                if hasattr(signed_txn, 'raw_transaction'):
                    logging.info("Using raw_transaction attribute")
                    raw_tx = signed_txn.raw_transaction
                    
                # Method 2: Using the rawTransaction attribute (older Web3.py versions)
                elif hasattr(signed_txn, 'rawTransaction'):
                    logging.info("Using rawTransaction attribute")
                    raw_tx = signed_txn.rawTransaction
                    
                # Method 3: Access as dictionary (some Web3.py implementations)
                elif isinstance(signed_txn, dict) and 'rawTransaction' in signed_txn:
                    logging.info("Accessing as dictionary with rawTransaction key")
                    raw_tx = signed_txn['rawTransaction']
                    
                # Method 4: Access as dictionary with raw_transaction
                elif isinstance(signed_txn, dict) and 'raw_transaction' in signed_txn:
                    logging.info("Accessing as dictionary with raw_transaction key")
                    raw_tx = signed_txn['raw_transaction']
                    
                # If all methods fail, try to print the signed_txn to log
                if raw_tx is None:
                    logging.error(f"Cannot find raw transaction data in signed transaction: {str(signed_txn)}")
                    raise ValueError("Cannot extract raw transaction data from signed transaction")
                
                # Send the transaction
                logging.info("Sending raw transaction to network...")
                tx_hash = web3.eth.send_raw_transaction(raw_tx)
                tx_hash_hex = tx_hash.hex()
                logging.info(f"Transaction sent: {tx_hash_hex} for {user_address} on {network}")
                
                return jsonify({
                    'tx_hash': tx_hash_hex,
                    'status': 'success',
                    'message': 'Withdrawal processed successfully'
                })
                
            except Exception as sign_error:
                logging.error(f"Error in transaction signing or sending: {str(sign_error)}", exc_info=True)
                return jsonify({
                    'error': f'Transaction failed: {str(sign_error)}',
                    'details': {
                        'network': network,
                        'user_address': user_address
                    }
                }), 500
                
        except Exception as e:
            logging.error(f"Transaction failed for {user_address} on {network}: {str(e)}", exc_info=True)
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
                'faucet_address': NETWORK_CONFIG[network]['faucet_address'],
                'backend_address': NETWORK_CONFIG[network]['backend_address']
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

@app.route('/verify-contracts', methods=['GET'])
def verify_contracts():
    """Verify contract addresses for each network."""
    results = {}
    
    for network, config in NETWORK_CONFIG.items():
        if network not in web3_instances:
            results[network] = {
                'status': 'error',
                'message': f'No web3 instance available for {network}'
            }
            continue
            
        web3 = web3_instances[network]
        faucet_address = config['faucet_address']
        backend_address = config['backend_address']
        
        faucet_result = {
            'address': faucet_address,
            'has_code': False,
            'code_length': 0
        }
        
        backend_result = {
            'address': backend_address,
            'has_code': False,
            'code_length': 0
        }
        
        try:
            faucet_code = web3.eth.get_code(faucet_address)
            faucet_result['has_code'] = len(faucet_code) > 2  # More than '0x'
            faucet_result['code_length'] = len(faucet_code)
        except Exception as e:
            faucet_result['error'] = str(e)
            
        try:
            backend_code = web3.eth.get_code(backend_address)
            backend_result['has_code'] = len(backend_code) > 2  # More than '0x'
            backend_result['code_length'] = len(backend_code)
        except Exception as e:
            backend_result['error'] = str(e)
            
        results[network] = {
            'faucet': faucet_result,
            'backend': backend_result,
            'rpc_url': config['rpc_url']
        }
        
    return jsonify(results)

@app.route('/server-account', methods=['GET'])
def server_account():
    """Check server account balance and status for each network."""
    private_key = get_private_key()
    if not private_key:
        return jsonify({"error": "Server private key not configured"}), 500
        
    try:
        account = Account.from_key(private_key)
        logging.info(f"Server account address: {account.address}")
        
        results = {}
        for network, config in NETWORK_CONFIG.items():
            if network not in web3_instances:
                results[network] = {
                    "status": "error",
                    "message": f"No web3 instance available for {network}"
                }
                continue
                
            web3 = web3_instances[network]
            
            try:
                # Check web3 connection and block info
                latest_block = web3.eth.block_number
                logging.info(f"Latest block on {network}: {latest_block}")
                
                # Get balance and gas price
                balance_wei = web3.eth.get_balance(account.address)
                balance_eth = web3.from_wei(balance_wei, 'ether')
                gas_price = web3.eth.gas_price
                
                # Calculate how many transactions possible
                estimated_gas_per_tx = 200000  # Our fixed gas limit
                estimated_tx_cost_wei = estimated_gas_per_tx * gas_price
                estimated_tx_cost_eth = web3.from_wei(estimated_tx_cost_wei, 'ether')
                
                if estimated_tx_cost_wei > 0:
                    txs_possible = balance_wei // estimated_tx_cost_wei
                else:
                    txs_possible = 0 if balance_wei == 0 else float('inf')
                
                results[network] = {
                    "status": "ok",
                    "address": account.address,
                    "balance_wei": balance_wei,
                    "balance_eth": float(balance_eth),
                    "gas_price_wei": gas_price,
                    "gas_price_gwei": float(web3.from_wei(gas_price, 'gwei')),
                    "estimated_tx_cost_eth": float(estimated_tx_cost_eth),
                    "transactions_possible": int(txs_possible)
                }
            except Exception as e:
                logging.error(f"Error checking {network} account: {str(e)}", exc_info=True)
                results[network] = {
                    "status": "error",
                    "message": f"Error: {str(e)}",
                    "balance": 0,
                    "transactions_possible": 0
                }
        
        return jsonify(results)
    except Exception as e:
        logging.error(f"Server account check failed: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/debug', methods=['GET'])
def debug_info():
    """Return debug information about server configuration."""
    try:
        import pkg_resources
        import sys
        import platform
        
        # Get Web3.py version safely
        web3_version = "Unknown"
        try:
            web3_version = pkg_resources.get_distribution("web3").version
        except Exception as ve:
            web3_version = f"Error detecting version: {str(ve)}"
        
        # Get Python version
        python_version = sys.version
        
        # Get platform info
        platform_info = {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor()
        }
        
        # Get all installed packages related to web3
        installed_packages = []
        try:
            installed_packages = [
                {"name": pkg.key, "version": pkg.version}
                for pkg in pkg_resources.working_set
                if pkg.key.startswith(("web3", "eth", "py"))  # Only Web3 related packages
            ]
        except Exception as pkg_err:
            logging.error(f"Error getting package info: {pkg_err}")
        
        # Get Web3 provider info for each network
        providers_info = {}
        for network, web3 in web3_instances.items():
            try:
                provider_info = {
                    "type": str(type(web3.provider)),
                    "endpoint": str(web3.provider.endpoint_uri) if hasattr(web3.provider, "endpoint_uri") else "Unknown",
                    "connected": web3.is_connected(),
                }
                providers_info[network] = provider_info
            except Exception as e:
                providers_info[network] = {"error": str(e)}
        
        # Get middleware info safely
        middleware_info = {}
        for network, web3 in web3_instances.items():
            try:
                if hasattr(web3, "middleware_onion"):
                    middleware_list = []
                    try:
                        middleware_list = [str(middleware) for middleware in web3.middleware_onion]
                    except Exception as mw_err:
                        middleware_list = [f"Error getting middleware: {str(mw_err)}"]
                    middleware_info[network] = middleware_list
            except Exception as e:
                middleware_info[network] = {"error": str(e)}
        
        return jsonify({
            "web3_version": web3_version,
            "python_version": python_version,
            "platform": platform_info,
            "web3_related_packages": installed_packages,
            "web3_providers": providers_info,
            "web3_middleware": middleware_info,
            "networks_configured": list(NETWORK_CONFIG.keys()),
            "networks_available": list(web3_instances.keys()),
            "server_has_private_key": get_private_key() is not None
        })
    except Exception as e:
        logging.error(f"Error generating debug info: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Check if running in development mode
    debug_mode = os.getenv('FLASK_ENV') == 'development' or os.getenv('DEBUG') == 'true'
    
    if debug_mode:
        logging.info("Starting server in DEBUG mode")
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        logging.info("Starting server in PRODUCTION mode")
        app.run(host='0.0.0.0', port=5000)