#!/usr/bin/env python3

import json
import re

def read_abi_file(filename):
    """Read ABI from file and return as JSON string"""
    try:
        with open(filename, 'r') as f:
            abi_content = f.read().strip()
            # Validate it's valid JSON
            json.loads(abi_content)
            return abi_content
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return None

def update_frontend_abis():
    """Update ABIs in src/constants/contracts.js"""
    print("🔄 Updating frontend ABIs...")
    
    # Read the compiled ABIs
    dev_faucet_abi = read_abi_file('/tmp/devFaucet.abi')
    dev_faucet_server_abi = read_abi_file('/tmp/devFaucetServer.abi')
    
    if not dev_faucet_abi or not dev_faucet_server_abi:
        print("❌ Could not read compiled ABIs. Make sure to run compile_and_update.sh first!")
        return
    
    # Read the current contracts.js file
    with open('src/constants/contracts.js', 'r') as f:
        content = f.read()
    
    # Update DEV_FAUCET_ABI
    dev_faucet_pattern = r'export const DEV_FAUCET_ABI = \[.*?\];'
    new_dev_faucet = f'export const DEV_FAUCET_ABI = {dev_faucet_abi};'
    content = re.sub(dev_faucet_pattern, new_dev_faucet, content, flags=re.DOTALL)
    
    # Update DEV_FAUCET_SERVER_ABI
    dev_server_pattern = r'export const DEV_FAUCET_SERVER_ABI = \[.*?\];'
    new_dev_server = f'export const DEV_FAUCET_SERVER_ABI = {dev_faucet_server_abi};'
    content = re.sub(dev_server_pattern, new_dev_server, content, flags=re.DOTALL)
    
    # Write back to file
    with open('src/constants/contracts.js', 'w') as f:
        f.write(content)
    
    print("✅ Frontend ABIs updated in src/constants/contracts.js")

def update_backend_abis():
    """Update ABIs in server/app.py"""
    print("🔄 Updating backend ABIs...")
    
    # Read the compiled ABIs
    dev_faucet_abi = read_abi_file('/tmp/devFaucet.abi')
    dev_faucet_server_abi = read_abi_file('/tmp/devFaucetServer.abi')
    
    if not dev_faucet_abi or not dev_faucet_server_abi:
        print("❌ Could not read compiled ABIs. Make sure to run compile_and_update.sh first!")
        return
    
    # Read the current app.py file
    with open('server/app.py', 'r') as f:
        content = f.read()
    
    # Update dev_faucet_abi
    dev_faucet_pattern = r'dev_faucet_abi = \[.*?\];'
    new_dev_faucet = f'dev_faucet_abi = {dev_faucet_abi};'
    content = re.sub(dev_faucet_pattern, new_dev_faucet, content, flags=re.DOTALL)
    
    # Update dev_backend_abi
    dev_backend_pattern = r'dev_backend_abi = \[.*?\];'
    new_dev_backend = f'dev_backend_abi = {dev_faucet_server_abi};'
    content = re.sub(dev_backend_pattern, new_dev_backend, content, flags=re.DOTALL)
    
    # Write back to file
    with open('server/app.py', 'w') as f:
        f.write(content)
    
    print("✅ Backend ABIs updated in server/app.py")

if __name__ == "__main__":
    print("🚀 Updating ABIs in frontend and backend...")
    print("")
    
    update_frontend_abis()
    update_backend_abis()
    
    print("")
    print("✅ All ABIs updated successfully!")
    print("📝 Files updated:")
    print("   - src/constants/contracts.js")
    print("   - server/app.py")
    print("")
    print("🔄 You can now redeploy the contracts with the new bytecode.")