# UniVendor E-Commerce Platform

UniVendor is a comprehensive e-commerce platform that provides a seamless shopping experience for both customers and vendors.

## Features

1. **Dynamic Image Preview on Color Hover** - Update main product image when hovering over color swatch without selecting size
2. **Add to Cart Validation** - Validate both color and size are selected before adding to cart, display popup if missing
3. **Cart Counter Badge** - Show number of items in cart, update dynamically when items are added/removed
4. **Add to Cart Without Login** - Allow guests to add products to cart using localStorage
5. **Cart Persistence After Login** - Maintain guest cart products after user logs in

## Deployment

### Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/UniVendor)

1. Click the "Deploy to Netlify" button
2. Connect your GitHub repository
3. Configure the following build settings:
   - Build command: `./netlify-build.sh`
   - Publish directory: `dist/public`

### Manual Deployment

1. Clone the repository
```bash
git clone https://github.com/yourusername/UniVendor.git
cd UniVendor
```

2. Install dependencies
```bash
npm install
```

3. Create production environment file
```bash
echo "VITE_API_BASE_URL=/api" > .env.production
echo "VITE_USE_MOCK_API=true" >> .env.production
```

4. Build the client application
```bash
npm run client:build
```

5. The built files will be in the `dist/public` directory, ready to be deployed to any static hosting service.

## Development

1. Install dependencies
```bash
npm install
```

2. Start the development server
```bash
npm run client:dev
```

## Test Pages

The application includes several test pages to verify functionality:

- `/test-cart` - For testing the unified cart context
- `/simple-test` - For testing basic page functionality
- `/independent-cart` - For testing cart functionality independent of context

## License

[MIT](LICENSE)
