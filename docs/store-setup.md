# Store setup (Stripe)

The beta store lives at `/betastore`. It is not linked from the site, and it only sells what has
been set up in Stripe: a product with no `priceId` in `src/data/store.json` shows a disabled
button and cannot go in the basket.

## How it works

- The site stays a plain static build, so none of its pages changed.
- `api/checkout.js` is a single Vercel Function. The basket in the browser sends it only product
  IDs and quantities; the function looks up the Stripe price for each one and creates a Stripe
  Checkout session. **Prices are never taken from the browser**, so a tampered basket cannot
  change what is charged.
- Stripe hosts the payment page and collects the card and shipping address. Card details never
  touch this site.

## 1. Jonah creates the Stripe account (once)

Jonah has to own the account: it is tied to his bank account and his identity verification.

1. Register at https://dashboard.stripe.com/register with jonahkimcello@gmail.com.
2. Complete "Activate payments": legal name and address, what he sells, the bank account that
   receives payouts, and an ID check.
3. Settings → Business: set the statement descriptor (what buyers see on their card statement,
   e.g. JONAHCELLO) and a support email.
4. Settings → Team: invite Tyson, so he can set up products and read orders.

## 2. Build the catalogue in Stripe

Do all of this in **Test mode** first (the toggle in the Stripe dashboard).

1. Product catalog → Add product, one per item. Name it as it appears on the site, set the price,
   upload the cover image.
2. Copy each product's **Price ID** (starts with `price_`) into the matching product's `priceId`
   in `src/data/store.json`.
3. Settings → Shipping → shipping rates: create the rate(s) Jonah charges. Copy each **Shipping
   Rate ID** (starts with `shr_`) into `shipping.rateIds` in the same file, cheapest first.
4. Set `shipping.countries` to the countries he ships to (`["US"]` today).

The `price` field in `store.json` is only what the page displays; Stripe charges what the Price ID
says. Keep the two in step.

## 3. Add the key to Vercel

In the Vercel project (jonahcello-site) → Settings → Environment Variables:

- Name: `STRIPE_SECRET_KEY`
- Value: the **test** secret key (`sk_test_…`) from Stripe → Developers → API keys
- Environments: Preview and Production

Redeploy afterwards so the function picks it up. The key lives only in Vercel; it is never in this
repo. If it ever leaks, roll it in Stripe and update it here.

## 4. Test before going live

With the test key in place, buy something on the preview URL using Stripe's test card
`4242 4242 4242 4242`, any future expiry date, and any CVC. Check that:

- the basket totals match the prices on the page,
- shipping options appear and the address is collected,
- the order shows up in the Stripe dashboard with the right items and address,
- the browser lands back on `/order-complete.html`.

## 5. Go live

1. Repeat step 2 in **Live mode** (products, prices, shipping rates are separate from test mode)
   and replace the IDs in `store.json` with the live ones.
2. Replace `STRIPE_SECRET_KEY` in Vercel with the live key (`sk_live_…`).
3. Place one real order and refund it, to confirm payouts reach Jonah's bank.
4. Decide sales tax. Stripe Tax can calculate and collect it, but it costs extra per transaction
   and Jonah must register where he owes it — worth asking his accountant.
5. Put the Store link back in the nav (`src/layouts/Base.astro`) and in `public/sitemap.xml`, and
   remove the preview banner from `src/pages/betastore.astro`.
