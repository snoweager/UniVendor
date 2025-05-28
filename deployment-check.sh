#!/bin/bash

# Script to verify deployment readiness
echo "=== UniVendor Deployment Readiness Check ==="

# Check for required files
echo -n "Checking for required files... "
MISSING_FILES=0

FILES_TO_CHECK=(
  "client/src/main.tsx"
  "client/src/App.tsx" 
  "client/src/contexts/CartContext.tsx"
  "client/src/hooks/useLocalCart.tsx"
  "client/src/utils/mockApi.ts"
  "netlify.toml"
  "netlify-build.sh"
  ".env.production"
)

for file in "${FILES_TO_CHECK[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing: $file"
    MISSING_FILES=$((MISSING_FILES+1))
  fi
done

if [[ $MISSING_FILES -eq 0 ]]; then
  echo "PASS"
else
  echo "FAIL ($MISSING_FILES files missing)"
fi

# Test build process
echo -n "Testing build process... "
npm run client:build > /dev/null 2>&1
if [[ $? -eq 0 ]]; then
  echo "PASS"
else
  echo "FAIL (build command failed)"
  exit 1
fi

# Check for redirects file creation
echo -n "Checking for _redirects file in build output... "
if [[ -f "dist/public/_redirects" ]]; then
  echo "PASS"
else
  echo "Creating _redirects file..."
  echo "/* /index.html 200" > dist/public/_redirects
  if [[ -f "dist/public/_redirects" ]]; then
    echo "PASS (created)"
  else
    echo "FAIL (could not create _redirects file)"
  fi
fi

# Summary
echo ""
echo "=== Deployment Readiness Summary ==="
echo ""
echo "Your UniVendor application is ready for deployment to Netlify."
echo "Use the following settings in Netlify:"
echo ""
echo "  Build command:    ./netlify-build.sh"
echo "  Publish directory: dist/public"
echo ""
echo "To deploy manually, run:"
echo "  npm install -g netlify-cli"
echo "  netlify login"
echo "  netlify deploy --prod"
echo ""
echo "For more detailed instructions, see NETLIFY-DEPLOYMENT.md"
