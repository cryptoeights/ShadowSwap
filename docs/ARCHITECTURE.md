# Architecture

This document explains the technical architecture of ShadowSwap.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Swap Card  │  │Limit Orders │  │  Dashboard  │  │   Analytics     │ │
│  │  (Market)   │  │   Panel     │  │   (User)    │  │   (Global)      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
└─────────┼────────────────┼────────────────┼──────────────────┼──────────┘
          │                │                │                  │
          ▼                ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           REACT HOOKS LAYER                              │
│  useShadowPool  │  useBlockchainHistory  │  useBatchEvents  │  etc.    │
└────────────────────────────────────────┬────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
          ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
          │   wagmi/viem    │  │   API Routes    │  │ iExec DataProt  │
          │  (Blockchain)   │  │   (Proxy/RPC)   │  │   (Encryption)  │
          └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
                   │                    │                    │
                   └────────────────────┼────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        ARBITRUM SEPOLIA BLOCKCHAIN                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                          ShadowPool.sol                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │ │
│  │  │ Batch Auction│  │ Instant Swap │  │     Limit Orders         │ │ │
│  │  │  submitOrder │  │  instantSwap │  │  submitLimitOrder        │ │ │
│  │  │ triggerBatch │  │              │  │  executeLimitOrder       │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │MockPriceFeed │  │  Mock ERC20  │  │      MockWETH/mETH           │   │
│  │  (Oracle)    │  │  (Tokens)    │  │  (Wrapped Native)            │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                        ▲
                                        │
┌───────────────────────────────────────┼─────────────────────────────────┐
│                           KEEPER BOT (Node.js)                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐ │
│  │ Price Monitor  │→ │  Price Update  │→ │   Order Execution          │ │
│  │  (CoinGecko)   │  │  (on-chain)    │  │   (executeLimitOrder)      │ │
│  └────────────────┘  └────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Smart Contracts

#### ShadowPool.sol

The main DEX contract handling:

| Function | Purpose |
|----------|---------|
| `submitOrder()` | Submit encrypted order for batch auction |
| `submitLimitOrder()` | Create limit order with target price |
| `instantSwap()` | Execute immediate swap using price feed |
| `executeLimitOrder()` | Execute limit order when conditions met |
| `triggerBatch()` | Settle batch orders at clearing price |
| `cancelOrder()` | Cancel pending order |

**Order Structure:**
```solidity
struct Order {
    address owner;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOutMin;
    uint256 limitPrice;      // For limit orders
    uint256 expiry;          // Expiration timestamp
    bytes32 datasetAddress;  // iExec DataProtector reference
    bytes encryptedData;     // Encrypted order details
    OrderStatus status;
    uint256 batchId;
    uint256 timestamp;
}
```

#### MockPriceFeed.sol

Oracle contract for price data:

```solidity
// Set token price in USD (18 decimals)
function setPrice(address token, uint256 priceUsd) external;

// Get exchange rate between two tokens
function getExchangeRate(address tokenIn, address tokenOut) 
    external view returns (uint256 rate);

// Calculate output amount for swap
function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) 
    external view returns (uint256 amountOut);
```

---

### 2. Frontend (Next.js)

#### Page Structure

```
src/
├── app/
│   ├── page.tsx          # Main swap page
│   ├── dashboard/        # User dashboard
│   ├── analytics/        # Global statistics
│   └── api/
│       ├── prices/       # CoinGecko proxy
│       └── rpc/          # RPC proxy (CORS fix)
├── components/
│   └── swap/
│       ├── SwapCard.tsx          # Main swap UI
│       ├── LimitOrdersPanel.tsx  # Limit order management
│       └── TransactionHistory.tsx # TX history
├── hooks/
│   ├── useShadowPool.ts      # Contract interactions
│   ├── useBlockchainHistory.ts # Event fetching
│   └── useBatchEvents.ts     # Real-time events
└── lib/
    ├── contracts.ts      # Addresses & ABIs
    ├── tokens.ts         # Supported tokens
    └── prices.ts         # Price fetching
```

#### Key Hooks

| Hook | Purpose |
|------|---------|
| `useInstantSwap` | Execute instant swap |
| `useSubmitLimitOrder` | Submit limit order |
| `useSyncPrices` | Update on-chain prices |
| `useBlockchainHistory` | Fetch TX history from events |
| `useLimitOrderExecutedEvents` | Listen for executions |

---

### 3. Keeper Bot

The keeper bot runs continuously to:

1. **Monitor Prices**: Fetch ETH/USD from CoinGecko every 30 seconds
2. **Update Oracle**: Push price updates to MockPriceFeed
3. **Check Orders**: Scan pending limit orders
4. **Execute Orders**: Call `executeLimitOrder()` when conditions met

```javascript
// Simplified keeper loop
async function keeperLoop() {
    while (true) {
        // 1. Fetch latest price
        const ethPrice = await fetchEthPrice();
        
        // 2. Update on-chain if changed significantly
        if (shouldUpdatePrice(ethPrice)) {
            await updateOnChainPrice(ethPrice);
        }
        
        // 3. Check pending limit orders
        const pendingOrders = await getPendingOrders();
        
        // 4. Execute orders that meet conditions
        for (const orderId of pendingOrders) {
            if (await canExecute(orderId)) {
                await executeLimitOrder(orderId);
            }
        }
        
        await sleep(30000); // 30 second interval
    }
}
```

---

## Data Flow

### Instant Swap Flow

```
User Input → Sync Prices → Pre-flight Check → Execute Swap → Update UI
    │            │              │                  │            │
    ▼            ▼              ▼                  ▼            ▼
[Amount]   [CoinGecko] → [Balance/Allow]    [instantSwap()]  [History]
           [setPrice()]                           │
                                                  ▼
                                            [InstantSwap Event]
```

### Limit Order Flow

```
User Input → Encrypt Data → Submit Order → Store On-chain
    │            │              │               │
    ▼            ▼              ▼               ▼
[Target    [DataProtector]  [submitLimit    [Order Struct]
 Price]                      Order()]
    
                    ↓ (Time passes, price changes)
    
Keeper Bot → Check canExecute() → executeLimitOrder() → User Receives Tokens
    │                │                    │
    ▼                ▼                    ▼
[Price       [Current Price    [Transfer tokens]
 Monitor]     vs Limit Price]   [Emit Event]
```

---

## Security Considerations

### MEV Protection

1. **Order Encryption**: Orders encrypted with iExec DataProtector
2. **Batch Settlement**: Multiple orders settled at uniform price
3. **No Mempool Exposure**: Encrypted data prevents front-running

### Smart Contract Security

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **SafeERC20**: Safe token transfers
3. **Ownable**: Admin functions protected
4. **Input Validation**: All parameters validated

### Access Control

```solidity
// Only owner can change critical settings
function setPriceFeed(address _priceFeed) external onlyOwner;

// Anyone can execute orders (permissionless)
function executeLimitOrder(bytes32 orderId) external;

// Only order owner can cancel
function cancelOrder(bytes32 orderId) external;
```

---

## Gas Optimization

### Batch Operations

```solidity
// Set multiple prices in one transaction
function setPrices(
    address[] calldata tokens, 
    uint256[] calldata pricesUsd
) external;
```

### View Functions

```solidity
// Read-only queries don't cost gas
function getSwapQuote(...) external view returns (uint256);
function canExecuteLimitOrder(...) external view returns (bool);
function getOrderDetails(...) external view returns (...);
```

---

## Future Improvements

1. **Decentralized Price Feeds**: Integrate Chainlink or Pyth
2. **Batch Auction Settlement**: iExec TEE for true confidential batch matching
3. **Cross-chain**: Deploy on multiple L2s with bridge support
4. **Advanced Orders**: Stop-loss, trailing stops, OCO orders
