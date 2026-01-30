# Deployment Guide

This guide explains how to deploy ShadowSwap smart contracts to Arbitrum Sepolia or other EVM-compatible networks.

## Prerequisites

- Foundry installed ([Installation Guide](./SETUP.md#install-foundry))
- Wallet with ETH on target network
- RPC URL for target network

---

## Environment Setup

### 1. Create Environment File

```bash
cd contracts_foundry
cp .env.example .env
```

### 2. Configure Environment

Edit `.env`:

```env
# Your deployer wallet private key
PRIVATE_KEY=your_private_key_here

# RPC URLs
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc

# Etherscan API key for verification (optional)
ARBISCAN_API_KEY=your_arbiscan_api_key
```

---

## Deployment Steps

### Option 1: Deploy All Contracts (Recommended)

This deploys all contracts and sets up initial configuration:

```bash
# Load environment
source .env

# Deploy to Arbitrum Sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv
```

### Option 2: Deploy Individual Contracts

#### Deploy Mock Tokens

```bash
forge create src/MockERC20.sol:MockERC20 \
  --constructor-args "Mock USDC" "mUSDC" \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

#### Deploy MockWETH

```bash
forge create src/MockWETH.sol:MockWETH \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

#### Deploy Price Feed

```bash
forge create src/MockPriceFeed.sol:MockPriceFeed \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

#### Deploy ShadowPool

```bash
forge create src/ShadowPool.sol:ShadowPool \
  --constructor-args 300 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

---

## Post-Deployment Configuration

### 1. Set Price Feed on ShadowPool

```bash
cast send $SHADOW_POOL_ADDRESS "setPriceFeed(address)" $PRICE_FEED_ADDRESS \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

### 2. Set Initial Prices

```bash
# Set ETH price ($2730)
cast send $PRICE_FEED_ADDRESS "setPrice(address,uint256)" $MWETH_ADDRESS 2730000000000000000000 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY

# Set USDC price ($1)
cast send $PRICE_FEED_ADDRESS "setPrice(address,uint256)" $MUSDC_ADDRESS 1000000000000000000 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

### 3. Add Liquidity

```bash
# Approve tokens
cast send $MUSDC_ADDRESS "approve(address,uint256)" $SHADOW_POOL_ADDRESS 100000000000000000000000000 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY

# Add liquidity
cast send $SHADOW_POOL_ADDRESS "addLiquidity(address,uint256)" $MUSDC_ADDRESS 100000000000000000000000000 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

---

## Verify Contracts (Optional)

Verify contracts on Arbiscan for transparency:

```bash
forge verify-contract $SHADOW_POOL_ADDRESS src/ShadowPool.sol:ShadowPool \
  --chain-id 421614 \
  --constructor-args $(cast abi-encode "constructor(uint256)" 300) \
  --etherscan-api-key $ARBISCAN_API_KEY
```

---

## Update Frontend Configuration

After deployment, update the frontend environment:

```bash
# frontend/.env.local
NEXT_PUBLIC_SHADOW_POOL_ADDRESS=<new_shadowpool_address>
NEXT_PUBLIC_PRICE_FEED_ADDRESS=<new_pricefeed_address>
NEXT_PUBLIC_MOCK_USDC_ADDRESS=<new_musdc_address>
NEXT_PUBLIC_MOCK_DAI_ADDRESS=<new_mdai_address>
NEXT_PUBLIC_MOCK_WETH_ADDRESS=<new_mweth_address>
NEXT_PUBLIC_MOCK_ETH_ADDRESS=<new_meth_address>
```

Also update `frontend/src/lib/contracts.ts`:

```typescript
export const CONTRACTS = {
    SHADOW_POOL: '<new_shadowpool_address>' as `0x${string}`,
    PRICE_FEED: '<new_pricefeed_address>' as `0x${string}`,
};
```

---

## Deployment to Other Networks

### Arbitrum Mainnet

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://arb1.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Base Sepolia

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

## Deployed Contract Addresses

### Arbitrum Sepolia (Current)

| Contract | Address |
|----------|---------|
| ShadowPool | `0x11a5f59AF554FCbB9D82C1Ba7f963912b2D5Bb8f` |
| MockPriceFeed | `0x5b64624706060e5ABc6c0d14d8050AE3b14667CC` |
| mUSDC | `0x7128C549eEE4053e8de64baB7ED6CdbAe7ec8ce3` |
| mDAI | `0x3F3f4C72e1756AE6d8D6D02eDaC9E0B9ED17e01E` |
| mWETH | `0xC1e0C8A51b5324bef1d6E20c07E3A85a95D8CC52` |
| mETH | `0x6D87e7DaeB2ECbE8EC0CedC3C9Bd6284DAa80a31` |

---

## Troubleshooting

### "Insufficient funds for gas"

Make sure your deployer wallet has enough ETH:
- Arbitrum Sepolia: ~0.01 ETH
- Mainnet: Check current gas prices

### "Nonce too low"

Wait a few seconds and retry, or manually specify nonce:

```bash
forge script ... --nonce <correct_nonce>
```

### Contract verification failed

Make sure:
- Constructor args are correctly encoded
- API key is valid
- Wait a few minutes after deployment
