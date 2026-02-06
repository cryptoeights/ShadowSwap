# ShadowSwap Demo Video Script

**Duration:** 4 minutes (max)  
**Language:** English  
**Purpose:** Hackathon submission - iExec Hack4Privacy  
**Chain:** Arbitrum Sepolia Testnet

---

## VIDEO SCRIPT

### [0:00 - 0:25] THE PROBLEM (25 seconds)

**[SCREEN: Show DeFi news headlines about MEV / sandwich attacks, or simple text slides]**

> "Every day, DeFi users lose millions of dollars to MEV attacks.
>
> When you submit a swap on a traditional DEX, your transaction details sit in the mempool - completely visible. Sniper bots can front-run your trade, sandwich it, or copy your strategy.
>
> What if your order was invisible until execution? That's what ShadowSwap does."

---

### [0:25 - 0:50] THE SOLUTION (25 seconds)

**[SCREEN: ShadowSwap app homepage at localhost:3000]**

> "ShadowSwap is a confidential DEX built on Arbitrum Sepolia that uses iExec DataProtector to encrypt every order before it touches the blockchain.
>
> We deployed a real iExec iApp - a TEE application running inside Intel SGX enclaves - that processes orders privately.
>
> Let me show you the two main features: MEV-Protected Market Swaps and Encrypted Limit Orders."

---

### [1:00 - 2:00] DEMO 1: MEV-PROTECTED MARKET SWAP (60 seconds)

**[SCREEN: SwapCard with Market tab selected]**

> "First, I'll connect my wallet."

**[ACTION: Connect wallet via RainbowKit]**

> "Now let's do a market swap. Notice this toggle: MEV Protection. When enabled, your swap is encrypted with iExec DataProtector before submission."

**[ACTION: Point to the MEV Protection toggle - show it's ON by default]**

> "The toggle shows four protections: hidden from bots, anti front-run, TEE encrypted, and anti copy-trade."

**[ACTION: Select mWETH → mUSDC, enter amount like 0.1]**

> "When I click Private Swap, watch the process:"

**[ACTION: Click "Private Swap (MEV Protected)" button]**

> "Step one: the app calls iExec DataProtector's protectData function - encrypting my swap details and storing them on IPFS.
>
> Step two: grantAccess authorizes our deployed iApp to decrypt this data inside a TEE."

**[SCREEN: Show the purple encryption progress panel with the two steps]**

> "Now the encrypted order is submitted to the ShadowPool smart contract on Arbitrum Sepolia."

**[ACTION: Confirm in MetaMask, wait for success]**

> "Done! And here are two on-chain records I can verify:"

**[ACTION: Point to success panel showing both links]**

> "First, the Arbiscan link showing the transaction on Arbitrum Sepolia."

**[ACTION: Click Arbiscan link - briefly show the transaction]**

> "And second, the iExec Explorer link showing my Protected Data - this is the encrypted dataset created by DataProtector."

**[ACTION: Click iExec Explorer link - show the dataset page at explorer.iex.ec/arbitrum-sepolia-testnet/dataset/0x...]**

> "This proves the encryption happened on-chain. No bot could read my order details."

---

### [2:00 - 3:00] DEMO 2: ENCRYPTED LIMIT ORDER (60 seconds)

**[SCREEN: Switch to Limit tab in SwapCard]**

> "Now let's create an encrypted limit order. I want to sell mWETH when ETH reaches a specific price."

**[ACTION: Switch to Limit tab. Select mWETH → mUSDC. Enter amount. Set a limit price slightly above current]**

> "Notice the header shows 'Private' badge and the info panel confirms iExec DataProtector TEE encryption is active, with a link to our deployed iApp."

**[ACTION: Point to the purple "Private" badge and iApp link]**

> "When I submit, the same encryption flow happens - protectData encrypts my limit price and target, grantAccess authorizes the iApp."

**[ACTION: Click Submit Limit Order, confirm in MetaMask]**

> "My encrypted limit order is now on-chain. Let's check the Limit Orders Panel."

**[SCREEN: Show LimitOrdersPanel on the right side]**

> "Here I can see my pending order: the current ETH price updating in real-time, my target price, and a progress bar. The Keeper Bot status shows whether our automated execution system is running."

**[ACTION: Point to Live Price Ticker and Keeper Bot status]**

> "When the price reaches my target, the keeper bot automatically executes the order. And in Transaction History below, every transaction has links to both Arbiscan and iExec Explorer."

**[ACTION: Scroll to Transaction History, show the Arbiscan and iExec Explorer links, and TEE Encrypted badge]**

---

### [3:00 - 3:40] TECHNICAL ARCHITECTURE (40 seconds)

**[SCREEN: Show code or architecture diagram]**

> "Here's what makes ShadowSwap unique technically:
>
> First, we deployed a real iExec iApp at address 0x834255 on Arbitrum Sepolia Testnet. This is a TEE application that runs inside Intel SGX enclaves."

**[SCREEN: Show iExec Explorer app page or the iApp address]**

> "Second, we use the iExec DataProtector SDK in the frontend. When a user submits any order, protectData encrypts the order details - token addresses, amounts, limit prices - and stores them as a Protected Dataset on-chain.
>
> Then grantAccess authorizes our iApp to decrypt the data. Only inside the TEE can the order be read. No validator, no MEV bot, no one can see your trade.
>
> Third, we built a custom gas-boosted provider that wraps the Ethereum provider to fix gas fee issues on Arbitrum Sepolia - a practical solution we documented in our FEEDBACK.md."

**[SCREEN: Briefly show the code snippet of protectData call]**

```javascript
const protectedData = await dataProtector.core.protectData({
    data: { tokenIn, tokenOut, amountIn, limitPrice },
    name: 'ShadowSwap-Order'
});
await dataProtector.core.grantAccess({
    protectedData: protectedData.address,
    authorizedApp: IEXEC_IAPP_ADDRESS
});
```

---

### [3:40 - 4:00] CLOSING (20 seconds)

**[SCREEN: Return to ShadowSwap main page, show GitHub URL]**

> "ShadowSwap demonstrates how iExec DataProtector solves a real DeFi problem: protecting users from MEV attacks through confidential computing.
>
> Everything is open source, deployed on Arbitrum Sepolia, and fully documented. Check out our GitHub repository for the complete code and deployment guide.
>
> Thank you for watching!"

**[SCREEN: Show end card with:]**
- GitHub: github.com/cryptoeights/ShadowSwap
- iApp: 0x834255dF01eE89d5096371a7eeFaF4332d4e2bfF
- ShadowPool: 0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09

---

## RECORDING CHECKLIST

### Before Recording

- [ ] MetaMask connected to **Arbitrum Sepolia** testnet
- [ ] Wallet has testnet ETH (get from faucet if needed)
- [ ] Frontend running: `cd frontend && npm run dev` → localhost:3000
- [ ] Already have some mUSDC and mWETH tokens (mint from faucet in app)
- [ ] Clear browser console
- [ ] Browser zoom: 100%, resolution: 1920x1080
- [ ] Disable browser notifications
- [ ] Close unnecessary tabs

### Test Before Recording (DRY RUN)

1. [ ] Connect wallet works
2. [ ] MEV Protection toggle works (ON/OFF)
3. [ ] Market swap with MEV Protection ON → shows encryption progress → success with both links
4. [ ] Click Arbiscan link → tx visible
5. [ ] Click iExec Explorer link → dataset visible
6. [ ] Limit order submits → appears in Limit Orders Panel
7. [ ] Transaction History shows entries with Arbiscan + iExec links
8. [ ] No console errors

### Recording Tips

- Use **OBS Studio** (free) or **Loom** (easy sharing)
- Record at 1080p
- Speak slowly and clearly
- Pause briefly at each step so viewers can follow
- Keep mouse movements smooth
- If MetaMask popup appears, wait for it and explain what's happening

---

## TIMESTAMPS REFERENCE

| Time | Section | Duration | Key Message |
|------|---------|----------|-------------|
| 0:00 | Problem | 25s | MEV attacks cost DeFi users millions |
| 0:25 | Solution | 25s | ShadowSwap + iExec DataProtector + TEE |
| 1:00 | Demo: MEV Swap | 60s | Private swap with encryption, two on-chain proofs |
| 2:00 | Demo: Limit Order | 60s | Encrypted limit, keeper bot, iExec Explorer |
| 3:00 | Technical | 40s | iApp deployment, DataProtector SDK, architecture |
| 3:40 | Closing | 20s | Open source, GitHub link, thank you |

---

*Last updated: February 2026*
