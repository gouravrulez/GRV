# Private Lifestyle Store

GitHub and Vercel-ready Next.js website for the new clothing and sexual-wellness business.

The brand name, domain, products, prices, payment provider, customer database and business contact details are intentionally left for the final setup. This project is completely separate from Shree Gauri.

## Deploy on Vercel

1. Upload all files from this package to the root of a GitHub repository.
2. In Vercel, select **Add New → Project** and import that repository.
3. Keep **Framework Preset: Next.js**.
4. Keep **Root Directory: `./`**.
5. Do not add a custom Build Command or Output Directory.
6. Select **Deploy**.

Vercel will run `npm ci` followed by `npm run build`.

## Run locally

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Production check

```bash
npm run build
```

## Current scope

- Responsive storefront
- Compact 18+ confirmation
- Category navigation and sidebar filters
- Search, wishlist, customer-login and cart interfaces
- Empty product catalogue, ready for products and prices later
- Country and currency selector for key international markets
- International address fields and worldwide-delivery messaging
- Checkout and admin interface placeholders
- Bright, elegant styling with discreet-delivery messaging

## Before accepting real orders

Connect a new database, authentication, payment gateway, email/WhatsApp notifications and final domain using credentials belonging only to this new business. Never reuse Shree Gauri production secrets.
