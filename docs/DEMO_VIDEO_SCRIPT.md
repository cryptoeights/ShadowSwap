# Demo Video Script

This is a script/outline for creating the ShadowSwap demo video for hackathon submission.

**Recommended Duration:** 3-5 minutes

---

## Video Outline

### 1. Introduction (30 seconds)

**Script:**
> "Hi, I'm presenting ShadowSwap - a confidential batch auction DEX with MEV protection, built using iExec DataProtector.
>
> Traditional DEXs suffer from front-running and sandwich attacks. ShadowSwap solves this by encrypting orders before on-chain submission, ensuring fair price execution for everyone."

**Visuals:**
- Show ShadowSwap logo/landing page
- Brief animation of MEV attack vs protected swap

---

### 2. Connect Wallet (20 seconds)

**Script:**
> "Let me show you how it works. First, I'll connect my MetaMask wallet to Arbitrum Sepolia testnet."

**Actions:**
1. Click "Connect Wallet" button
2. Select MetaMask
3. Approve connection
4. Show connected state with address

---

### 3. Get Test Tokens (30 seconds)

**Script:**
> "To test, I'll mint some mock tokens from our faucet. These are test versions of USDC, DAI, and WETH that track real prices."

**Actions:**
1. Navigate to Settings/Faucet
2. Click "Mint" for mUSDC
3. Wait for transaction confirmation
4. Show token balance updated
5. Repeat for mWETH

---

### 4. Instant Swap Demo (45 seconds)

**Script:**
> "Now let's do an instant swap. I'll swap mWETH for mUSDC at the current market price.
>
> Notice how the app first syncs the latest ETH price from CoinGecko to the on-chain oracle, ensuring accurate pricing."

**Actions:**
1. Select mWETH as input token
2. Select mUSDC as output token
3. Enter amount (e.g., 0.5 mWETH)
4. Show quote updating with live price
5. Click "Approve"
6. Wait for approval confirmation
7. Click "Swap"
8. Wait for transaction confirmation
9. Show success message with Arbiscan link
10. Click link to show transaction on explorer

---

### 5. Limit Order Demo (60 seconds)

**Script:**
> "ShadowSwap also supports limit orders. I'll create an order to sell mWETH when the price reaches a specific target.
>
> The order is encrypted using iExec DataProtector before submission, hiding my trade details from validators and bots.
>
> When the price reaches my target, our keeper bot automatically executes the order."

**Actions:**
1. Switch to "Limit" tab
2. Select mWETH → mUSDC
3. Enter amount (e.g., 1 mWETH)
4. Set target price (slightly above current, e.g., $2800)
5. Click "Submit Limit Order"
6. Show encryption process
7. Wait for transaction confirmation
8. Point to "Limit Orders Panel" showing the pending order
9. Show status: current price, target price, progress bar
10. Show "Keeper Bot: Active" indicator

---

### 6. Dashboard & History (30 seconds)

**Script:**
> "The dashboard shows all your orders and complete transaction history. This data is loaded directly from the blockchain, so your history persists across sessions."

**Actions:**
1. Navigate to Dashboard
2. Show pending limit orders with details
3. Show transaction history
4. Click on a transaction to open Arbiscan
5. Point out statistics (total orders, volume)

---

### 7. Analytics (20 seconds)

**Script:**
> "The analytics page shows global DEX statistics - total volume, swaps executed, and recent batches. All data is fetched from real blockchain events."

**Actions:**
1. Navigate to Analytics
2. Show key metrics
3. Show recent transactions
4. Toggle time period filter (24H → 7D)

---

### 8. Technical Architecture (30 seconds)

**Script:**
> "Under the hood, ShadowSwap uses:
> - iExec DataProtector for order encryption
> - Arbitrum Sepolia for low gas costs
> - A keeper bot that monitors prices and auto-executes limit orders
> - Smart contracts built with Foundry and OpenZeppelin"

**Visuals:**
- Show architecture diagram from README
- Highlight iExec integration

---

### 9. Conclusion (20 seconds)

**Script:**
> "ShadowSwap provides MEV protection through confidential computing, making DeFi safer and fairer for everyone.
>
> Thank you for watching! Check out our GitHub for the full source code and documentation."

**Visuals:**
- Show GitHub repo link
- Show team/contact info

---

## Recording Tips

### Technical Setup
- Screen resolution: 1920x1080
- Browser: Chrome with MetaMask
- Clear browser cache before recording
- Ensure test tokens are ready

### Best Practices
- Speak clearly and at moderate pace
- Pause briefly after each action
- Keep cursor movements smooth
- Highlight important UI elements

### Tools Recommended
- **Screen recording:** OBS Studio, Loom, or Camtasia
- **Editing:** DaVinci Resolve (free) or Adobe Premiere
- **Audio:** Use a good microphone, reduce background noise

---

## Checklist Before Recording

- [ ] MetaMask connected to Arbitrum Sepolia
- [ ] Wallet has testnet ETH for gas
- [ ] Mock tokens minted (mUSDC, mWETH)
- [ ] Keeper bot running (optional, for live execution demo)
- [ ] Frontend running on localhost:3000
- [ ] Browser zoom at 100%
- [ ] No notifications enabled
- [ ] Script rehearsed

---

## Video Hosting

Upload to:
1. **YouTube** (unlisted or public)
2. **Loom** (shareable link)
3. **Google Drive** (public access)

Make sure the link is accessible without requiring login.
