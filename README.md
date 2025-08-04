# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

How It Works Together
Deployment:
Deploy the modified Faucet contract and fund it with native tokens.

Deploy the BackendContract and fund it with gas tokens. Note its address.

Whitelist Setup:
The faucet contract owner calls addBackend(backend_contract_address) to authorize the backend contract.

User Interaction:
A user with no funds signs MESSAGE_1 using EIP-712 and sends the signature (_v, _r, _s) to the server via the frontend.

Server Action:
The server, controlling the backend contract, verifies off-chain that the user has no funds (e.g., via a blockchain query).

The server sends a transaction from the backend contract, calling requestWithdrawal(faucet_address, user_address, _v, _r, _s, MESSAGE_1).

Faucet Execution:
The backend contract calls withdrawFor on the faucet contract.

The faucet verifies:
msg.sender (the backend contract) is in authorizedBackends.

The user hasn’t withdrawn yet (withdrawal_count[user] == 0).

The signature is valid for user and MESSAGE_1.

If all checks pass, 0.1 token is sent to the user, and the withdrawal count and global cooldown are updated.

Subsequent Withdrawals:
After receiving the first 0.1 token, the user can use it to pay gas and call withdraw directly for the second and third withdrawals, signing MESSAGE_2 and MESSAGE_3 respectively.

# Quite often I install a venv one directory up
source Environments/vyperenv/bin/activate && cd AnimeFaucet && vyper --version