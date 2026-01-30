#!/bin/bash

# Keeper Bot Startup Script

echo "═══════════════════════════════════════════════════════"
echo "   🤖 STARTING AUCTION DEX KEEPER BOT"
echo "═══════════════════════════════════════════════════════"

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Copy .env.example to .env and add your private key"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the bot
echo "🚀 Starting keeper bot..."
npm start
