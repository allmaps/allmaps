#!/bin/bash
set -e

echo "📦 Installing Rust and wasm-pack..."

# Install Rust if not already installed
if ! command -v rustc &> /dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source $HOME/.cargo/env
fi

# Add wasm32 target
rustup target add wasm32-unknown-unknown

# Install wasm-pack if not already installed
if ! command -v wasm-pack &> /dev/null; then
  curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

echo "✅ Rust and wasm-pack installed"
echo "🔨 Building all packages with lerna..."

# Build all dependencies including WASM
pnpm run lerna-build

echo "✅ Build complete!"
