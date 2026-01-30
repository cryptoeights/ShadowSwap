# Setup Guide

This guide provides detailed instructions for setting up ShadowSwap locally.

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | v18.0.0+ | [nodejs.org](https://nodejs.org) |
| npm | v9.0.0+ | Comes with Node.js |
| Foundry | Latest | [Installation Guide](#install-foundry) |
| Git | Latest | [git-scm.com](https://git-scm.com) |

### Wallet Setup

1. Install [MetaMask](https://metamask.io/) browser extension
2. Add Arbitrum Sepolia testnet:
   - Network Name: `Arbitrum Sepolia`
   - RPC URL: `https://sepolia-rollup.arbitrum.io/rpc`
   - Chain ID: `421614`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.arbiscan.io`

3. Get testnet ETH from [Arbitrum Sepolia Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia)

---

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/pebfriantiya/shadowswap.git
cd shadowswap
```

### 2. Install Foundry

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Reload your terminal, then run:
foundryup

# Verify installation
forge --version
```

### 3. Setup Smart Contracts

```bash
cd contracts_foundry

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test -vvv
```

### 4. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Contract Addresses (Arbitrum Sepolia - already deployed)
NEXT_PUBLIC_SHADOW_POOL_ADDRESS=0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09
NEXT_PUBLIC_PRICE_FEED_ADDRESS=0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e
NEXT_PUBLIC_MOCK_DAI_ADDRESS=0xda222533d71C37A9370C6b5a26BcB4C07EcB0454
NEXT_PUBLIC_MOCK_WETH_ADDRESS=0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c
NEXT_PUBLIC_MOCK_ETH_ADDRESS=0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2
```

> **Note**: Get a WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com/)

### 5. Start Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Setup Keeper Bot (Optional)

The keeper bot automatically monitors prices and executes limit orders.

```bash
cd ../keeper-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

Edit `.env`:

```env
# Your wallet private key (with some testnet ETH)
PRIVATE_KEY=your_private_key_here

# RPC URL
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
```

Start the bot:

```bash
npm start
```

---

## Troubleshooting

### Common Issues

#### 1. CORS Error in Browser

If you see CORS errors when accessing the dashboard:

```
Access to fetch at 'https://sepolia-rollup.arbitrum.io/rpc' has been blocked by CORS policy
```

**Solution**: The frontend uses an API proxy at `/api/rpc`. Make sure you're running the frontend with `npm run dev`.

#### 2. Gas Fee Error

If you see "max fee per gas less than block base fee":

**Solution**: The app automatically handles dynamic gas fees. If the error persists, wait a few seconds and retry.

#### 3. Insufficient Balance

Make sure you have:
- ETH on Arbitrum Sepolia for gas
- Mock tokens (use the faucet in the app)

#### 4. MetaMask Network Error

Make sure:
- You're connected to Arbitrum Sepolia (Chain ID: 421614)
- Your wallet has testnet ETH

### Getting Help

1. Check the [FAQ](./FAQ.md)
2. Open an issue on GitHub
3. Join our Discord community

---

## Next Steps

- [Deploy Your Own Contracts](./DEPLOYMENT.md)
- [Understand the Architecture](./ARCHITECTURE.md)
- [Learn about iExec Integration](./IEXEC_INTEGRATION.md)
