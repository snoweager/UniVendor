# Deploying UniVendor to Netlify

This document provides detailed instructions for deploying the UniVendor application to Netlify.

## Prerequisites

- A Netlify account
- Git repository with the UniVendor code

## Deployment Steps

### Method 1: Deploy via the Netlify UI

1. Log in to your [Netlify account](https://app.netlify.com/)
2. Click "New site from Git"
3. Choose your Git provider (GitHub, GitLab, etc.)
4. Select your repository
5. Configure the build settings:
   - Branch to deploy: `main` (or your preferred branch)
   - Build command: `./netlify-build.sh`
   - Publish directory: `dist/public`
6. Click "Deploy site"

### Method 2: Deploy via the Netlify CLI

1. Install the Netlify CLI
```bash
npm install netlify-cli -g
```

2. Log in to Netlify
```bash
netlify login
```

3. Initialize your site
```bash
netlify init
```

4. Configure build settings when prompted:
   - Build command: `./netlify-build.sh`
   - Publish directory: `dist/public`

5. Deploy your site
```bash
netlify deploy --prod
```

## Environment Variables

Set the following environment variables in the Netlify UI under Site settings > Build & deploy > Environment:

- `VITE_API_BASE_URL`: `/api`
- `VITE_USE_MOCK_API`: `true`
- `VITE_APP_ENV`: `production`

## Custom Domain Setup

1. Go to Site settings > Domain management
2. Click "Add custom domain"
3. Enter your domain name and follow the instructions to configure DNS settings
4. Enable HTTPS for your custom domain

## Continuous Deployment

The repository includes a GitHub Actions workflow file (.github/workflows/netlify-deploy.yml) that automatically deploys changes to Netlify when you push to the main branch. To use it:

1. In your Netlify site settings, go to "Site settings" > "Build & deploy" > "Continuous Deployment"
2. Generate a new personal access token
3. Add the following secrets to your GitHub repository:
   - `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
   - `NETLIFY_SITE_ID`: Your Netlify site ID (available in Site settings > General)

## Troubleshooting

- **White screen after deployment**: Make sure the redirect rules are properly configured in the `_redirects` file to handle client-side routing
- **API calls failing**: Ensure the mock API is properly initialized for production environments
- **Missing environment variables**: Check that all required environment variables are set in Netlify

## Post-Deployment Verification

After deploying, verify the following functionality:

1. Dynamic image preview on color hover in product details
2. Cart validation when adding products without selecting color/size
3. Cart counter badge updates when adding/removing items
4. Guest users can add items to cart without logging in
5. Cart persists after logging in
