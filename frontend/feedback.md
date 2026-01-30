# iExec Tools Feedback

> Feedback on using iExec development tools for the **ShadowSwap** project during the Hack4Privacy Hackathon.

---

## 📦 Tools Used

- **iExec DataProtector** (`@iexec/dataprotector` v2.0.0-beta.23)
- **iExec SDK** (via DataProtector)

## ⭐ What Worked Well

### 1. Easy Integration with Web3 Apps
The DataProtector SDK integrates seamlessly with existing Web3 setups. Initializing with an Ethereum provider works exactly as expected:

```typescript
import { IExecDataProtector } from '@iexec/dataprotector';

const dataProtector = new IExecDataProtector(window.ethereum, {
    isExperimental: true,
});
```

### 2. Intuitive Data Protection API
The `protectData` function has a clean, straightforward API. Protecting arbitrary data is simple and the naming convention helps with data management:

```typescript
const protectedData = await dataProtector.core.protectData({
    data: { orderType: 'market', amount: '100' },
    name: 'ShadowSwap-Order-123',
});
```

### 3. Fine-Grained Access Control
The `grantAccess` function provides excellent control over who can access protected data. Being able to authorize specific apps while keeping data private from everyone else is perfect for our use case:

```typescript
await dataProtector.core.grantAccess({
    protectedData: protectedData.address,
    authorizedApp: TEE_APP_ADDRESS,
});
```

### 4. Privacy-Preserving by Design
The combination of encryption + TEE execution means order data truly remains private. This is exactly what's needed for MEV protection in DeFi.

## 🔧 Areas for Improvement

### 1. Beta SDK & Experimental Flags
The current SDK version (`2.0.0-beta.23`) requires experimental flags for certain networks. While understandable during development, this creates uncertainty in production readiness:

```typescript
// Required for Arbitrum Sepolia
const dataProtector = new IExecDataProtector(window.ethereum, {
    isExperimental: true, // Needed but not in types
} as any);
```

**Suggestion**: Update TypeScript types to include experimental options, or document clearly which features are stable.

### 2. Multi-Chain Support Documentation
Documentation on deploying across different EVM chains (especially L2s like Arbitrum) could be more comprehensive. I had to experiment to find the right configuration.

**Suggestion**: Add dedicated guides for L2 integration (Arbitrum, Optimism, Base).

### 3. Error Handling & Debugging
When encryption fails, error messages are sometimes generic. More specific error codes would help debug issues faster.

**Suggestion**: Add error codes and a troubleshooting guide.

### 4. SSR Compatibility
The SDK doesn't work with server-side rendering out of the box, requiring dynamic imports in Next.js:

```typescript
// Had to use dynamic imports to avoid SSR issues
const { IExecDataProtector } = await import('@iexec/dataprotector');
```

**Suggestion**: Document SSR compatibility or provide a lightweight client-only bundle.

## 💡 Feature Requests

1. **Batch Data Protection** - Ability to protect multiple data items in a single transaction to reduce gas costs.

2. **React Hooks Library** - Official React hooks (similar to wagmi) would accelerate dApp development:
   ```typescript
   const { protectData, isLoading } = useDataProtector();
   ```

3. **Data Expiry** - Built-in support for data that automatically becomes inaccessible after a certain time/block.

4. **On-Chain Verification** - Easy way to verify on-chain that data was protected using DataProtector.

## 📊 Overall Rating

| Aspect | Rating | Notes |
|--------|--------|-------|
| Documentation | ⭐⭐⭐⭐ | Good, but L2 guides needed |
| API Design | ⭐⭐⭐⭐⭐ | Clean and intuitive |
| TypeScript Support | ⭐⭐⭐ | Some types missing |
| Developer Experience | ⭐⭐⭐⭐ | Good once configured |
| Privacy Features | ⭐⭐⭐⭐⭐ | Excellent, exactly what we needed |

## 🎯 Conclusion

iExec DataProtector is a powerful tool for building privacy-preserving dApps. The core functionality works well and the concept of combining data encryption with TEE execution is compelling. For our MEV-protection use case, it's an excellent fit.

The main areas for improvement are around developer experience (TypeScript types, SSR support) and documentation for newer networks. Looking forward to the stable v2 release!

---

**Project**: ShadowSwap - Confidential Batch Auction DEX  
**Hackathon**: iExec x 50Partners Hack4Privacy  
**Date**: January 2026
