# ShadowSwap - Confidential Batch Auction DEX

<div align="center">

![ShadowSwap Logo](frontend/public/logo.svg)

**A privacy-preserving decentralized exchange with MEV protection powered by iExec DataProtector**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Deployed](https://img.shields.io/badge/Deployed-Arbitrum%20Sepolia-blue.svg)](https://sepolia.arbiscan.io/address/0x11a5f59AF554FCbB9D82C1Ba7f963912b2D5Bb8f)

[Demo Video](#demo-video) • [Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation)

</div>

---

## ⭐ Hackathon Highlights

> **Built for iExec Confidential DeFi Hackathon**

| Criteria | Implementation |
|----------|---------------|
| ✅ **Deployed on Arbitrum Sepolia** | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09) |
| ✅ **iExec DataProtector Integration** | Order encryption for MEV protection ([details](#iexec-dataprotector-integration)) |
| ✅ **Real-World DeFi Problem** | Solves front-running & sandwich attacks |
| ✅ **Code Quality** | TypeScript, Foundry, OpenZeppelin, comprehensive docs |
| ✅ **User Experience** | Modern UI, real-time updates, intuitive flow |
| 📝 **Feedback Document** | [FEEDBACK.md](FEEDBACK.md) |

---

## 🎯 Overview

**ShadowSwap** is a next-generation decentralized exchange that combines **batch auctions** with **confidential computing** to provide:

- **MEV Protection**: Orders are encrypted using iExec DataProtector, preventing front-running and sandwich attacks
- **Fair Price Discovery**: Batch auction mechanism ensures uniform clearing price for all orders
- **Limit Orders**: Set target prices and let the automated keeper bot execute when conditions are met
- **Instant Swaps**: Real-time swaps with live price feeds for immediate execution

### The Problem

Traditional DEXs suffer from:
- **Front-running**: Validators/miners can see pending transactions and extract value
- **Sandwich attacks**: Attackers profit by placing orders before and after user transactions
- **Poor price execution**: Individual trades can significantly impact prices

### Our Solution

ShadowSwap addresses these issues by:
1. **Encrypting orders** with iExec DataProtector before on-chain submission
2. **Batching orders** to execute at a single clearing price
3. **Automated execution** via keeper bot when limit order conditions are met

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| 🔐 **Confidential Orders** | Orders encrypted with iExec DataProtector |
| 📊 **Batch Auctions** | Fair price discovery through order batching |
| ⚡ **Instant Swaps** | Real-time swaps with live CoinGecko prices |
| 📈 **Limit Orders** | Set target prices with automatic execution |
| 🤖 **Keeper Bot** | Automated price monitoring and order execution |
| 📱 **Modern UI** | Beautiful, responsive interface with dark mode |
| 📜 **Transaction History** | Persistent history synced from blockchain |
| 📊 **Analytics Dashboard** | Real-time DEX statistics and metrics |

### iExec DataProtector Integration

ShadowSwap leverages **iExec DataProtector** for order confidentiality:

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│ User Order  │────▶│ iExec DataProt  │────▶│   ShadowPool    │────▶│   Batch     │
│  (Plain)    │     │   (Encrypt)     │     │   (On-chain)    │     │ Settlement  │
└─────────────┘     └─────────────────┘     └─────────────────┘     └─────────────┘
      │                     │                       │                     │
      ▼                     ▼                       ▼                     ▼
  - tokenIn            Encrypted blob          Store encrypted      Decrypt & match
  - tokenOut           + dataset addr          Wait for batch       at uniform price
  - amountIn
  - limitPrice
```

**Why iExec DataProtector?**

| Without Encryption | With iExec DataProtector |
|-------------------|-------------------------|
| ❌ Order visible in mempool | ✅ Order details hidden |
| ❌ Validators can front-run | ✅ No front-running possible |
| ❌ Sandwich attacks possible | ✅ Attack impossible without data |
| ❌ Poor execution price | ✅ Fair batch settlement |

**Technical Implementation:**

```typescript
// frontend/src/lib/encryption.ts
import { IExecDataProtector } from '@iexec/dataprotector';

const protectedData = await dataProtector.protectData({
    data: {
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn.toString(),
        limitPrice: order.limitPrice.toString(),
    },
    name: `ShadowSwap-Order-${Date.now()}`,
});
```

📖 **[Full iExec Integration Details](docs/IEXEC_INTEGRATION.md)** | 📝 **[iExec Tools Feedback](FEEDBACK.md)**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Swap    │  │ Limit    │  │Dashboard │  │    Analytics     │ │
│  │  Card    │  │ Orders   │  │          │  │                  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
└───────┼─────────────┼─────────────┼──────────────────┼──────────┘
        │             │             │                  │
        ▼             ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Smart Contracts (Arbitrum Sepolia)            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      ShadowPool                           │   │
│  │  • submitOrder()      • instantSwap()                     │   │
│  │  • submitLimitOrder() • executeLimitOrder()               │   │
│  │  • triggerBatch()     • cancelOrder()                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ MockPriceFeed │  │   Mock ERC20  │  │   MockWETH/mETH   │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        ▲                                          │
        │                                          ▼
┌───────┴─────────────────────────────────────────────────────────┐
│                        Keeper Bot (Node.js)                      │
│  • Fetches live prices from CoinGecko                           │
│  • Updates on-chain price feed                                  │
│  • Monitors pending limit orders                                │
│  • Auto-executes when conditions are met                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ and npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for smart contracts)
- MetaMask wallet with Arbitrum Sepolia testnet

### 1. Clone Repository

```bash
git clone https://github.com/pebfriantiya/shadowswap.git
cd shadowswap
```

### 2. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Keeper Bot
cd ../keeper-bot
npm install

# Smart Contracts (Foundry)
cd ../contracts_foundry
forge install
```

### 3. Environment Setup

```bash
# Frontend
cp frontend/.env.example frontend/.env.local
# Edit with your values

# Keeper Bot
cp keeper-bot/.env.example keeper-bot/.env
# Add your private key
```

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Run Keeper Bot (Optional)

```bash
cd keeper-bot
npm start
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Setup Guide](docs/SETUP.md) | Detailed installation instructions |
| [Deployment Guide](docs/DEPLOYMENT.md) | How to deploy smart contracts |
| [Architecture](docs/ARCHITECTURE.md) | System design and flow |
| [iExec Integration](docs/IEXEC_INTEGRATION.md) | DataProtector usage |
| [API Reference](docs/API.md) | Smart contract functions |

---

## 🎬 Demo Video

📺 **[Watch Demo Video](https://youtu.be/your-demo-link)**

The demo showcases:
1. Connecting wallet to Arbitrum Sepolia
2. Minting test tokens from faucet
3. Performing instant swap with live prices
4. Creating a limit order with target price
5. Viewing order status and execution
6. Transaction history and analytics

---

## 📝 Smart Contracts

### Deployed Contracts (Arbitrum Sepolia)

| Contract | Address | Arbiscan |
|----------|---------|----------|
| ShadowPool | `0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09` | [View](https://sepolia.arbiscan.io/address/0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09) |
| MockPriceFeed | `0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006` | [View](https://sepolia.arbiscan.io/address/0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006) |
| mUSDC | `0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e` | [View](https://sepolia.arbiscan.io/address/0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e) |
| mDAI | `0xda222533d71C37A9370C6b5a26BcB4C07EcB0454` | [View](https://sepolia.arbiscan.io/address/0xda222533d71C37A9370C6b5a26BcB4C07EcB0454) |
| mWETH | `0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c` | [View](https://sepolia.arbiscan.io/address/0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c) |
| mETH | `0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2` | [View](https://sepolia.arbiscan.io/address/0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2) |

### Key Functions

```solidity
// Submit encrypted order for batch auction
function submitOrder(
    bytes calldata encryptedData,
    bytes32 datasetAddress,
    address tokenIn,
    address tokenOut,
    uint256 amountIn
) external returns (bytes32 orderId)

// Create limit order
function submitLimitOrder(
    bytes calldata encryptedData,
    bytes32 datasetAddress,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 limitPrice,
    uint256 expiry
) external returns (bytes32 orderId)

// Instant swap with price feed
function instantSwap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut
) external nonReentrant

// Execute limit order when conditions met
function executeLimitOrder(bytes32 orderId) external nonReentrant
```

---

## 🔧 Tech Stack

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **wagmi/viem** - Ethereum interactions
- **RainbowKit** - Wallet connection

### Smart Contracts
- **Solidity 0.8.20** - Contract language
- **Foundry** - Development framework
- **OpenZeppelin** - Security libraries

### Backend
- **Node.js** - Keeper bot runtime
- **viem** - Blockchain interactions
- **CoinGecko API** - Price feeds

---

## 🔐 iExec DataProtector Usage

### Order Encryption Flow

```javascript
// 1. Create order data
const orderData = {
    tokenIn: "0x...",
    tokenOut: "0x...",
    amountIn: "1000000000000000000",
    minAmountOut: "990000000000000000"
};

// 2. Encrypt with DataProtector
const encryptedData = await dataProtector.encrypt(orderData);

// 3. Submit encrypted order
await shadowPool.submitOrder(
    encryptedData,
    datasetAddress,
    tokenIn,
    tokenOut,
    amountIn
);
```

### Privacy Guarantees

- Order details (amounts, prices) are encrypted
- Only the batch settlement can decrypt
- Prevents front-running and MEV extraction

---

## 🧪 Testing

```bash
# Run contract tests
cd contracts_foundry
forge test -vvv

# Run frontend in development
cd frontend
npm run dev
```

---

## 🛣️ Roadmap

- [x] Confidential batch auctions with iExec DataProtector
- [x] Instant swaps with price feeds
- [x] Limit orders with auto-execution
- [x] Keeper bot for price monitoring
- [x] Transaction history from blockchain
- [x] Analytics dashboard
- [ ] Multi-chain deployment (Mainnet, Base, Optimism)
- [ ] Advanced order types (stop-loss, trailing stop)
- [ ] Liquidity provider incentives
- [ ] Governance token

---

## 🏆 Hackathon Submission

### What Was Built During the Hackathon

This project was built from scratch during the hackathon:

1. **Smart Contracts**: ShadowPool with batch auctions, limit orders, instant swaps
2. **iExec Integration**: DataProtector encryption for order confidentiality
3. **Frontend**: Complete dApp with swap interface, limit orders, dashboard
4. **Keeper Bot**: Automated price monitoring and order execution
5. **Documentation**: Comprehensive setup and usage guides

### Technologies Used

- **iExec DataProtector**: Order encryption and confidential computing
- **Arbitrum Sepolia**: L2 deployment for low gas costs
- **CoinGecko API**: Real-time price feeds

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 👥 Team

Built with ❤️ by the ShadowSwap Team

---

<div align="center">

**[⬆ Back to Top](#shadowswap---confidential-batch-auction-dex)**

</div>
