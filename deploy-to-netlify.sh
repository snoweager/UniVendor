#!/bin/bash

# Easy deployment script for Netlify
echo "=== UniVendor Netlify Deployment Script ==="

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
  echo "Netlify CLI is not installed. Installing now..."
  npm install -g netlify-cli
fi

# Run the build
echo "Building the application..."
./netlify-build.sh

# Check if user is logged in to Netlify
netlify status 2>&1 | grep -q "Logged in"
if [ $? -ne 0 ]; then
  echo "You are not logged in to Netlify. Please log in:"
  netlify login
fi

# Deploy to Netlify
echo ""
echo "Deploying to Netlify..."
echo ""
netlify deploy --dir=dist/public

echo ""
echo "To deploy to production, run:"
echo "netlify deploy --dir=dist/public --prod"
echo ""
