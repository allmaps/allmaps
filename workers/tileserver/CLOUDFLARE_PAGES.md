# Cloudflare Pages Configuration

This worker is deployed via **Cloudflare Pages** with automatic builds.

## How to Configure in Cloudflare Dashboard

1. **Go to Cloudflare Dashboard**
   - Navigate to: **Workers & Pages** → Your tileserver project → **Settings**

2. **Configure Build Settings**
   - Go to: **Builds & deployments**
   - Click: **"Configure Production deployments"** or **"Edit configuration"**

3. **Enter These Settings:**
   ```
   Framework preset:        None
   Build command:          ./build.sh
   Build output directory: dist
   Root directory:         workers/tileserver
   ```

4. **Set Environment Variable:**
   - Still in Settings, go to: **Environment variables**
   - Click: **"Add variable"**
   - Name: `NODE_VERSION`
   - Value: `24`
   - Select: **Production** and **Preview** (both)
   - Click: **"Save"**

5. **Trigger Deployment**
   - Go to **Deployments** tab
   - Click: **"Retry deployment"** or push a new commit

## What build.sh Does

The `build.sh` script runs on Cloudflare Pages and:
1. ✅ Installs Rust and wasm-pack (cached after first build)
2. ✅ Adds wasm32-unknown-unknown target for WASM compilation
3. ✅ Runs `pnpm run lerna-build` to build all dependencies
4. ✅ Compiles `@allmaps/render-wasm` from Rust source
5. ✅ Bundles the tileserver worker

## Build Times

- **First build:** ~3-5 minutes (installs Rust toolchain from scratch)
- **Subsequent builds:** ~1-2 minutes (Rust is cached by Cloudflare)

## Local Testing

Test the build script locally to ensure it works:

```bash
cd workers/tileserver
./build.sh
```

This mimics exactly what Cloudflare Pages does during deployment.

## Troubleshooting

### "wasm-pack: not found" error
- Make sure build command is `./build.sh` (not `pnpm run lerna-build`)
- The script installs wasm-pack automatically

### Build times out
- First builds take longer (installing Rust)
- Cloudflare Pages timeout is 20 minutes (should be enough)
- Subsequent builds are much faster due to caching

### WASM file not found at runtime
- Check that `dist` is the output directory
- Verify `wrangler.jsonc` has WASM rules configured
- Check build logs to ensure WASM compiled successfully
