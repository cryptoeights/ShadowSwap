#!/bin/bash
# Sync on-chain prices with real CoinGecko prices
# Usage: ./sync-prices.sh

set -e

cd "$(dirname "$0")"
source .env

# Fetch current ETH price from CoinGecko
echo "Fetching current ETH price from CoinGecko..."
ETH_PRICE=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd" | grep -o '"usd":[0-9.]*' | cut -d':' -f2 | cut -d'.' -f1)

if [ -z "$ETH_PRICE" ]; then
    echo "Failed to fetch ETH price. Using default: 2730"
    ETH_PRICE=2730
fi

echo "Current ETH price: \$$ETH_PRICE"

# Contract addresses
PRICE_FEED="0xd371a1b9DCC0C6657FCE940bCea759a8dcb005d9"
METH="0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2"
MWETH="0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c"

# Convert to wei (18 decimals)
PRICE_WEI="${ETH_PRICE}000000000000000000"

echo "Updating mETH price..."
cast send $PRICE_FEED "setPrice(address,uint256)" $METH $PRICE_WEI \
    --rpc-url $ARBITRUM_SEPOLIA_RPC \
    --private-key $PRIVATE_KEY \
    --quiet

echo "Updating mWETH price..."
cast send $PRICE_FEED "setPrice(address,uint256)" $MWETH $PRICE_WEI \
    --rpc-url $ARBITRUM_SEPOLIA_RPC \
    --private-key $PRIVATE_KEY \
    --quiet

echo "✅ Prices synced successfully!"
echo "   mETH: \$$ETH_PRICE"
echo "   mWETH: \$$ETH_PRICE"
echo "   mUSDC: \$1"
echo "   mDAI: \$1"
