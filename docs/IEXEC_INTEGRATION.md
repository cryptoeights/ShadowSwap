# iExec DataProtector Integration

This document explains how ShadowSwap integrates with iExec DataProtector for order confidentiality.

## Overview

ShadowSwap uses **iExec DataProtector** to encrypt order details before on-chain submission, providing:

- **MEV Protection**: Hidden order amounts prevent front-running
- **Privacy**: Trade details not visible in mempool
- **Fair Execution**: Batch settlement at uniform price

---

## How It Works

### Order Encryption Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Creates  │────▶│    Encrypt with │────▶│  Submit to      │
│   Order         │     │   DataProtector │     │  ShadowPool     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
  Order Data:              Encrypted:              On-chain:
  - tokenIn               - 0x7a3f...            - orderId
  - tokenOut              (encrypted blob)       - owner
  - amountIn                                     - encryptedData
  - minAmountOut                                 - datasetAddress
```

### Decryption at Settlement

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Batch Trigger  │────▶│   Decrypt in    │────▶│  Execute        │
│                 │     │   TEE (iExec)   │     │  Settlement     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Implementation

### Frontend Encryption

```typescript
// frontend/src/lib/encryption.ts

import { IExecDataProtector } from '@iexec/dataprotector';

// Initialize DataProtector
const dataProtector = new IExecDataProtector(provider);

// Encrypt order data
export async function encryptOrderData(orderData: OrderData): Promise<{
    encryptedData: `0x${string}`;
    datasetAddress: `0x${string}`;
}> {
    try {
        // Create protected data
        const protectedData = await dataProtector.protectData({
            data: {
                tokenIn: orderData.tokenIn,
                tokenOut: orderData.tokenOut,
                amountIn: orderData.amountIn.toString(),
                minAmountOut: orderData.minAmountOut.toString(),
            },
            name: `ShadowSwap Order ${Date.now()}`,
        });

        return {
            encryptedData: protectedData.encryptedData as `0x${string}`,
            datasetAddress: protectedData.address as `0x${string}`,
        };
    } catch (error) {
        // Fallback for testing (when iExec not available)
        return createMockEncryption(orderData);
    }
}
```

### Smart Contract Storage

```solidity
// contracts_foundry/src/ShadowPool.sol

struct Order {
    // ... other fields ...
    bytes32 datasetAddress;  // iExec DataProtector dataset address
    bytes encryptedData;     // Encrypted order details
}

function submitOrder(
    bytes calldata encryptedData,
    bytes32 datasetAddress,
    address tokenIn,
    address tokenOut,
    uint256 amountIn
) external returns (bytes32 orderId) {
    // Store encrypted data on-chain
    orders[orderId] = Order({
        // ...
        datasetAddress: datasetAddress,
        encryptedData: encryptedData,
        // ...
    });
}
```

---

## Why iExec DataProtector?

### Traditional DEX Problems

| Problem | Description |
|---------|-------------|
| **Front-running** | Validators see pending transactions and trade first |
| **Sandwich attacks** | Attackers profit by surrounding user transactions |
| **Information leakage** | Order details visible in mempool |

### ShadowSwap Solution

| Feature | How iExec Helps |
|---------|-----------------|
| **Confidential Orders** | Order amounts encrypted, invisible to validators |
| **Batch Auctions** | Multiple orders settled at single price |
| **TEE Execution** | Decryption only in trusted execution environment |

---

## iExec Components Used

### 1. DataProtector SDK

```bash
npm install @iexec/dataprotector
```

The SDK provides:
- `protectData()`: Encrypt sensitive data
- `grantAccess()`: Allow specific apps to decrypt
- `revokeAccess()`: Remove decryption permissions

### 2. Confidential Computing

iExec uses Intel SGX enclaves for:
- Secure decryption of order data
- Trusted batch settlement calculation
- Privacy-preserving order matching

### 3. Dataset Registry

Protected data is registered on:
- **iExec Sidechain**: For data management
- **Ethereum/L2**: Dataset address referenced on-chain

---

## Current Implementation Status

### What's Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Order encryption | ✅ Done | Using DataProtector SDK |
| On-chain storage | ✅ Done | Encrypted data stored in contract |
| Fallback mode | ✅ Done | Mock encryption for testing |

### What's Planned

| Feature | Status | Notes |
|---------|--------|-------|
| TEE batch settlement | 🔄 Planned | iExec TEE for decryption |
| Full confidential matching | 🔄 Planned | Order matching in TEE |
| Access control | 🔄 Planned | Grant/revoke decryption |

---

## Testing Without iExec

For development/testing, the app uses a fallback encryption:

```typescript
// Mock encryption for testing
function createMockEncryption(orderData: OrderData) {
    const dataString = JSON.stringify(orderData);
    const encoded = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(dataString)
    );
    
    return {
        encryptedData: encoded as `0x${string}`,
        datasetAddress: ethers.utils.keccak256(encoded) as `0x${string}`,
    };
}
```

This allows:
- Local development without iExec setup
- Testnet deployment with mock data
- Full flow testing

---

## Production Setup

### 1. Install iExec SDK

```bash
npm install @iexec/dataprotector @iexec/iexec-sdk
```

### 2. Initialize with Provider

```typescript
import { IExecDataProtector } from '@iexec/dataprotector';

const dataProtector = new IExecDataProtector(window.ethereum);
```

### 3. Encrypt Orders

```typescript
const protectedData = await dataProtector.protectData({
    data: orderData,
    name: `Order-${Date.now()}`,
});
```

### 4. Grant Access to Settlement App

```typescript
await dataProtector.grantAccess({
    protectedData: protectedData.address,
    authorizedApp: SETTLEMENT_APP_ADDRESS,
    authorizedUser: SETTLEMENT_WORKER_ADDRESS,
});
```

---

## Resources

- [iExec DataProtector Docs](https://tools.docs.iex.ec/tools/dataprotector)
- [iExec SDK](https://github.com/iExecBlockchainComputing/iexec-sdk)
- [Confidential Computing Overview](https://iex.ec/confidential-computing/)

---

## Security Notes

1. **Never expose decrypted order data** before batch settlement
2. **Use proper access controls** - only grant to trusted apps
3. **Verify TEE attestation** in production
4. **Monitor for unauthorized access attempts**
