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

| Contract | Address | Arbiscan |
|----------|---------|----------|
| ShadowPool | `0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09` | [View](https://sepolia.arbiscan.io/address/0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09) |
| MockPriceFeed | `0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006` | [View](https://sepolia.arbiscan.io/address/0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006) |
| mUSDC | `0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e` | [View](https://sepolia.arbiscan.io/address/0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e) |
| mDAI | `0xda222533d71C37A9370C6b5a26BcB4C07EcB0454` | [View](https://sepolia.arbiscan.io/address/0xda222533d71C37A9370C6b5a26BcB4C07EcB0454) |
| mWETH | `0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c` | [View](https://sepolia.arbiscan.io/address/0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c) |
| mETH | `0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2` | [View](https://sepolia.arbiscan.io/address/0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2) |

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
