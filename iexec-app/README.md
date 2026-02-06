# ShadowSwap iExec iApp

This is the **iExec iApp (Privacy Application)** for ShadowSwap. It runs inside a **Trusted Execution Environment (TEE)** to process encrypted DEX orders while maintaining confidentiality.

## What Does This iApp Do?

```
┌──────────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│  Protected Data  │────▶│   TEE (Intel SGX)        │────▶│  Settlement      │
│  (Encrypted      │     │                          │     │  Results         │
│   Orders)        │     │  1. Decrypt orders       │     │  (Clearing       │
│                  │     │  2. Validate parameters  │     │   price, matches)│
│                  │     │  3. Match at clearing px │     │                  │
└──────────────────┘     └─────────────────────────┘     └──────────────────┘
```

1. **Receives** encrypted order data from iExec DataProtector
2. **Decrypts** order details inside the TEE (invisible to outside)
3. **Validates** order parameters (tokens, amounts, prices, expiry)
4. **Matches** orders at uniform clearing price
5. **Outputs** settlement results

## Privacy Guarantees

- Order data is ONLY decrypted inside the TEE enclave
- No validator, miner, or external party can see order details
- Prevents front-running and sandwich attacks
- Fair batch settlement at uniform price

## Prerequisites

- [iExec iApp CLI](https://www.npmjs.com/package/@iexec/iapp): `npm i -g @iexec/iapp`
- Docker installed and running
- iExec account with RLC tokens (testnet for Arbitrum Sepolia)

## Quick Start

### 1. Test Locally

```bash
# Test with no input (returns app info)
iapp test

# Test with order arguments
iapp test --args '{"orderType":"market","tokenIn":"0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e","tokenOut":"0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c","amountIn":"1000000000000000000","owner":"0x77D1BB07E6F487f47C8f481dFF80DE5c27821D09"}'

# Test with protected data mock
iapp test --protectedData default
```

### 2. Deploy to iExec

```bash
# Deploy to Arbitrum Sepolia (testnet)
iapp deploy --chain arbitrum-sepolia

# Save the iApp address from output!
# Example: 0x1234567890abcdef...
```

### 3. Run on iExec Network

```bash
# Run with protected data
iapp run <your-iapp-address> --protectedData <protected-data-address>
```

## Integration with Frontend

After deploying, update the frontend configuration:

```bash
# frontend/.env.local
NEXT_PUBLIC_IEXEC_IAPP_ADDRESS=0x834255dF01eE89d5096371a7eeFaF4332d4e2bfF
```

The frontend `encryption.ts` will then use the real DataProtector flow:

```javascript
// 1. Protect order data
const protectedData = await dataProtector.core.protectData({
    data: orderData,
    name: 'ShadowSwap-Order'
});

// 2. Grant access to the iApp
await dataProtector.core.grantAccess({
    protectedData: protectedData.address,
    authorizedApp: IEXEC_IAPP_ADDRESS,
    authorizedUser: '0x0000000000000000000000000000000000000000'
});
```

## Project Structure

```
iexec-app/
├── Dockerfile           # Docker image for TEE deployment
├── iapp.config.json     # iApp configuration
├── package.json         # Node.js dependencies
├── README.md            # This file
└── src/
    └── app.js           # Main iApp logic
```

## Supported Order Types

| Type | Description |
|------|-------------|
| `market` | Immediate execution at current price |
| `limit` | Execute when target price is reached |

## Order Data Schema

```json
{
    "orderType": "market | limit",
    "direction": "buy | sell",
    "tokenIn": "0x... (ERC20 address)",
    "tokenOut": "0x... (ERC20 address)",
    "amountIn": "1000000000000000000 (wei)",
    "amountOutMin": "990000000000000000 (wei, optional)",
    "limitPrice": "2730000000000000000000 (wei, limit orders only)",
    "expiry": "1706745600 (unix timestamp, optional)",
    "timestamp": "1706745500000 (ms)",
    "nonce": "0xabc123... (unique identifier)",
    "owner": "0x... (user wallet address)"
}
```

## Output Schema

```json
{
    "appName": "ShadowSwap Order Processor",
    "version": "1.0.0",
    "mode": "single-order | batch",
    "timestamp": "2025-01-31T00:00:00.000Z",
    "order": {
        "status": "validated | rejected",
        "orderType": "market",
        "tokenIn": "0x...",
        "tokenOut": "0x...",
        "amountIn": "1000000000000000000"
    }
}
```
