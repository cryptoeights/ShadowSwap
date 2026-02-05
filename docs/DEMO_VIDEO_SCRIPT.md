# ShadowSwap Demo Video Script

**Duration:** 4 minutes  
**Language:** English  
**Purpose:** Hackathon submission demo showcasing iExec DataProtector integration

---

## VIDEO SCRIPT

### [0:00 - 0:30] INTRODUCTION - The Problem

**[VISUAL: Show news headlines about MEV attacks, sandwich attacks statistics]**

> "Every day, DeFi users lose millions of dollars to MEV attacks. When you submit a swap on a traditional DEX, your transaction sits in the mempool, completely visible to everyone.
>
> Validators and bots see your pending trade, front-run it to buy tokens before you, then sell them back to you at a higher price. This is called a sandwich attack, and it happens thousands of times per day.
>
> The question is: how do we trade on-chain without exposing our order details?"

---

### [0:30 - 1:00] THE SOLUTION - ShadowSwap

**[VISUAL: Show ShadowSwap logo and landing page]**

> "Introducing ShadowSwap - a confidential batch auction DEX that leverages iExec DataProtector to encrypt your orders before they ever touch the blockchain.
>
> With ShadowSwap, your order details - the tokens, amounts, and prices - are encrypted using iExec's confidential computing technology. No one can see what you're trading until the batch is settled.
>
> Let me show you how it works."

---

### [1:00 - 1:30] DEMO - Connecting & Getting Tokens

**[VISUAL: Screen recording of the app]**

> "First, I'll connect my wallet to Arbitrum Sepolia testnet."

**[ACTION: Click Connect Wallet, select MetaMask, approve connection]**

> "Now I need some test tokens. ShadowSwap includes a built-in faucet for testing."

**[ACTION: Go to Settings, click Mint for mUSDC and mWETH]**

> "I'm minting some mock USDC and mock WETH. These mock tokens track real-world prices from CoinGecko, so we can test with realistic market conditions."

**[ACTION: Wait for confirmations, show updated balances]**

---

### [1:30 - 2:15] DEMO - Instant Swap with Price Sync

**[VISUAL: SwapCard interface]**

> "Let's do an instant swap. I'll swap mWETH for mUSDC.
>
> Notice what happens when I click swap - the system first fetches the current ETH price from CoinGecko, then syncs that price to our on-chain price oracle. This ensures you always get accurate, real-time pricing."

**[ACTION: Select mWETH → mUSDC, enter 0.5, click Swap]**

> "The transaction is now being processed..."

**[ACTION: Wait for confirmation, show success message]**

> "Done! And here's my transaction on Arbiscan. I received the exact amount expected based on the current market rate."

**[ACTION: Click Arbiscan link to show transaction]**

---

### [2:15 - 3:00] DEMO - Limit Orders with iExec Encryption

**[VISUAL: Limit order tab]**

> "Now here's where iExec DataProtector really shines - limit orders.
>
> I want to sell my mWETH, but only when ETH reaches a higher price. I'll set a target price and submit the order."

**[ACTION: Switch to Limit tab, set target price $50 above current]**

> "When I click submit, watch what happens. The order data - including my target price and amount - is encrypted using iExec DataProtector before being sent to the blockchain.
>
> This means no one can see my trading strategy. No bot can front-run my limit order."

**[ACTION: Click Submit Limit Order, wait for confirmation]**

> "My encrypted order is now stored on-chain. Let's look at the Limit Orders Panel."

**[VISUAL: Show LimitOrdersPanel with the pending order]**

> "Here you can see my order status - the current ETH price, my target price, and a progress bar showing how close we are. The 'Keeper Bot Active' indicator shows that our automated system is monitoring prices."

---

### [3:00 - 3:30] iExec DataProtector - Technical Deep Dive

**[VISUAL: Architecture diagram or code snippets]**

> "Let me explain the technical implementation.
>
> When you submit an order, ShadowSwap uses the iExec DataProtector SDK to encrypt your order data client-side. The encrypted blob and a dataset address are then stored in our ShadowPool smart contract.
>
> Here's the key insight: the encrypted data cannot be decrypted by validators, MEV bots, or anyone watching the mempool. Only the authorized settlement process can access the original order details.
>
> For limit orders, our keeper bot monitors real-time prices and automatically executes orders when conditions are met - all while keeping your strategy private until execution.
>
> This is true MEV protection through confidential computing."

**[VISUAL: Show code snippet of encryption]**

```javascript
// Order encryption with iExec DataProtector
const protectedData = await dataProtector.protectData({
    data: {
        tokenIn, tokenOut, amountIn, limitPrice
    },
    name: 'ShadowSwap-Order'
});
```

---

### [3:30 - 3:50] Additional Features

**[VISUAL: Quick tour of Dashboard and Analytics]**

> "ShadowSwap also includes a comprehensive dashboard showing your order history, all synced from blockchain events. And our analytics page displays global DEX statistics in real-time.
>
> Everything is open source, fully documented, and deployed on Arbitrum Sepolia."

**[ACTION: Quick navigation through Dashboard → Analytics]**

---

### [3:50 - 4:00] CONCLUSION

**[VISUAL: Return to main page, show GitHub link]**

> "ShadowSwap demonstrates how iExec DataProtector can solve real problems in DeFi - protecting users from MEV attacks while maintaining the transparency and trustlessness of blockchain.
>
> Check out our GitHub repository for the full source code, documentation, and deployment guide.
>
> Thank you for watching!"

**[VISUAL: Show links]**
- GitHub: github.com/cryptoeights/ShadowSwap
- Contract: sepolia.arbiscan.io/address/0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09

---

## KEY POINTS TO EMPHASIZE

### iExec Tools Used

| Tool | How We Use It |
|------|---------------|
| **iExec DataProtector SDK** | Encrypts order data (amounts, prices, tokens) before on-chain submission |
| **Protected Data** | Stores encrypted order details that only authorized apps can decrypt |
| **Dataset Registry** | References encrypted data on-chain without exposing contents |

### Why iExec for MEV Protection?

1. **Client-side Encryption**: Orders encrypted before leaving your browser
2. **On-chain Privacy**: Encrypted blob stored on blockchain, invisible to validators
3. **Selective Decryption**: Only authorized settlement process can decrypt
4. **Trustless**: No centralized party can see your orders

### Features to Highlight

1. **Instant Swaps** - Real-time price syncing with CoinGecko
2. **Limit Orders** - Encrypted target prices, auto-execution
3. **Keeper Bot** - Automated price monitoring and order execution
4. **Transaction History** - Persistent history from blockchain events
5. **Analytics Dashboard** - Real-time DEX statistics

---

## RECORDING CHECKLIST

### Before Recording
- [ ] MetaMask connected to Arbitrum Sepolia
- [ ] Wallet has testnet ETH (~0.01 ETH)
- [ ] Clear browser cache
- [ ] Frontend running at localhost:3000
- [ ] Keeper bot running (optional, for live execution)

### Test Actions Before Recording
- [ ] Mint tokens works
- [ ] Instant swap completes
- [ ] Limit order submits
- [ ] Dashboard loads history
- [ ] Analytics shows data

### Recording Settings
- Resolution: 1920x1080
- Browser zoom: 100%
- Disable notifications
- Use quality microphone

### Recommended Tools
- **OBS Studio** - Free screen recording
- **Loom** - Easy sharing
- **DaVinci Resolve** - Free video editing

---

## TRANSCRIPT TIMESTAMPS

| Time | Section | Key Message |
|------|---------|-------------|
| 0:00 | Intro | MEV problem costs millions |
| 0:30 | Solution | ShadowSwap + iExec encryption |
| 1:00 | Demo 1 | Connect wallet, mint tokens |
| 1:30 | Demo 2 | Instant swap with price sync |
| 2:15 | Demo 3 | Limit order with encryption |
| 3:00 | Technical | iExec DataProtector deep dive |
| 3:30 | Features | Dashboard, Analytics |
| 3:50 | Conclusion | GitHub, thank you |

---

## ALTERNATIVE SHORTER SCRIPT (2 minutes)

If you need a shorter version:

> "Traditional DEXs expose your trades to MEV attacks - front-running and sandwich attacks cost users millions daily.
>
> ShadowSwap solves this using iExec DataProtector. Your order data is encrypted before touching the blockchain - amounts, prices, tokens - all hidden from validators and bots.
>
> [DEMO: Quick swap and limit order]
>
> For limit orders, the encryption ensures no one can see your target price until execution. Our keeper bot monitors prices and auto-executes when conditions are met.
>
> This is MEV protection through confidential computing. Check out our GitHub for the full source code.
>
> Thank you!"

---

*Last updated: January 2026*
