# Hackathon Submission Guide - iExec Hack4Privacy

## Submission Checklist

Use this checklist to verify everything is ready before submitting.

---

### 1. GitHub Repository

| Requirement | Status | Details |
|-------------|--------|---------|
| Public repository | Check | https://github.com/cryptoeights/ShadowSwap |
| Complete open-source code | Check | All source code included |
| README with installation instructions | Check | README.md at root |
| Comprehensive documentation | Check | `/docs/` folder with 7+ guides |
| Functional frontend | Check | Next.js app in `/frontend/` |
| FEEDBACK.md for iExec tools | Check | FEEDBACK.md at root |

---

### 2. Deployed on Arbitrum Sepolia

| Contract | Address | Verified |
|----------|---------|----------|
| ShadowPool (DEX) | `0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09` | [Arbiscan](https://sepolia.arbiscan.io/address/0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09) |
| MockPriceFeed | `0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006` | [Arbiscan](https://sepolia.arbiscan.io/address/0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006) |
| mUSDC | `0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e` | [Arbiscan](https://sepolia.arbiscan.io/address/0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e) |
| mDAI | `0xda222533d71C37A9370C6b5a26BcB4C07EcB0454` | [Arbiscan](https://sepolia.arbiscan.io/address/0xda222533d71C37A9370C6b5a26BcB4C07EcB0454) |
| mWETH | `0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c` | [Arbiscan](https://sepolia.arbiscan.io/address/0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c) |
| mETH | `0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2` | [Arbiscan](https://sepolia.arbiscan.io/address/0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2) |
| iExec iApp (TEE) | `0x834255dF01eE89d5096371a7eeFaF4332d4e2bfF` | [iExec Explorer](https://explorer.iex.ec/arbitrum-sepolia-testnet/app/0x834255dF01eE89d5096371a7eeFaF4332d4e2bfF) |

---

### 3. Evaluation Criteria Mapping

#### Criteria 1: Deployed on Arbitrum Sepolia
- All smart contracts deployed and verified on Arbitrum Sepolia (links above)
- iExec iApp deployed on arbitrum-sepolia-testnet chain
- Docker image: `cryptoeights/shadowswap-order-processor:1.0.0-tee-scone`
- Frontend connects to Arbitrum Sepolia via RPC proxy

#### Criteria 2: FEEDBACK.md
- Located at repository root: `/FEEDBACK.md`
- Covers: SDK usability, documentation quality, challenges, suggestions
- Includes feature requests: batch encryption, time-locked decryption, threshold decryption
- Overall assessment with ratings table

#### Criteria 3: Technical Implementation (iExec Privacy Tools)
- **iExec DataProtector SDK**: Used for encrypting order data (market + limit orders)
- **protectData()**: Encrypts swap details (tokens, amounts, prices) and stores on IPFS
- **grantAccess()**: Authorizes our deployed iApp to decrypt in TEE
- **iExec iApp**: Deployed TEE application (`iexec-app/src/app.js`) that processes orders in Intel SGX enclave
- **Gas-Boosted Provider**: Custom proxy that fixes gas fees for DataProtector on Arbitrum Sepolia
- **On-Chain Tracking**: Every encryption creates verifiable records on iExec Explorer

Key files:
- `frontend/src/lib/encryption.ts` - DataProtector integration with gas boost
- `iexec-app/src/app.js` - TEE application for order processing
- `iexec-app/Dockerfile` - Docker image for SGX enclave

#### Criteria 4: Real World Use Case
- **Problem**: MEV attacks (front-running, sandwich, copy trading) cost DeFi users millions daily
- **Solution**: Encrypt orders with DataProtector before on-chain submission
- **Impact**: No validator, MEV bot, or observer can see trade details until execution
- **Features**:
  - MEV-Protected Market Swaps (toggle on/off)
  - Encrypted Limit Orders with auto-execution
  - Keeper Bot for automated order execution
  - Real-time price tracking from CoinGecko

#### Criteria 5: Code Quality
- **Smart Contracts**: Solidity with Foundry, OpenZeppelin base
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Architecture**: Clean separation of concerns (hooks, lib, components)
- **Documentation**: 7+ docs covering setup, deployment, architecture, API, iExec integration
- **Error Handling**: Gas boost proxy, CORS proxy, fallback encryption
- **Git History**: Clean commits with descriptive messages

#### Criteria 6: UX (User Experience)
- Modern dark theme UI with smooth transitions
- One-click MEV Protection toggle with visual explanation
- Real-time encryption progress (protectData → grantAccess steps)
- On-chain verification links (Arbiscan + iExec Explorer) after every transaction
- Live price ticker with real CoinGecko data
- Limit Orders Panel with progress bars and keeper bot status
- Transaction History with TEE Encrypted badges
- Built-in faucet for easy testing
- Dashboard with personalized stats
- Analytics page with global DEX metrics

---

### 4. Demo Video

**What to show in the video (4 min max):**

1. **Problem** (25s) - MEV attacks in DeFi
2. **Solution** (25s) - ShadowSwap + iExec DataProtector
3. **Demo: Private Swap** (60s) - MEV Protection toggle → encrypt → submit → show Arbiscan + iExec Explorer links
4. **Demo: Limit Order** (60s) - Encrypted limit → Limit Orders Panel → Transaction History with iExec links
5. **Technical** (40s) - iApp deployment, DataProtector SDK, architecture
6. **Closing** (20s) - Open source, GitHub link

See full script: `/docs/DEMO_VIDEO_SCRIPT.md`

---

### 5. Submission Form Fields

Fill in the submission form with:

| Field | Value |
|-------|-------|
| **Project Name** | ShadowSwap |
| **Team Name** | CryptoEights |
| **GitHub URL** | https://github.com/cryptoeights/ShadowSwap |
| **Demo Video URL** | (upload to YouTube/Loom and paste link) |
| **Description** | ShadowSwap is a confidential DEX that uses iExec DataProtector to encrypt swap orders, protecting users from MEV attacks (front-running, sandwich attacks, copy trading). Features MEV-protected market swaps and encrypted limit orders with automated execution. Deployed on Arbitrum Sepolia with a real iExec iApp running in Intel SGX TEE. |
| **iExec Tools Used** | iExec DataProtector (protectData, grantAccess), iExec iApp (TEE application deployed on arbitrum-sepolia-testnet) |
| **Chain** | Arbitrum Sepolia |
| **Category** | Confidential DeFi |

---

### 6. Quick Verification Steps

Before submitting, verify these work:

```bash
# 1. Clone and run
git clone https://github.com/cryptoeights/ShadowSwap
cd ShadowSwap/frontend
npm install
npm run dev
# Open http://localhost:3000

# 2. Connect wallet to Arbitrum Sepolia in MetaMask

# 3. Test market swap with MEV Protection ON
#    - Should see encryption progress
#    - Should see Arbiscan + iExec Explorer links on success

# 4. Test limit order
#    - Should appear in Limit Orders Panel
#    - Transaction History shows TEE Encrypted badge

# 5. Verify on-chain
#    - Click Arbiscan link → transaction exists
#    - Click iExec Explorer link → dataset exists
```

---

### 7. Repository Structure (What Judges Will See)

```
ShadowSwap/
├── README.md                    # Project overview & instructions
├── FEEDBACK.md                  # iExec tools feedback (REQUIRED)
├── LICENSE                      # MIT License
├── CONTRIBUTING.md              # Contribution guidelines
├── .gitignore
│
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── app/                 # Pages (home, dashboard, analytics)
│   │   ├── components/swap/     # SwapCard, LimitOrdersPanel, TransactionHistory
│   │   ├── hooks/               # useShadowPool, useBlockchainHistory, useBatchEvents
│   │   ├── lib/                 # encryption.ts, contracts.ts, tokens.ts, prices.ts
│   │   └── providers/           # Web3Provider with RPC proxy
│   └── package.json
│
├── contracts_foundry/           # Smart contracts (Solidity + Foundry)
│   ├── src/                     # ShadowPool, MockPriceFeed, MockERC20, etc.
│   └── script/                  # Deployment scripts
│
├── iexec-app/                   # iExec iApp (TEE application)
│   ├── src/app.js               # Order processor for Intel SGX enclave
│   ├── Dockerfile               # Docker image for TEE deployment
│   ├── iapp.config.json         # iApp configuration
│   └── README.md
│
├── keeper-bot/                  # Automated order execution bot
│   └── src/index.js             # Price monitoring + limit order executor
│
└── docs/                        # Documentation
    ├── SETUP.md                 # Installation guide
    ├── DEPLOYMENT.md            # Contract deployment guide
    ├── ARCHITECTURE.md          # System design
    ├── IEXEC_INTEGRATION.md     # DataProtector usage details
    ├── IEXEC_IAPP_DEPLOYMENT.md # iApp build & deploy guide
    ├── API.md                   # Smart contract reference
    ├── DEMO_VIDEO_SCRIPT.md     # Video recording script
    └── SUBMISSION_GUIDE.md      # This file
```

---

*Good luck with the submission!*
