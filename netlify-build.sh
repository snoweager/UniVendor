#!/bin/bash

# Clean deployment build script for Netlify
echo "=== Starting UniVendor Client Build Process ==="

# Create .env.production file if it doesn't exist
if [ ! -f .env.production ]; then
  echo "Creating production env file..."
  echo "VITE_API_BASE_URL=/api" > .env.production
  echo "VITE_USE_MOCK_API=true" >> .env.production
fi

# Run client build
echo "Building client..."
npm run client:build

# Create a custom _redirects file for Netlify
echo "Creating Netlify redirects file..."
echo "/* /index.html 200" > dist/public/_redirects

echo "=== Build complete! ==="
