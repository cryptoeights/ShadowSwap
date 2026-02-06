# iExec iApp Deployment Guide

This guide explains how to build, test, and deploy the ShadowSwap iExec iApp.

## Overview

The ShadowSwap iApp processes encrypted DEX orders inside a **Trusted Execution Environment (TEE)**. It uses **iExec DataProtector** to ensure order data remains confidential.

```
User Order → DataProtector.protectData() → On-chain → iApp (TEE) → Settlement
                    ↑                                      ↑
              Encrypted data                    Decrypted & processed
              stored on IPFS                    inside Intel SGX
```

## Prerequisites

```bash
# Install iExec iApp CLI
npm i -g @iexec/iapp

# Verify installation
iapp --version

# Docker must be installed and running
docker --version
```

## Step 1: Initialize & Test Locally

```bash
cd iexec-app

# Test the iApp locally (simulates TEE)
iapp test

# Test with order arguments
iapp test --args '{"orderType":"market","tokenIn":"0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e","tokenOut":"0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c","amountIn":"1000000000000000000","owner":"0x77D1BB07E6F487f47C8f481dFF80DE5c27821D09"}'

# Test with protected data mock
iapp test --protectedData default
```

## Step 2: Deploy to iExec Network

### Get RLC Tokens

For Arbitrum Sepolia (testnet):
- Go to [iExec RLC Faucet](https://faucet.iex.ec/)
- Get free RLC tokens for testing

### Deploy

```bash
# Deploy to Arbitrum Sepolia
iapp deploy --chain arbitrum-sepolia
```

You'll need:
1. Docker Hub account (for image hosting)
2. Docker Hub Personal Access Token

**Save the deployed iApp address!** (e.g., `0x1234...abcd`)

## Step 3: Configure Frontend

Update the frontend to use your deployed iApp:

```bash
# frontend/.env.local
NEXT_PUBLIC_IEXEC_IAPP_ADDRESS=0x834255dF01eE89d5096371a7eeFaF4332d4e2bfF
```

Also update `frontend/src/lib/contracts.ts`:
```typescript
IEXEC_IAPP: (process.env.NEXT_PUBLIC_IEXEC_IAPP_ADDRESS || '0x...') as `0x${string}`,
```

## Step 4: Run the iApp

```bash
# Run with a specific protected data
iapp run <your-iapp-address> --protectedData <protected-data-address>
```

## Step 5: Full Integration Test

1. Start the frontend: `cd frontend && npm run dev`
2. Connect wallet on Arbitrum Sepolia
3. Submit a limit order
4. Check console logs for `[ShadowSwap] Encrypting order with iExec DataProtector...`
5. Verify the order appears on-chain with encrypted data

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│                                                              │
│  encryption.ts:                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. import { IExecDataProtector }                       │ │
│  │ 2. dataProtector.core.protectData({ data: orderData }) │ │
│  │ 3. dataProtector.core.grantAccess({ iApp, user })      │ │
│  │ 4. Submit to ShadowPool contract                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               iExec DataProtector (SDK)                      │
│                                                              │
│  • Encrypts data with symmetric key                         │
│  • Stores encrypted data on IPFS                            │
│  • Stores key in Secret Management Service (SMS)            │
│  • Registers ownership as NFT on blockchain                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            ShadowPool Smart Contract (Arbitrum)              │
│                                                              │
│  • Stores encrypted order reference (datasetAddress)        │
│  • Manages order lifecycle (pending → executed)             │
│  • Executes swaps/settlements                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            iExec iApp (TEE - Intel SGX)                      │
│            iexec-app/src/app.js                              │
│                                                              │
│  • Receives decrypted order data in TEE                     │
│  • Validates order parameters                               │
│  • Matches orders at uniform clearing price                 │
│  • Outputs settlement results                               │
│                                                              │
│  ⚠️ Data is ONLY visible inside this enclave                │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Docker not running
```
Error: Docker daemon is not accessible
```
→ Start Docker Desktop

### iApp test fails
```
Error: Failed to locate iApp project root
```
→ Make sure you're in the `iexec-app/` directory

### DataProtector error on frontend
```
iExec DataProtector encryption failed
```
→ Check that:
- Wallet is connected to Arbitrum Sepolia
- iApp address is correctly configured
- User has approved the MetaMask signature requests

### Deployment fails
→ Check Docker BuildKit AMD64 support:
```bash
docker buildx inspect --bootstrap | grep -i platforms
```
