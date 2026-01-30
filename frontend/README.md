# ShadowSwap - Confidential Batch Auction DEX

<p align="center">
  <strong>MEV-Protected Decentralized Exchange with Encrypted Orders</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#architecture">Architecture</a>
</p>

---

## 🎯 Problem Statement

Traditional DEXs suffer from **MEV (Maximal Extractable Value)** attacks where miners/validators can:
- **Front-run** your trades by seeing pending transactions
- **Sandwich attack** trades for profit at user expense
- **Reorder transactions** to extract value from users

This results in users receiving worse execution prices and losing value on every trade.

## 💡 Solution

**ShadowSwap** is a confidential batch auction DEX that protects users from MEV attacks by:

1. **Encrypting order data** using iExec DataProtector
2. **Batching orders** together for simultaneous execution
3. **Executing in TEE** (Trusted Execution Environment) where order details remain hidden
4. **Uniform clearing price** - all orders in a batch get the same fair price

## ✨ Features

- 🔒 **Encrypted Orders** - Order details hidden using iExec DataProtector
- 🛡️ **MEV Protection** - No front-running or sandwich attacks possible
- ⚖️ **Fair Pricing** - Batch auction ensures equal treatment for all traders
- ⏱️ **Batch Trading** - Orders collected and executed in timed batches
- 📊 **Real-time Analytics** - Track batch statistics and order history
- 🔗 **Web3 Native** - Connect with MetaMask, WalletConnect, and more

## 🔧 How It Works

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User      │───▶│ iExec DataProtector │───▶│  ShadowPool     │
│ Submits     │    │ (Encrypt Order)   │    │  (Store Order)  │
│ Order       │    └──────────────────┘    └─────────────────┘
└─────────────┘                                     │
                                                    ▼
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User      │◀───│ Batch Execution   │◀───│  TEE (iExec)    │
│ Receives    │    │ (Fair Price)      │    │ (Decrypt & Match)│
│ Tokens      │    └──────────────────┘    └─────────────────┘
```

1. **Submit Order**: User creates a swap order (token pair, amount)
2. **Encrypt**: Order data is encrypted using iExec DataProtector
3. **Store**: Encrypted order is stored in ShadowPool smart contract
4. **Wait**: Orders accumulate until batch interval completes
5. **Execute**: TEE decrypts orders and calculates fair clearing price
6. **Settle**: All orders execute at the same price

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Web3 | wagmi, viem, RainbowKit |
| Privacy | **iExec DataProtector** |
| Network | Arbitrum Sepolia (Testnet) |
| Icons | Lucide React |

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MetaMask or compatible Web3 wallet
- Test ETH on Arbitrum Sepolia

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/cryptoeights/ShadowSwap.git
   cd ShadowSwap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your values:
   ```env
   # WalletConnect Project ID (get from https://cloud.walletconnect.com)
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   
   # Contract Addresses (Arbitrum Sepolia)
   NEXT_PUBLIC_SHADOW_POOL_ADDRESS=0x...
   
   # iExec Configuration
   NEXT_PUBLIC_IEXEC_IAPP_ADDRESS=0x...
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🚀 Usage

### Connecting Wallet

1. Click "Connect Wallet" button
2. Select your preferred wallet (MetaMask, WalletConnect, etc.)
3. Approve the connection
4. Ensure you're on Arbitrum Sepolia network

### Placing a Swap Order

1. Select the token you want to swap **from**
2. Select the token you want to receive
3. Enter the amount
4. Click "Swap" to encrypt and submit your order
5. Approve the transaction in your wallet
6. Wait for the next batch execution

### Viewing Orders

Navigate to **Dashboard** to view:
- Your pending orders
- Order history
- Current batch status
- Time until next execution

## 🏗️ Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page with SwapCard
│   ├── dashboard/         # Order history & analytics
│   ├── analytics/         # Trading analytics
│   └── settings/          # User preferences
├── components/
│   ├── swap/              # Swap interface components
│   ├── orders/            # Order list & management
│   ├── ui/                # Reusable UI components
│   └── layout/            # Header, navigation
├── hooks/
│   ├── useShadowPool.ts   # Smart contract interactions
│   ├── useBatchEvents.ts  # Event listeners
│   └── usePrices.ts       # Token price fetching
├── lib/
│   ├── encryption.ts      # iExec DataProtector integration
│   ├── contracts.ts       # Contract ABIs & addresses
│   ├── tokens.ts          # Token configurations
│   └── subgraph.ts        # GraphQL queries
└── providers/             # React context providers
```

## 🔐 iExec DataProtector Integration

ShadowSwap uses **iExec DataProtector** to encrypt sensitive order data:

```typescript
// From src/lib/encryption.ts
import { IExecDataProtector } from '@iexec/dataprotector';

const dataProtector = new IExecDataProtector(window.ethereum, {
    isExperimental: true,
});

// Protect order data
const protectedData = await dataProtector.core.protectData({
    data: {
        orderType: 'market',
        tokenIn: '0x...',
        amountIn: '1000000000000000000',
        // ... other order details
    },
    name: `ShadowSwap-Order-${Date.now()}`,
});

// Grant access to TEE app
await dataProtector.core.grantAccess({
    protectedData: protectedData.address,
    authorizedApp: IEXEC_IAPP_ADDRESS,
});
```

This ensures:
- ✅ Order details are encrypted before on-chain storage
- ✅ Only the authorized TEE app can decrypt
- ✅ MEV attackers cannot see pending orders

## 📜 Smart Contract

The **ShadowPool** contract handles:
- Order submission with encrypted data
- Batch management and timing
- Order execution and settlement

Key functions:
- `submitOrder()` - Submit encrypted market order
- `submitLimitOrder()` - Submit encrypted limit order
- `cancelOrder()` - Cancel pending order
- `executeBatch()` - TEE executes batch (restricted)

## 🧪 Testing

```bash
# Run linting
npm run lint

# Build for production
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source under the MIT License.

## 🔗 Links

- [iExec DataProtector Docs](https://tools.docs.iex.ec/tools/dataProtector)
- [Arbitrum Sepolia Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia)
- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction)

---

<p align="center">
  Built with ❤️ for the <strong>iExec Hack4Privacy Hackathon</strong>
</p>
