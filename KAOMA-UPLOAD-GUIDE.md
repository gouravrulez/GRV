# KAOMA final upload package

This package is for the KAOMA project only. Upload its extracted contents to the root of the KAOMA GitHub repository connected to the Vercel project `grv`. Do not upload it to the Shree Gauri repository.

## Vercel environment values

Add these in Vercel → KAOMA project → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `ORDER_EMAIL_FROM` (for example `KAOMA <orders@kaoma.in>` after domain verification)
- `ADMIN_ORDER_EMAIL` (`kaomaglobal@gmail.com`)
- `ORDER_EMAIL_SECRET` (a long private server-only value)

Use the Supabase project URL and publishable/anon key. Never use the service-role key in these public values.

## Activate the private administrator

1. Open the KAOMA Supabase SQL Editor and run `supabase/kaoma_setup.sql` once.
2. Create the administrator under Supabase Authentication → Users.
3. Run the final commented `insert into public.admins...` statement in the SQL file after replacing `YOUR_ADMIN_EMAIL`.
4. Open `/admin-login` directly. The customer website deliberately contains no admin-login link.

The advanced desktop/mobile administration area manages categories, subcategories, full product information, pictures, prices, sizes, colours, stock, drafts, publishing, best sellers, new arrivals and order status. Customer email signup, confirmation, sign-in and password reset use Supabase Auth. Resend sends order confirmation to the customer and the KAOMA order email after checkout/payment code calls the protected `/api/order-email` route.
