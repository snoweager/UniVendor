# UniVendor Deployment Guide

## Quick Start

1. **Build the Application**
   ```bash
   npm run client:build
   ```

2. **Deploy to Netlify**
   ```bash
   ./deploy-to-netlify.sh
   ```

## Manual Steps

1. **Build the application**:
   ```bash
   npm run client:build
   ```

2. **Add the _redirects file** for client-side routing:
   ```bash
   echo "/* /index.html 200" > dist/public/_redirects
   ```

3. **Deploy using Netlify CLI**:
   ```bash
   netlify deploy --dir=dist/public
   ```

4. **Deploy to production**:
   ```bash
   netlify deploy --dir=dist/public --prod
   ```

## Using the Netlify UI

1. Connect your repository to Netlify
2. Set build command to `./netlify-build.sh`
3. Set publish directory to `dist/public`
4. Configure environment variables as described in NETLIFY-DEPLOYMENT.md

## Verification

After deployment, verify these key features:
1. Dynamic Image Preview on Color Hover
2. Add to Cart Validation
3. Cart Counter Badge
4. Add to Cart Without Login
5. Cart Persistence After Login

These pages are available for testing:
- /test-cart
- /simple-test
- /independent-cart
