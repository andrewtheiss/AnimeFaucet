#!/bin/bash

# Compile contracts with latest Vyper and update ABIs
echo "🔨 Compiling contracts with latest Vyper..."

# Activate Vyper environment
source ../Environments/vyperenv/bin/activate

# Check Vyper version
echo "Vyper version:"
vyper --version

echo ""
echo "📋 Compiling DevFaucet contract..."
# Compile DevFaucet and save ABI to temp file
vyper -f abi contract/devFaucet.vy > /tmp/devFaucet.abi

echo "📋 Compiling DevFaucetServer contract..."
# Compile DevFaucetServer and save ABI to temp file
vyper -f abi contract/devFaucetServer.vy > /tmp/devFaucetServer.abi

echo ""
echo "✅ Compilation complete!"
echo ""
echo "📋 DevFaucet ABI:"
cat /tmp/devFaucet.abi
echo ""
echo ""
echo "📋 DevFaucetServer ABI:"
cat /tmp/devFaucetServer.abi

echo ""
echo "🔄 Now run the Python script to update the ABIs in your codebase..."