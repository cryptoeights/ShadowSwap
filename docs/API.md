# API Reference

This document provides a complete reference for ShadowSwap smart contract functions.

## ShadowPool Contract

**Address (Arbitrum Sepolia):** `0x11a5f59AF554FCbB9D82C1Ba7f963912b2D5Bb8f`

---

## Write Functions

### submitOrder

Submit an encrypted order for the current batch auction.

```solidity
function submitOrder(
    bytes calldata encryptedData,
    bytes32 datasetAddress,
    address tokenIn,
    address tokenOut,
    uint256 amountIn
) external returns (bytes32 orderId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| encryptedData | bytes | Encrypted order details (iExec DataProtector) |
| datasetAddress | bytes32 | iExec dataset address for decryption |
| tokenIn | address | Token being sold |
| tokenOut | address | Token being bought |
| amountIn | uint256 | Amount of tokenIn to sell |

**Returns:** `orderId` - Unique identifier for the order

**Events:** `OrderSubmitted(orderId, owner, batchId, tokenIn, amountIn)`

---

### submitLimitOrder

Create a limit order with a target price.

```solidity
function submitLimitOrder(
    bytes calldata encryptedData,
    bytes32 datasetAddress,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 limitPrice,
    uint256 expiry
) external returns (bytes32 orderId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| encryptedData | bytes | Encrypted order details |
| datasetAddress | bytes32 | iExec dataset address |
| tokenIn | address | Token being sold |
| tokenOut | address | Token being bought |
| amountIn | uint256 | Amount of tokenIn to sell |
| limitPrice | uint256 | Target price (18 decimals) |
| expiry | uint256 | Expiration timestamp (0 = no expiry) |

**Returns:** `orderId` - Unique identifier for the order

---

### instantSwap

Execute an immediate swap using the price feed.

```solidity
function instantSwap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut
) external nonReentrant
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| tokenIn | address | Token being sold |
| tokenOut | address | Token being bought |
| amountIn | uint256 | Amount of tokenIn to sell |
| minAmountOut | uint256 | Minimum acceptable output (slippage protection) |

**Events:** `InstantSwap(user, tokenIn, tokenOut, amountIn, amountOut)`

---

### executeLimitOrder

Execute a limit order when conditions are met.

```solidity
function executeLimitOrder(bytes32 orderId) external nonReentrant
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| orderId | bytes32 | The order ID to execute |

**Requirements:**
- Order must be pending
- Order must not be expired
- Current price must meet or exceed limit price

**Events:** `LimitOrderExecuted(orderId, owner, amountIn, amountOut, executionPrice)`

---

### cancelOrder

Cancel a pending order.

```solidity
function cancelOrder(bytes32 orderId) external
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| orderId | bytes32 | The order ID to cancel |

**Requirements:**
- Caller must be the order owner
- Order must be pending

**Events:** `OrderCancelled(orderId, owner)`

---

### triggerBatch

Trigger batch settlement (admin only).

```solidity
function triggerBatch() external
```

**Events:** 
- `BatchTriggered(batchId, orderCount, timestamp)`
- `BatchSettled(batchId, matchCount)`

---

## View Functions

### getSwapQuote

Get the expected output for a swap.

```solidity
function getSwapQuote(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
) external view returns (uint256 amountOut)
```

---

### getOrderDetails

Get complete details of an order.

```solidity
function getOrderDetails(bytes32 orderId) external view returns (
    address owner,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 limitPrice,
    uint256 expiry,
    uint8 status,
    uint256 batchId,
    uint256 timestamp
)
```

---

### canExecuteLimitOrder

Check if a limit order can be executed.

```solidity
function canExecuteLimitOrder(bytes32 orderId) external view returns (bool)
```

---

### liquidity

Get available liquidity for a token.

```solidity
function liquidity(address token) external view returns (uint256)
```

---

### pendingOrderIds

Get all pending order IDs.

```solidity
function pendingOrderIds(uint256 index) external view returns (bytes32)
```

---

### userOrders

Get all orders for a user.

```solidity
function userOrders(address user, uint256 index) external view returns (bytes32)
```

---

## MockPriceFeed Contract

**Address:** `0x5b64624706060e5ABc6c0d14d8050AE3b14667CC`

### setPrice

Set the USD price for a token.

```solidity
function setPrice(address token, uint256 priceUsd) external
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| token | address | Token address |
| priceUsd | uint256 | Price in USD (18 decimals) |

---

### getPrice

Get the USD price for a token.

```solidity
function getPrice(address token) external view returns (uint256)
```

---

### getExchangeRate

Get the exchange rate between two tokens.

```solidity
function getExchangeRate(
    address tokenIn, 
    address tokenOut
) external view returns (uint256 rate)
```

---

### getAmountOut

Calculate output amount for a swap.

```solidity
function getAmountOut(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
) external view returns (uint256 amountOut)
```

---

## Events

### ShadowPool Events

```solidity
event OrderSubmitted(
    bytes32 indexed orderId,
    address indexed owner,
    uint256 indexed batchId,
    address tokenIn,
    uint256 amountIn
);

event OrderCancelled(
    bytes32 indexed orderId,
    address indexed owner
);

event BatchTriggered(
    uint256 indexed batchId,
    uint256 orderCount,
    uint256 timestamp
);

event BatchSettled(
    uint256 indexed batchId,
    uint256 matchCount
);

event InstantSwap(
    address indexed user,
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut
);

event LimitOrderExecuted(
    bytes32 indexed orderId,
    address indexed owner,
    uint256 amountIn,
    uint256 amountOut,
    uint256 executionPrice
);

event OrderExpired(
    bytes32 indexed orderId,
    address indexed owner
);

event LiquidityAdded(
    address indexed token,
    uint256 amount
);

event LiquidityWithdrawn(
    address indexed token,
    uint256 amount
);
```

---

## Error Codes

| Error | Description |
|-------|-------------|
| `Insufficient balance` | User doesn't have enough tokens |
| `Insufficient allowance` | Token approval needed |
| `Insufficient liquidity` | Pool doesn't have enough output tokens |
| `Order not found` | Invalid order ID |
| `Order not pending` | Order already executed/cancelled |
| `Order expired` | Order past expiration time |
| `Price not met` | Current price below limit price |
| `Not order owner` | Caller is not the order owner |

---

## Usage Examples

### JavaScript/TypeScript

```typescript
import { useWriteContract, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';

// Get swap quote
const { data: quote } = useReadContract({
    address: SHADOW_POOL_ADDRESS,
    abi: SHADOW_POOL_ABI,
    functionName: 'getSwapQuote',
    args: [tokenIn, tokenOut, parseUnits('1', 18)],
});

// Execute instant swap
const { writeContract } = useWriteContract();

writeContract({
    address: SHADOW_POOL_ADDRESS,
    abi: SHADOW_POOL_ABI,
    functionName: 'instantSwap',
    args: [
        tokenIn,
        tokenOut,
        parseUnits('1', 18),
        parseUnits('0.99', 18), // 1% slippage
    ],
});
```

### Foundry/Cast

```bash
# Get swap quote
cast call $SHADOW_POOL "getSwapQuote(address,address,uint256)" \
    $TOKEN_IN $TOKEN_OUT 1000000000000000000 \
    --rpc-url $RPC_URL

# Execute instant swap
cast send $SHADOW_POOL "instantSwap(address,address,uint256,uint256)" \
    $TOKEN_IN $TOKEN_OUT 1000000000000000000 990000000000000000 \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL
```
